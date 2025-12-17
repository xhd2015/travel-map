package server

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"mime"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"travel-map/server/store"

	"github.com/xhd2015/kool/pkgs/web"
)

var distFS embed.FS
var templateHTML string
var globalStore *store.GlobalStore

func init() {
	globalStore = store.NewGlobalStore("travel-data")
}

func Init(fs embed.FS, tmpl string) {
	distFS = fs
	templateHTML = tmpl
}

func checkPort(port int) bool {
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("localhost:%d", port), 1*time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

func EnsureFrontendDevServer(ctx context.Context) (chan struct{}, error) {
	// Check if 5173 is running
	fmt.Println("Frontend dev server (port 5173) not detected. Starting it...")
	cmd := exec.Command("bun", "run", "dev")
	cmd.Dir = "travel-map-react/"
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err := cmd.Start()
	if err != nil {
		return nil, fmt.Errorf("failed to start frontend dev server: %v", err)
	}

	done := make(chan struct{})
	// Ensure sub-process is killed on context cancellation
	go func() {
		defer close(done)
		<-ctx.Done()
		if cmd.Process != nil {
			fmt.Println("Stopping frontend dev server...")
			// Kill the process group
			cmd.Process.Kill()
		}
	}()

	// Wait for port to be ready
	fmt.Print("Waiting for frontend server...")
	for i := 0; i < 30; i++ {
		if checkPort(5173) {
			fmt.Println(" Ready!")
			return done, nil
		}
		time.Sleep(1 * time.Second)
		fmt.Print(".")
	}
	fmt.Println()
	return nil, fmt.Errorf("frontend server failed to start within timeout")
}

func Serve(port int, dev bool) error {
	mux := http.NewServeMux()
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", port),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		Handler:      mux,
	}

	if dev {
		if !checkPort(5173) {
			// Create context for managing subprocesses
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()

			// Handle signals to gracefully shutdown subprocesses
			go func() {
				c := make(chan os.Signal, 1)
				signal.Notify(c, os.Interrupt, syscall.SIGTERM)
				<-c
				cancel()

				// wait the dev server to be closed
				if err := server.Close(); err != nil {
					fmt.Printf("Failed to close server: %v\n", err)
				}
			}()

			subProcessDone, err := EnsureFrontendDevServer(ctx)
			if err != nil {
				return err
			}
			if subProcessDone != nil {
				defer func() {
					fmt.Println("Waiting for frontend dev server to be closed...")
					<-subProcessDone
				}()
			}
		}

		err := ProxyDev(mux)
		if err != nil {
			return err
		}
	} else {
		err := Static(mux, StaticOptions{})
		if err != nil {
			return err
		}
	}

	err := RegisterAPI(mux)
	if err != nil {
		return err
	}

	fmt.Printf("Serving directory preview at http://localhost:%d\n", port)

	go func() {
		time.Sleep(1 * time.Second)
		web.OpenBrowser(fmt.Sprintf("http://localhost:%d", port))
	}()

	return server.ListenAndServe()
}

func ProxyDev(mux *http.ServeMux) error {
	targetURL, err := url.Parse("http://localhost:5173")
	if err != nil {
		return fmt.Errorf("invalid proxy target: %v", err)
	}
	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	// Proxy everything else to the frontend dev server
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		r.Host = targetURL.Host
		proxy.ServeHTTP(w, r)
	})
	return nil
}

type StaticOptions struct {
	IndexHtml string // Custom HTML content to serve instead of embedded index.html
}

func Static(mux *http.ServeMux, opts StaticOptions) error {
	// Serve static files from the embedded React build
	reactFileSystem, err := fs.Sub(distFS, "travel-map-react/dist")
	if err != nil {
		return fmt.Errorf("failed to create react file system: %v", err)
	}

	// Create sub-filesystem for assets
	assetsFileSystem, err := fs.Sub(reactFileSystem, "assets")
	if err != nil {
		return fmt.Errorf("failed to create assets file system: %v", err)
	}

	// Serve React assets from /assets/ path with proper MIME types

	// Serve index.css and index.js from assets with pattern matching
	mux.HandleFunc("/assets/index.css", func(w http.ResponseWriter, r *http.Request) {
		serveAssetWithPattern(w, r, assetsFileSystem, "index.css", "index-", ".css", "text/css")
	})
	mux.HandleFunc("/assets/index.js", func(w http.ResponseWriter, r *http.Request) {
		serveAssetWithPattern(w, r, assetsFileSystem, "index.js", "index-", ".js", "application/javascript")
	})

	mux.Handle("/assets/", http.StripPrefix("/assets/", &mimeTypeHandler{http.FileServer(http.FS(assetsFileSystem))}))
	// Serve React static files like vite.svg from root
	mux.Handle("/travel-map.svg", &mimeTypeHandler{http.FileServer(http.FS(reactFileSystem))})

	// Serve the main HTML page
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")

		// Use custom IndexHtml if provided
		if opts.IndexHtml != "" {
			w.Write([]byte(opts.IndexHtml))
			return
		}

		// Otherwise, serve embedded index.html
		indexFile, err := reactFileSystem.Open("index.html")
		if err != nil {
			http.Error(w, "Failed to load index.html", http.StatusInternalServerError)
			return
		}
		defer indexFile.Close()

		content, err := io.ReadAll(indexFile)
		if err != nil {
			http.Error(w, "Failed to read index.html", http.StatusInternalServerError)
			return
		}

		w.Write(content)
	})
	return nil
}

func RegisterAPI(mux *http.ServeMux) error {
	// Ensure directory exists
	if err := globalStore.EnsureDir(); err != nil {
		fmt.Printf("Warning: Failed to ensure data directory: %v\n", err)
	}

	// Serve user data
	mux.Handle("/data/", http.StripPrefix("/data/", http.FileServer(http.Dir(globalStore.Dir))))

	// API endpoints
	mux.HandleFunc("/api/plans", handlePlans)
	mux.HandleFunc("/api/spots", handleSpots)
	mux.HandleFunc("/api/foods", handleFoods)
	mux.HandleFunc("/api/routes", handleRoutes)
	mux.HandleFunc("/api/questions", handleQuestions)
	mux.HandleFunc("/api/references", handleReferences)
	mux.HandleFunc("/api/config", handleConfig)
	mux.HandleFunc("/api/guide-images", handleGuideImages)
	mux.HandleFunc("/api/schedules", handleSchedules)
	mux.HandleFunc("/api/upload-guide-image", handleUploadGuideImage)
	mux.HandleFunc("/ping", handlePing)

	return nil
}

func handlePing(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("pong"))
}

func handlePlans(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		plans, err := globalStore.ListPlans()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(plans)
		return
	}
	if r.Method == http.MethodPost {
		var payload struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		newPlan, err := globalStore.CreatePlan(payload.Name)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(newPlan)
		return
	}
	if r.Method == http.MethodPut {
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "Missing id", http.StatusBadRequest)
			return
		}
		var update store.Plan
		if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := globalStore.UpdatePlan(id, update); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method == http.MethodDelete {
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "Missing id", http.StatusBadRequest)
			return
		}
		if err := globalStore.DeletePlan(id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func getPlanStore(r *http.Request) (*store.PlanStore, error) {
	planID := r.URL.Query().Get("planId")
	if planID == "" {
		return nil, fmt.Errorf("missing planId query parameter")
	}
	return globalStore.GetPlanStore(planID), nil
}

func handleSpots(w http.ResponseWriter, r *http.Request) {
	s, err := getPlanStore(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if r.Method == http.MethodGet {
		spots, err := s.LoadSpots()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(spots)
		return
	}
	if r.Method == http.MethodPost {
		var spots []store.Spot
		if err := json.NewDecoder(r.Body).Decode(&spots); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := s.SaveSpots(spots); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func handleFoods(w http.ResponseWriter, r *http.Request) {
	s, err := getPlanStore(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if r.Method == http.MethodGet {
		foods, err := s.LoadFoods()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(foods)
		return
	}
	if r.Method == http.MethodPost {
		var foods []store.Food
		if err := json.NewDecoder(r.Body).Decode(&foods); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := s.SaveFoods(foods); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func handleRoutes(w http.ResponseWriter, r *http.Request) {
	s, err := getPlanStore(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if r.Method == http.MethodGet {
		routes, err := s.LoadRoutes()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(routes)
		return
	}
	if r.Method == http.MethodPost {
		var routes []store.Route
		if err := json.NewDecoder(r.Body).Decode(&routes); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := s.SaveRoutes(routes); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func handleQuestions(w http.ResponseWriter, r *http.Request) {
	s, err := getPlanStore(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if r.Method == http.MethodGet {
		questions, err := s.LoadQuestions()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(questions)
		return
	}
	if r.Method == http.MethodPost {
		var questions []store.Question
		if err := json.NewDecoder(r.Body).Decode(&questions); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := s.SaveQuestions(questions); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func handleReferences(w http.ResponseWriter, r *http.Request) {
	s, err := getPlanStore(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if r.Method == http.MethodGet {
		references, err := s.LoadReferences()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(references)
		return
	}
	if r.Method == http.MethodPost {
		var references []store.Reference
		if err := json.NewDecoder(r.Body).Decode(&references); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := s.SaveReferences(references); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func handleConfig(w http.ResponseWriter, r *http.Request) {
	s, err := getPlanStore(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if r.Method == http.MethodGet {
		config, err := s.LoadConfig()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(config)
		return
	}
	if r.Method == http.MethodPost {
		var config store.Config
		if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := s.SaveConfig(config); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func handleGuideImages(w http.ResponseWriter, r *http.Request) {
	s, err := getPlanStore(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if r.Method == http.MethodGet {
		images, err := s.LoadGuideImages()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(images)
		return
	}
	if r.Method == http.MethodPost {
		var images []store.GuideImage
		if err := json.NewDecoder(r.Body).Decode(&images); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := s.SaveGuideImages(images); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func handleSchedules(w http.ResponseWriter, r *http.Request) {
	s, err := getPlanStore(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if r.Method == http.MethodGet {
		schedules, err := s.LoadSchedules()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(schedules)
		return
	}
	if r.Method == http.MethodPost {
		var schedules []store.Schedule
		if err := json.NewDecoder(r.Body).Decode(&schedules); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := s.SaveSchedules(schedules); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func handleUploadGuideImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limit upload size (e.g. 10MB)
	r.ParseMultipartForm(10 << 20)

	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	planID := r.FormValue("planId")
	if planID == "" {
		http.Error(w, "Missing planId", http.StatusBadRequest)
		return
	}

	planStore := globalStore.GetPlanStore(planID)
	if err := planStore.EnsureDir(); err != nil {
		http.Error(w, "Failed to ensure plan directory", http.StatusInternalServerError)
		return
	}

	// Create images directory if not exists
	imagesDir := filepath.Join(planStore.Dir, "images")
	if err := os.MkdirAll(imagesDir, 0755); err != nil {
		http.Error(w, "Failed to create images directory", http.StatusInternalServerError)
		return
	}

	// Generate a unique filename to avoid collisions
	filename := fmt.Sprintf("%d-%s", time.Now().UnixMilli(), handler.Filename)
	// Sanitize filename
	filename = strings.ReplaceAll(filename, " ", "_")
	dstPath := filepath.Join(imagesDir, filename)

	dst, err := os.Create(dstPath)
	if err != nil {
		http.Error(w, "Failed to create destination file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}

	// Construct URL
	// Serving from /data/{planId}/images/{filename}
	url := fmt.Sprintf("/data/plans/%s/images/%s", planID, filename)

	json.NewEncoder(w).Encode(map[string]string{
		"url": url,
	})
}

// mimeTypeHandler wraps an http.Handler and sets proper MIME types
type mimeTypeHandler struct {
	handler http.Handler
}

func (h *mimeTypeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Set MIME type based on file extension
	ext := filepath.Ext(r.URL.Path)
	switch ext {
	case ".css":
		w.Header().Set("Content-Type", "text/css")
	case ".js":
		w.Header().Set("Content-Type", "application/javascript")
	case ".svg":
		w.Header().Set("Content-Type", "image/svg+xml")
	default:
		// Use Go's built-in MIME type detection for other files
		if mimeType := mime.TypeByExtension(ext); mimeType != "" {
			w.Header().Set("Content-Type", mimeType)
		}
	}

	// Call the wrapped handler
	h.handler.ServeHTTP(w, r)
}

// serveAssetWithPattern finds and serves the first available file matching the given exact match or prefix and suffix
func serveAssetWithPattern(w http.ResponseWriter, r *http.Request, assetsFS fs.FS, exactMatch, prefix, suffix, contentType string) {
	// First try exact match
	if _, err := fs.Stat(assetsFS, exactMatch); err == nil {
		serveAssetFile(w, r, assetsFS, exactMatch, contentType)
		return
	}

	// Then try pattern matching with prefix and suffix
	entries, err := fs.ReadDir(assetsFS, ".")
	if err != nil {
		http.NotFound(w, r)
		return
	}

	for _, entry := range entries {
		if !entry.IsDir() && strings.HasPrefix(entry.Name(), prefix) && strings.HasSuffix(entry.Name(), suffix) {
			serveAssetFile(w, r, assetsFS, entry.Name(), contentType)
			return
		}
	}

	// No matching file found
	http.NotFound(w, r)
}

// serveAssetFile serves a specific file from the assets filesystem
func serveAssetFile(w http.ResponseWriter, r *http.Request, assetsFS fs.FS, filename string, contentType string) {
	file, err := assetsFS.Open(filename)
	if err != nil {
		http.Error(w, "Failed to open asset file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read asset file", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Write(content)
}

// checkPortAvailable checks if a port is available
func checkPortAvailable(port int) bool {
	ln, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		return false
	}
	ln.Close()
	return true
}

// FindAvailablePort finds a port starting from startPort
func FindAvailablePort(startPort int, maxAttempts int) (int, error) {
	for i := 0; i < maxAttempts; i++ {
		port := startPort + i
		if checkPortAvailable(port) {
			return port, nil
		}
	}
	return 0, fmt.Errorf("no available port found")
}

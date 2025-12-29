package store

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Plan struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
	// Plan might have description etc later
}

type Destination struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
	Order     int    `json:"order"` // 序号
}

type Spot struct {
	ID                  string  `json:"id"`
	Name                string  `json:"name"`
	Time                string  `json:"time"`
	Interior            string  `json:"interior"`             // 内部
	Story               string  `json:"story"`                // 典故
	PlayTime            string  `json:"play_time"`            // 游玩时长
	ReservationRequired bool    `json:"reservation_required"` // 需预约
	ReservationInfo     string  `json:"reservation_info"`     // 预约信息
	Lat                 float64 `json:"lat"`
	Lng                 float64 `json:"lng"`
	Icon                string  `json:"icon"` // default, flag, star, etc.
	IconBase64          string  `json:"icon_base64,omitempty"`
	HideInList          bool    `json:"hide_in_list"` // 是否在列表中隐藏
	Website             string  `json:"website"`      // 官网
	Rating              float64 `json:"rating"`       // 星级 1-5
}

type Food struct {
	ID                     string  `json:"id"`
	Name                   string  `json:"name"`
	Time                   string  `json:"time"`
	Type                   string  `json:"type"`                    // 菜系/类型
	Rating                 float64 `json:"rating"`                  // 星级 1-5
	Comment                string  `json:"comment"`                 // 评价/推荐菜
	RecommendedRestaurants string  `json:"recommended_restaurants"` // 推荐餐厅
	ReservationRequired    bool    `json:"reservation_required"`    // 需预约
	ReservationInfo        string  `json:"reservation_info"`        // 预约信息
	Lat                    float64 `json:"lat"`
	Lng                    float64 `json:"lng"`
	Website                string  `json:"website"` // 官网
}

type Route struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Time     string   `json:"time"`
	Spots    []string `json:"spots"`
	Duration string   `json:"duration"` // 耗时
	Story    string   `json:"story"`
	Children []Route  `json:"children,omitempty"`
}

type Question struct {
	ID       string `json:"id"`
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

type Reference struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	Link        string `json:"link"`
	LinkBase64  string `json:"link_base64,omitempty"`
}

type Config struct {
	MapImage       string             `json:"map_image"`
	MapImageBase64 string             `json:"map_image_base64,omitempty"`
	Destination    *DestinationConfig `json:"destination,omitempty"`
	MapState       *MapState          `json:"map_state,omitempty"`
	MapProvider    string             `json:"map_provider,omitempty"`
}

type DestinationConfig struct {
	Name string  `json:"name"`
	Lat  float64 `json:"lat"`
	Lng  float64 `json:"lng"`
}

type MapState struct {
	Lat  float64 `json:"lat"`
	Lng  float64 `json:"lng"`
	Zoom int     `json:"zoom"`
}

type GuideImage struct {
	ID         string `json:"id"`
	URL        string `json:"url"`
	Base64Data string `json:"base64_data,omitempty"`
	// potentially caption, etc.
}

type Schedule struct {
	ID      string `json:"id"`
	Content string `json:"content"`
}

type ItineraryItem struct {
	ID          string `json:"id"`
	Time        string `json:"time"`
	Activity    string `json:"activity"`
	Description string `json:"description"`
	Reference   string `json:"reference"`
}

type FullDestination struct {
	Destination Destination     `json:"destination"`
	Spots       []Spot          `json:"spots"`
	Foods       []Food          `json:"foods"`
	Routes      []Route         `json:"routes"`
	Questions   []Question      `json:"questions"`
	References  []Reference     `json:"references"`
	Config      Config          `json:"config"`
	GuideImages []GuideImage    `json:"guide_images"`
	Schedules   []Schedule      `json:"schedules"`
	Itineraries []ItineraryItem `json:"itineraries"`
}

type FullPlan struct {
	Plan         Plan              `json:"plan"`
	Destinations []FullDestination `json:"destinations"`
}

// GlobalStore manages plans
type GlobalStore struct {
	Dir       string
	APIPrefix string
}

func NewGlobalStore(dir string) *GlobalStore {
	return &GlobalStore{Dir: dir, APIPrefix: "/api"} // Default
}

func (s *GlobalStore) SetAPIPrefix(prefix string) {
	s.APIPrefix = prefix
}

func (s *GlobalStore) EnsureDir() error {
	if _, err := os.Stat(s.Dir); os.IsNotExist(err) {
		if err := os.MkdirAll(s.Dir, 0755); err != nil {
			return err
		}
	}
	// Also ensure plans directory
	plansDir := filepath.Join(s.Dir, "plans")
	if _, err := os.Stat(plansDir); os.IsNotExist(err) {
		if err := os.MkdirAll(plansDir, 0755); err != nil {
			return err
		}
	}
	return nil
}

func (s *GlobalStore) ListPlans() ([]Plan, error) {
	if err := s.EnsureDir(); err != nil {
		return nil, err
	}
	path := filepath.Join(s.Dir, "plans.json")
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []Plan{}, nil
	}
	if err != nil {
		return nil, err
	}
	var plans []Plan
	if len(data) == 0 {
		return []Plan{}, nil
	}
	if err := json.Unmarshal(data, &plans); err != nil {
		return nil, err
	}
	return plans, nil
}

func (s *GlobalStore) SavePlans(plans []Plan) error {
	if err := s.EnsureDir(); err != nil {
		return err
	}
	path := filepath.Join(s.Dir, "plans.json")
	data, err := json.MarshalIndent(plans, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func (s *GlobalStore) CreatePlan(name string) (Plan, error) {
	plans, err := s.ListPlans()
	if err != nil {
		return Plan{}, err
	}
	newPlan := Plan{
		ID:        fmt.Sprintf("%d", time.Now().UnixMilli()),
		Name:      name,
		CreatedAt: time.Now().Format(time.RFC3339),
	}
	plans = append(plans, newPlan)
	if err := s.SavePlans(plans); err != nil {
		return Plan{}, err
	}
	// Ensure plan directory exists
	planStore := s.GetPlanStore(newPlan.ID)
	if err := planStore.EnsureDir(); err != nil {
		return Plan{}, err
	}
	return newPlan, nil
}

func (s *GlobalStore) UpdatePlan(id string, update Plan) error {
	plans, err := s.ListPlans()
	if err != nil {
		return err
	}
	for i, p := range plans {
		if p.ID == id {
			if update.Name != "" {
				plans[i].Name = update.Name
			}
			return s.SavePlans(plans)
		}
	}
	return fmt.Errorf("plan not found")
}

func (s *GlobalStore) DeletePlan(id string) error {
	plans, err := s.ListPlans()
	if err != nil {
		return err
	}
	var newPlans []Plan
	for _, p := range plans {
		if p.ID != id {
			newPlans = append(newPlans, p)
		}
	}
	if err := s.SavePlans(newPlans); err != nil {
		return err
	}
	// Remove directory
	return os.RemoveAll(filepath.Join(s.Dir, "plans", id))
}

func (s *GlobalStore) GetPlanStore(planID string) *PlanStore {
	return &PlanStore{Dir: filepath.Join(s.Dir, "plans", planID)}
}

func (s *GlobalStore) readBase64FromURL(url string) string {
	dataPrefix := s.APIPrefix
	if !strings.HasSuffix(dataPrefix, "/") {
		dataPrefix += "/"
	}
	dataPrefix += "data/"

	var relPath string
	if strings.HasPrefix(url, dataPrefix) {
		relPath = strings.TrimPrefix(url, dataPrefix)
	} else if strings.HasPrefix(url, "/data/") {
		relPath = strings.TrimPrefix(url, "/data/")
	} else {
		return ""
	}

	fullPath := filepath.Join(s.Dir, relPath)
	data, err := os.ReadFile(fullPath)
	if err != nil {
		return ""
	}
	return base64.StdEncoding.EncodeToString(data)
}

// ExportPlans exports specific plans and their data. If planIds is empty, exports all plans.
func (s *GlobalStore) ExportPlans(planIds []string) ([]FullPlan, error) {
	plans, err := s.ListPlans()
	if err != nil {
		return nil, err
	}

	// Create a map for faster lookup if planIds are provided
	allowedIds := make(map[string]bool)
	for _, id := range planIds {
		allowedIds[id] = true
	}

	var fullPlans []FullPlan
	for _, p := range plans {
		if len(planIds) > 0 && !allowedIds[p.ID] {
			continue
		}

		planStore := s.GetPlanStore(p.ID)

		// Clone plan to avoid modifying original
		exportedPlan := p
		exportedPlan.ID = "" // Zero out ID

		fullPlan := FullPlan{Plan: exportedPlan}

		dests, err := planStore.ListDestinations()
		if err != nil {
			return nil, err
		}

		for _, d := range dests {
			destStore := planStore.GetDestinationStore(d.ID)

			// Load all data
			spots, _ := destStore.LoadSpots()
			foods, _ := destStore.LoadFoods()
			routes, _ := destStore.LoadRoutes()
			questions, _ := destStore.LoadQuestions()
			references, _ := destStore.LoadReferences()
			config, _ := destStore.LoadConfig()
			images, _ := destStore.LoadGuideImages()
			schedules, _ := destStore.LoadSchedules()
			itineraries, _ := destStore.LoadItineraries()

			// Zero out IDs for all sub-items and embed base64
			d.ID = ""
			for i := range spots {
				if spots[i].Icon != "" {
					b64 := s.readBase64FromURL(spots[i].Icon)
					if b64 != "" {
						spots[i].IconBase64 = b64
						spots[i].Icon = ""
					}
				}
				spots[i].ID = ""
			}
			for i := range foods {
				foods[i].ID = ""
			}
			for i := range routes {
				routes[i].ID = ""
			}
			for i := range questions {
				questions[i].ID = ""
			}
			for i := range references {
				if references[i].Link != "" {
					b64 := s.readBase64FromURL(references[i].Link)
					if b64 != "" {
						references[i].LinkBase64 = b64
						references[i].Link = ""
					}
				}
				references[i].ID = ""
			}
			for i := range images {
				b64 := s.readBase64FromURL(images[i].URL)
				if b64 != "" {
					images[i].Base64Data = b64
					images[i].URL = ""
				}
				images[i].ID = ""
			}

			if config.MapImage != "" {
				b64 := s.readBase64FromURL(config.MapImage)
				if b64 != "" {
					config.MapImageBase64 = b64
					config.MapImage = ""
				}
			}

			for i := range schedules {
				schedules[i].ID = ""
			}
			for i := range itineraries {
				itineraries[i].ID = ""
			}

			fullPlan.Destinations = append(fullPlan.Destinations, FullDestination{
				Destination: d,
				Spots:       spots,
				Foods:       foods,
				Routes:      routes,
				Questions:   questions,
				References:  references,
				Config:      config,
				GuideImages: images,
				Schedules:   schedules,
				Itineraries: itineraries,
			})
		}
		fullPlans = append(fullPlans, fullPlan)
	}
	return fullPlans, nil
}

// ExportAll exports all plans and their data
func (s *GlobalStore) ExportAll() ([]FullPlan, error) {
	return s.ExportPlans(nil)
}

func (s *GlobalStore) saveBase64Image(planID, destID, base64Data string) (string, error) {
	if base64Data == "" {
		return "", nil
	}
	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return "", err
	}

	destStore := s.GetPlanStore(planID).GetDestinationStore(destID)
	if err := destStore.EnsureDir(); err != nil {
		return "", err
	}
	imagesDir := filepath.Join(destStore.Dir, "images")
	if err := os.MkdirAll(imagesDir, 0755); err != nil {
		return "", err
	}

	contentType := http.DetectContentType(data)
	ext := ".png" // Default
	switch contentType {
	case "image/jpeg":
		ext = ".jpg"
	case "image/png":
		ext = ".png"
	case "image/gif":
		ext = ".gif"
	case "image/svg+xml":
		ext = ".svg"
	}

	filename := fmt.Sprintf("%d-import%s", time.Now().UnixNano(), ext)
	path := filepath.Join(imagesDir, filename)
	if err := os.WriteFile(path, data, 0644); err != nil {
		return "", err
	}

	dataPrefix := s.APIPrefix
	if !strings.HasSuffix(dataPrefix, "/") {
		dataPrefix += "/"
	}
	dataPrefix += "data/"

	return fmt.Sprintf("%splans/%s/destinations/%s/images/%s", dataPrefix, planID, destID, filename), nil
}

// ImportPlans imports a list of full plans
func (s *GlobalStore) ImportPlans(plans []FullPlan) error {
	for _, fp := range plans {
		// Create new plan
		newPlan, err := s.CreatePlan(fp.Plan.Name)
		if err != nil {
			return err
		}

		planStore := s.GetPlanStore(newPlan.ID)

		for _, fd := range fp.Destinations {
			// Create destination
			newDest, err := planStore.CreateDestination(fd.Destination.Name)
			if err != nil {
				return err
			}

			// Update destination order if needed (CreateDestination sets order to last)
			if newDest.Order != fd.Destination.Order {
				newDest.Order = fd.Destination.Order
				planStore.UpdateDestination(newDest.ID, newDest)
			}

			destStore := planStore.GetDestinationStore(newDest.ID)

			// Process images before saving metadata
			for i := range fd.Spots {
				if fd.Spots[i].IconBase64 != "" {
					newUrl, err := s.saveBase64Image(newPlan.ID, newDest.ID, fd.Spots[i].IconBase64)
					if err == nil {
						fd.Spots[i].Icon = newUrl
					}
				}
			}

			for i := range fd.GuideImages {
				if fd.GuideImages[i].Base64Data != "" {
					newUrl, err := s.saveBase64Image(newPlan.ID, newDest.ID, fd.GuideImages[i].Base64Data)
					if err == nil {
						fd.GuideImages[i].URL = newUrl
					}
				}
			}

			if fd.Config.MapImageBase64 != "" {
				newUrl, err := s.saveBase64Image(newPlan.ID, newDest.ID, fd.Config.MapImageBase64)
				if err == nil {
					fd.Config.MapImage = newUrl
				}
			}

			for i := range fd.References {
				if fd.References[i].LinkBase64 != "" {
					newUrl, err := s.saveBase64Image(newPlan.ID, newDest.ID, fd.References[i].LinkBase64)
					if err == nil {
						fd.References[i].Link = newUrl
					}
				}
			}

			// Save all data
			destStore.SaveSpots(fd.Spots)
			destStore.SaveFoods(fd.Foods)
			destStore.SaveRoutes(fd.Routes)
			destStore.SaveQuestions(fd.Questions)
			destStore.SaveReferences(fd.References)
			destStore.SaveConfig(fd.Config)
			destStore.SaveGuideImages(fd.GuideImages)
			destStore.SaveSchedules(fd.Schedules)
			destStore.SaveItineraries(fd.Itineraries)
		}
	}
	return nil
}

// PlanStore manages data for a specific plan (which contains destinations)
type PlanStore struct {
	Dir string
}

func (s *PlanStore) EnsureDir() error {
	if _, err := os.Stat(s.Dir); os.IsNotExist(err) {
		if err := os.MkdirAll(s.Dir, 0755); err != nil {
			return err
		}
	}
	// Ensure destinations directory
	destDir := filepath.Join(s.Dir, "destinations")
	if _, err := os.Stat(destDir); os.IsNotExist(err) {
		if err := os.MkdirAll(destDir, 0755); err != nil {
			return err
		}
	}
	return nil
}

func (s *PlanStore) ListDestinations() ([]Destination, error) {
	if err := s.EnsureDir(); err != nil {
		return nil, err
	}
	path := filepath.Join(s.Dir, "destinations.json")
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []Destination{}, nil
	}
	if err != nil {
		return nil, err
	}
	var dests []Destination
	if len(data) == 0 {
		return []Destination{}, nil
	}
	if err := json.Unmarshal(data, &dests); err != nil {
		return nil, err
	}
	return dests, nil
}

func (s *PlanStore) SaveDestinations(dests []Destination) error {
	if err := s.EnsureDir(); err != nil {
		return err
	}
	path := filepath.Join(s.Dir, "destinations.json")
	data, err := json.MarshalIndent(dests, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func (s *PlanStore) CreateDestination(name string) (Destination, error) {
	dests, err := s.ListDestinations()
	if err != nil {
		return Destination{}, err
	}
	newDest := Destination{
		ID:        fmt.Sprintf("%d", time.Now().UnixMilli()),
		Name:      name,
		CreatedAt: time.Now().Format(time.RFC3339),
		Order:     len(dests),
	}
	dests = append(dests, newDest)
	if err := s.SaveDestinations(dests); err != nil {
		return Destination{}, err
	}
	// Ensure destination directory exists
	destStore := s.GetDestinationStore(newDest.ID)
	if err := destStore.EnsureDir(); err != nil {
		return Destination{}, err
	}
	return newDest, nil
}

func (s *PlanStore) UpdateDestination(id string, update Destination) error {
	dests, err := s.ListDestinations()
	if err != nil {
		return err
	}
	for i, d := range dests {
		if d.ID == id {
			if update.Name != "" {
				dests[i].Name = update.Name
			}
			dests[i].Order = update.Order
			return s.SaveDestinations(dests)
		}
	}
	return fmt.Errorf("destination not found")
}

func (s *PlanStore) DeleteDestination(id string) error {
	dests, err := s.ListDestinations()
	if err != nil {
		return err
	}
	var newDests []Destination
	for _, d := range dests {
		if d.ID != id {
			newDests = append(newDests, d)
		}
	}
	if err := s.SaveDestinations(newDests); err != nil {
		return err
	}
	// Remove directory
	return os.RemoveAll(filepath.Join(s.Dir, "destinations", id))
}

func (s *PlanStore) GetDestinationStore(destID string) *DestinationStore {
	return &DestinationStore{Dir: filepath.Join(s.Dir, "destinations", destID)}
}

// DestinationStore manages data for a specific destination (was PlanStore)
type DestinationStore struct {
	Dir string
}

func (s *DestinationStore) EnsureDir() error {
	if _, err := os.Stat(s.Dir); os.IsNotExist(err) {
		if err := os.MkdirAll(s.Dir, 0755); err != nil {
			return err
		}
	}
	return nil
}

func (s *DestinationStore) loadFile(filename string, v interface{}) error {
	path := filepath.Join(s.Dir, filename)
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return nil // Return empty/default
	}
	if err != nil {
		return err
	}
	if len(data) == 0 {
		return nil
	}
	return json.Unmarshal(data, v)
}

func (s *DestinationStore) saveFile(filename string, v interface{}) error {
	if err := s.EnsureDir(); err != nil {
		return err
	}
	path := filepath.Join(s.Dir, filename)
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func (s *DestinationStore) LoadSpots() ([]Spot, error) {
	var spots []Spot
	err := s.loadFile("spots.json", &spots)
	if spots == nil {
		spots = []Spot{}
	}
	return spots, err
}

func (s *DestinationStore) SaveSpots(spots []Spot) error {
	return s.saveFile("spots.json", spots)
}

func (s *DestinationStore) LoadFoods() ([]Food, error) {
	var foods []Food
	err := s.loadFile("foods.json", &foods)
	if foods == nil {
		foods = []Food{}
	}
	return foods, err
}

func (s *DestinationStore) SaveFoods(foods []Food) error {
	return s.saveFile("foods.json", foods)
}

func (s *DestinationStore) LoadRoutes() ([]Route, error) {
	var routes []Route
	err := s.loadFile("routes.json", &routes)
	if routes == nil {
		routes = []Route{}
	}
	return routes, err
}

func (s *DestinationStore) SaveRoutes(routes []Route) error {
	return s.saveFile("routes.json", routes)
}

func (s *DestinationStore) LoadQuestions() ([]Question, error) {
	var questions []Question
	err := s.loadFile("questions.json", &questions)
	if questions == nil {
		questions = []Question{}
	}
	return questions, err
}

func (s *DestinationStore) SaveQuestions(questions []Question) error {
	return s.saveFile("questions.json", questions)
}

func (s *DestinationStore) LoadReferences() ([]Reference, error) {
	var references []Reference
	err := s.loadFile("references.json", &references)
	if references == nil {
		references = []Reference{}
	}
	return references, err
}

func (s *DestinationStore) SaveReferences(references []Reference) error {
	return s.saveFile("references.json", references)
}

func (s *DestinationStore) LoadConfig() (Config, error) {
	var config Config
	err := s.loadFile("config.json", &config)
	return config, err
}

func (s *DestinationStore) SaveConfig(config Config) error {
	return s.saveFile("config.json", config)
}

func (s *DestinationStore) LoadGuideImages() ([]GuideImage, error) {
	var images []GuideImage
	err := s.loadFile("guide_images.json", &images)
	if images == nil {
		images = []GuideImage{}
	}
	return images, err
}

func (s *DestinationStore) SaveGuideImages(images []GuideImage) error {
	return s.saveFile("guide_images.json", images)
}

func (s *DestinationStore) LoadSchedules() ([]Schedule, error) {
	var schedules []Schedule
	err := s.loadFile("schedules.json", &schedules)
	if schedules == nil {
		schedules = []Schedule{}
	}
	return schedules, err
}

func (s *DestinationStore) SaveSchedules(schedules []Schedule) error {
	return s.saveFile("schedules.json", schedules)
}

func (s *DestinationStore) LoadItineraries() ([]ItineraryItem, error) {
	var itineraries []ItineraryItem
	err := s.loadFile("itineraries.json", &itineraries)
	if itineraries == nil {
		itineraries = []ItineraryItem{}
	}
	return itineraries, err
}

func (s *DestinationStore) SaveItineraries(itineraries []ItineraryItem) error {
	return s.saveFile("itineraries.json", itineraries)
}

// Package lib contains helpers shared by the bundling scripts under
// script/bundle/... -- resolving the module root, running the React
// build, and invoking `go build` with the right environment for the
// target platform. The per-target entry points stay thin: they just
// pick the target-specific knobs and delegate here.
package lib

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// FrontendDir is the Vite project whose `dist/` output is embedded
// into the backend binary via //go:embed.
const FrontendDir = "travel-map-react"

// callerSkipFromLib is how many frames `runtime.Caller` must skip to
// land on the bundling script's main.go. The call chain is:
//
//	main -> lib.ModuleRoot -> runtime.Caller(skip)
//
// so skip=2 returns main's filename, regardless of whether the
// script lives at <root>/script/bundle/main.go or
// <root>/script/bundle/for-linux/main.go.
const callerSkipFromLib = 2

// ModuleRoot walks up from the caller's source file until it finds a
// directory that looks like the module root. Deriving it from the
// source file rather than os.Getwd() lets operators invoke the script
// from any directory without surprising failures.
func ModuleRoot() (string, error) {
	_, thisFile, _, ok := runtime.Caller(callerSkipFromLib)
	if !ok {
		return "", fmt.Errorf("runtime.Caller failed")
	}
	dir := filepath.Dir(thisFile)
	for i := 0; i < 6; i++ {
		if looksLikeRoot(dir) {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return "", fmt.Errorf(
		"could not locate module root (expected go.mod, main.go and %s) starting from %s",
		FrontendDir, filepath.Dir(thisFile),
	)
}

func looksLikeRoot(dir string) bool {
	if _, err := os.Stat(filepath.Join(dir, "go.mod")); err != nil {
		return false
	}
	if _, err := os.Stat(filepath.Join(dir, "main.go")); err != nil {
		return false
	}
	if _, err := os.Stat(filepath.Join(dir, FrontendDir)); err != nil {
		return false
	}
	return true
}

// BuildFrontend runs the Vite build inside the React project so
// <root>/<FrontendDir>/dist is ready for the backend's //go:embed.
func BuildFrontend(root string) error {
	if _, err := exec.LookPath("bun"); err != nil {
		return fmt.Errorf("bun is not installed, install it from https://bun.sh/docs/installation")
	}
	dir := filepath.Join(root, FrontendDir)

	nodeModules := filepath.Join(dir, "node_modules")
	if _, err := os.Stat(nodeModules); err != nil {
		fmt.Println("\n== bun install ==")
		if err := runCmd(dir, nil, "bun", "install"); err != nil {
			return fmt.Errorf("bun install: %w", err)
		}
	}

	fmt.Println("\n== bun run build ==")
	if err := runCmd(dir, nil, "bun", "run", "build"); err != nil {
		return fmt.Errorf("bun run build: %w", err)
	}

	distDir := filepath.Join(dir, "dist")
	if info, err := os.Stat(distDir); err != nil || !info.IsDir() {
		return fmt.Errorf("vite did not produce %s", distDir)
	}
	return nil
}

// BackendOptions controls how BuildBackend invokes `go build`. Zero
// values mean "use the current Go toolchain defaults" -- that is, a
// bundle for the host platform. Fill in GOOS/GOARCH and DisableCGO to
// cross-compile.
type BackendOptions struct {
	// OutputName is the filename written into the module root, e.g.
	// "travel-map-linux-amd64.bin" or "travel-map-darwin-arm64.bin".
	OutputName string
	// GOOS / GOARCH override the target triple. Empty means inherit
	// from the parent environment / Go default.
	GOOS   string
	GOARCH string
	// DisableCGO sets CGO_ENABLED=0 for static cross-compiled bundles.
	DisableCGO bool
}

// BuildBackend cross-compiles or natively compiles the Go code into
// <root>/<opts.OutputName>.
func BuildBackend(root string, opts BackendOptions) error {
	if opts.OutputName == "" {
		return fmt.Errorf("BackendOptions.OutputName is required")
	}

	cmd := exec.Command(
		"go", "build",
		"-trimpath",
		"-ldflags", "-s -w",
		"-o", opts.OutputName,
		".",
	)
	cmd.Dir = root
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	env := os.Environ()
	if opts.GOOS != "" {
		env = append(env, "GOOS="+opts.GOOS)
	}
	if opts.GOARCH != "" {
		env = append(env, "GOARCH="+opts.GOARCH)
	}
	if opts.DisableCGO {
		env = append(env, "CGO_ENABLED=0")
	}
	cmd.Env = env

	label := labelFor(opts)
	fmt.Printf("\n== go build %s ==\n", label)
	fmt.Printf("+ cd %s\n+ %s %s\n", cmd.Dir, envPrefix(opts), cmd.String())
	return cmd.Run()
}

func labelFor(opts BackendOptions) string {
	goos := opts.GOOS
	if goos == "" {
		goos = runtime.GOOS
	}
	goarch := opts.GOARCH
	if goarch == "" {
		goarch = runtime.GOARCH
	}
	return goos + "/" + goarch
}

func envPrefix(opts BackendOptions) string {
	parts := []string{}
	if opts.GOOS != "" {
		parts = append(parts, "GOOS="+opts.GOOS)
	}
	if opts.GOARCH != "" {
		parts = append(parts, "GOARCH="+opts.GOARCH)
	}
	if opts.DisableCGO {
		parts = append(parts, "CGO_ENABLED=0")
	}
	if len(parts) == 0 {
		return ""
	}
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += " "
		}
		out += p
	}
	return out
}

func runCmd(dir string, extraEnv []string, name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	env := os.Environ()
	if len(extraEnv) > 0 {
		env = append(env, extraEnv...)
	}
	cmd.Env = env
	fmt.Printf("+ cd %s\n+ %s\n", dir, cmd.String())
	return cmd.Run()
}

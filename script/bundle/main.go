// Command bundle builds the React frontend and compiles the Go
// backend for the host OS/arch into a single self-contained binary.
//
// Usage (from the travel-map module root):
//
//	go run ./script/bundle
//
// The resulting artifact is written to
// ./travel-map-<goos>-<goarch>.bin in the module root so that host
// and cross-compiled bundles can coexist. For Linux releases use
// `go run ./script/bundle/for-linux` instead, which hard-codes the
// static linux/amd64 target.
package main

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"travel-map/script/lib"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	root, err := lib.ModuleRoot()
	if err != nil {
		return fmt.Errorf("resolve module root: %w", err)
	}
	fmt.Printf("module root: %s\n", root)

	if err := lib.BuildFrontend(root); err != nil {
		return err
	}

	outputName := fmt.Sprintf("travel-map-%s-%s.bin", runtime.GOOS, runtime.GOARCH)
	if err := lib.BuildBackend(root, lib.BackendOptions{
		OutputName: outputName,
	}); err != nil {
		return err
	}

	out := filepath.Join(root, outputName)
	fmt.Printf("\nBundle ready: %s\n", out)
	return nil
}

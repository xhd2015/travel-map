// Command for-linux bundles the React frontend and cross-compiles the
// Go backend into a single static Linux amd64 binary.
//
// Usage (from the travel-map module root):
//
//	go run ./script/bundle/for-linux
//
// The resulting artifact is written to ./travel-map-linux-amd64.bin.
package main

import (
	"fmt"
	"os"
	"path/filepath"

	"travel-map/script/lib"
)

// outputName is the final binary written into the module root. We
// embed the os/arch into the name so side-by-side releases for other
// platforms don't collide.
const outputName = "travel-map-linux-amd64.bin"

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
	if err := lib.BuildBackend(root, lib.BackendOptions{
		OutputName: outputName,
		GOOS:       "linux",
		GOARCH:     "amd64",
		DisableCGO: true,
	}); err != nil {
		return err
	}

	out := filepath.Join(root, outputName)
	fmt.Printf("\nBundle ready: %s\n", out)
	return nil
}

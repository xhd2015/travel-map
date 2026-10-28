package main

import (
	"context"
	"net/http"
	"os"

	devserver "github.com/xhd2015/dot-pkgs/go-pkgs/dev/server"
	"travel-map/server"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		devserver.PrintError(os.Stderr, err)
		os.Exit(1)
	}
}

func run(args []string) error {
	root, err := devserver.FindRoot("travel-map-react/package.json")
	if err != nil {
		return err
	}
	return devserver.Main(args, devserver.Config{
		Name: "travel-map", Root: root, BuildPackage: "./script/dev", BackendPort: 8080, FrontendPort: 35100, BrowserPath: "/",
		WatchDirs: []string{"server", "script/dev"},
		Frontend:  &devserver.Vite{Dir: "travel-map-react", Install: []string{"bun", "install"}, Command: []string{"bun", "run", "dev", "--"}},
		BackendHandler: func(_ context.Context, b devserver.Backend) (http.Handler, error) {
			return server.DevHandler(b.FrontendURL, "")
		},
	})
}

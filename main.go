package main

import (
	"embed"
	"fmt"
	"os"

	"travel-map/run"
	"travel-map/server"
)

//go:embed travel-map-react/dist
var distFS embed.FS

//go:embed travel-map-react/template.html
var templateHTML string

func main() {
	server.Init(distFS, templateHTML)

	err := run.Run(os.Args[1:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}
}

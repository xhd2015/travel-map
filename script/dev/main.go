package main

import (
	"fmt"
	"os"

	"travel-map/run"
)

func main() {
	err := run.Run([]string{"--dev"})
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}
}

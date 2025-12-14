package main

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/xhd2015/xgo/support/cmd"
)

func main() {
	err := Handle(os.Args[1:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}
}

func Handle(args []string) error {
	// check if bun installed
	if _, err := exec.LookPath("bun"); err != nil {
		return fmt.Errorf("bun is not installed, install it from https://bun.sh/docs/installation")
	}

	// check if travel-map-react/node_modules exists
	if _, err := os.Stat("travel-map-react/node_modules"); err != nil {
		// run bun install
		err := cmd.Debug().Dir("travel-map-react").Run("bun", "install")
		if err != nil {
			return err
		}
	}

	err := cmd.Debug().Dir("travel-map-react").Run("bun", "run", "build")
	if err != nil {
		return err
	}
	return nil
}

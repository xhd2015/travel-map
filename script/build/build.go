package main

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/xhd2015/less-gen/flags"
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
	var apiPrefix string
	var appPrefix string
	var remainingArgs []string
	remainingArgs, err := flags.
		String("--api-prefix", &apiPrefix).
		String("--app-prefix", &appPrefix).
		Parse(args)
	if err != nil {
		return err
	}
	if len(remainingArgs) > 0 {
		return fmt.Errorf("unexpected args: %v", remainingArgs)
	}

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

	env := os.Environ()
	if apiPrefix != "" {
		env = append(env, "VITE_API_PREFIX="+apiPrefix)
	}
	if appPrefix != "" {
		env = append(env, "VITE_APP_PREFIX="+appPrefix)
	}

	err = cmd.Debug().Env(env).Dir("travel-map-react").Run("bun", "run", "build")
	if err != nil {
		return err
	}
	return nil
}

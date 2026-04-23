package server

import (
	"os"

	"github.com/xhd2015/dot-pkgs/go-pkgs/ai/tools"
)

func getWebSearchConfig() tools.WebSearchConfig {
	return tools.WebSearchConfig{
		BochaAPIKey:     os.Getenv("BOCHA_API_KEY"),
		SerpAPIKey:      os.Getenv("SERPAPI_KEY"),
		GoogleSearchKey: os.Getenv("GOOGLE_SEARCH_KEY"),
		GoogleSearchCX:  os.Getenv("GOOGLE_SEARCH_CX"),
	}
}

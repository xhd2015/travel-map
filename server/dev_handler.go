package server

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
)

// DevHandler serves the API and proxies all other requests to owned Vite.
func DevHandler(frontendURL, apiPrefix string) (http.Handler, error) {
	target, err := url.Parse(frontendURL)
	if err != nil || target.Host == "" {
		return nil, fmt.Errorf("invalid frontend URL %q", frontendURL)
	}
	mux := http.NewServeMux()
	if err := RegisterAPI(mux, apiPrefix); err != nil {
		return nil, err
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) { r.Host = target.Host; proxy.ServeHTTP(w, r) })
	return mux, nil
}

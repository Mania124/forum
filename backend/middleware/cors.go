package middleware

import (
	"net/http"
	"os"
)

// CORS Middleware
func CORS(next http.Handler) http.Handler {
	allowedOrigin := os.Getenv("FRONTEND_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost:8000" // fallback default
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// For Docker deployment, requests come through nginx proxy
		// Check if request is from internal Docker network
		origin := r.Header.Get("Origin")
		if origin == "" {
			// No origin header means same-origin request (likely from nginx proxy)
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		} else if origin == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			// For development, allow localhost variations
			if origin == "http://localhost:8000" || origin == "http://127.0.0.1:8000" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

package config

import "os"

type Config struct {
	Port        string
	DatabaseURL string

	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	// FrontendURL is where the OAuth callback redirects after a successful connect.
	FrontendURL string
	// PromptsDir points at docs/prompts — the single source of truth for AI
	// prompt templates, loaded at runtime rather than duplicated in code.
	PromptsDir string
}

func Load() Config {
	return Config{
		Port:               getenv("PORT", "8080"),
		DatabaseURL:        getenv("DATABASE_URL", ""),
		GoogleClientID:     getenv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getenv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getenv("GOOGLE_REDIRECT_URL", "http://localhost:8080/auth/google/callback"),
		FrontendURL:        getenv("FRONTEND_URL", "http://localhost:3000"),
		PromptsDir:         getenv("PROMPTS_DIR", "../docs/prompts"),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

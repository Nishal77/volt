package config

import "os"

type Config struct {
	Port        string
	DatabaseURL string

	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	// TokenEncryptionKey must be 32 bytes, base64-encoded (AES-256-GCM key).
	TokenEncryptionKey string
	// FrontendURL is where the OAuth callback redirects after a successful connect.
	FrontendURL string
}

func Load() Config {
	return Config{
		Port:               getenv("PORT", "8080"),
		DatabaseURL:        getenv("DATABASE_URL", ""),
		GoogleClientID:     getenv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getenv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getenv("GOOGLE_REDIRECT_URL", "http://localhost:8080/auth/google/callback"),
		TokenEncryptionKey: getenv("TOKEN_ENCRYPTION_KEY", ""),
		FrontendURL:        getenv("FRONTEND_URL", "http://localhost:3000"),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

package main

import (
	"context"
	"log"

	"github.com/Nishal77/volt/backend/internal/api"
	"github.com/Nishal77/volt/backend/internal/config"
	"github.com/Nishal77/volt/backend/internal/crypto"
	"github.com/Nishal77/volt/backend/internal/db"
)

func main() {
	cfg := config.Load()

	pool, err := db.Connect(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	if err := db.EnsureSchema(context.Background(), pool); err != nil {
		log.Fatalf("db schema: %v", err)
	}

	encKey, err := crypto.LoadKey(cfg.TokenEncryptionKey)
	if err != nil {
		log.Fatalf("token encryption key: %v", err)
	}

	r := api.NewRouter(pool, cfg, encKey)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server: %v", err)
	}
}

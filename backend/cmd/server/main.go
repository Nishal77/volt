package main

import (
	"context"
	"log"

	"github.com/Nishal77/volt/backend/internal/api"
	"github.com/Nishal77/volt/backend/internal/config"
	"github.com/Nishal77/volt/backend/internal/db"
)

func main() {
	cfg := config.Load()

	pool, err := db.Connect(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	r := api.NewRouter(pool)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server: %v", err)
	}
}

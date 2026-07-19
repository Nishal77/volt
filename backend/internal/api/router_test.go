package api

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/Nishal77/volt/backend/internal/config"
)

// pool is nil here on purpose: NewRouter only registers routes during this
// test, it never invokes a handler, so it never touches the DB.
func TestRoutesRegistered(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := NewRouter(nil, config.Config{})

	type route struct{ method, path string }
	want := []route{
		{http.MethodGet, "/health"},
		{http.MethodGet, "/api/vault/status"},
		{http.MethodPost, "/api/vault/setup"},
		{http.MethodPost, "/api/vault/unlock"},
		{http.MethodGet, "/auth/google"},
		{http.MethodGet, "/auth/google/callback"},
		{http.MethodGet, "/api/inbox"},
		{http.MethodGet, "/api/inbox/:id"},
		{http.MethodPost, "/api/inbox/:id/archive"},
		{http.MethodPost, "/api/inbox/:id/read"},
		{http.MethodPost, "/api/inbox/:id/reply"},
		{http.MethodPost, "/api/inbox/:id/summarize"},
		{http.MethodPost, "/api/inbox/:id/draft"},
		{http.MethodGet, "/api/search"},
		{http.MethodPost, "/api/settings/ai-key"},
		{http.MethodGet, "/api/settings/ai-key"},
	}

	got := map[route]bool{}
	for _, rt := range r.Routes() {
		got[route{rt.Method, rt.Path}] = true
	}

	for _, rt := range want {
		if !got[rt] {
			t.Errorf("expected %s %s to be registered", rt.method, rt.path)
		}
	}
}

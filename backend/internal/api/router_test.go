package api

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/Nishal77/volt/backend/internal/config"
)

// pool and encKey are nil here on purpose: NewRouter only registers routes
// during this test, it never invokes a handler, so it never touches them.
func TestRoutesRegistered(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := NewRouter(nil, config.Config{}, nil)

	want := map[string]string{
		"/health":                http.MethodGet,
		"/auth/google":           http.MethodGet,
		"/auth/google/callback":  http.MethodGet,
		"/api/inbox":             http.MethodGet,
		"/api/inbox/:id":         http.MethodGet,
		"/api/inbox/:id/archive": http.MethodPost,
		"/api/inbox/:id/read":    http.MethodPost,
		"/api/inbox/:id/reply":   http.MethodPost,
	}

	got := map[string]string{}
	for _, rt := range r.Routes() {
		got[rt.Path] = rt.Method
	}

	for path, method := range want {
		if got[path] != method {
			t.Errorf("expected %s %s to be registered, got method %q", method, path, got[path])
		}
	}
}

package api

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
)

// pool is nil here on purpose: NewRouter only registers the /health route
// during this test, it never invokes the handler, so it never touches pool.
func TestHealthRouteRegistered(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := NewRouter(nil)

	for _, rt := range r.Routes() {
		if rt.Method == http.MethodGet && rt.Path == "/health" {
			return
		}
	}
	t.Fatal("expected GET /health to be registered")
}

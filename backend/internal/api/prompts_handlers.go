package api

import (
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
)

type promptFile struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

// promptsHandler serves the exact prompt files the app loads at runtime —
// not a credential, not vault-gated. The transparency claim (CLAUDE.md:
// "the app loads from these files, it does not keep a separate copy in
// code") only means anything if a user can actually see what's in them.
func promptsHandler(promptsDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		entries, err := os.ReadDir(promptsDir)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "prompts_dir_unreadable"})
			return
		}

		var prompts []promptFile
		for _, e := range entries {
			if e.IsDir() || !strings.HasSuffix(e.Name(), ".md") {
				continue
			}
			b, err := os.ReadFile(filepath.Join(promptsDir, e.Name()))
			if err != nil {
				continue
			}
			prompts = append(prompts, promptFile{
				Name:    strings.TrimSuffix(e.Name(), ".md"),
				Content: string(b),
			})
		}
		sort.Slice(prompts, func(i, j int) bool { return prompts[i].Name < prompts[j].Name })
		c.JSON(http.StatusOK, gin.H{"prompts": prompts})
	}
}

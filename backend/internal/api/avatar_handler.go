package api

import (
	"net"
	"net/http"
	"regexp"
	"sync"

	"github.com/gin-gonic/gin"
)

// bimiLogoURL looks up a domain's BIMI record (a public DNS TXT record
// verified brands publish so email clients can show their logo — see
// https://bimigroup.org) and returns the logo URL it points to, if any.
// Plain DNS lookup, no Google OAuth scope involved — this is a separate
// mechanism from both Gmail's API and Gravatar.
//
// ponytail: unbounded in-memory cache, no TTL — fine for a single
// self-hosted instance's lifetime; add eviction if domains list grows
// large enough to matter.
var (
	bimiCache   = map[string]string{}
	bimiCacheMu sync.RWMutex
	bimiLogoRe  = regexp.MustCompile(`l=([^;]+)`)
)

func bimiLogoURL(domain string) string {
	bimiCacheMu.RLock()
	url, ok := bimiCache[domain]
	bimiCacheMu.RUnlock()
	if ok {
		return url
	}

	url = lookupBIMI(domain)
	bimiCacheMu.Lock()
	bimiCache[domain] = url
	bimiCacheMu.Unlock()
	return url
}

func lookupBIMI(domain string) string {
	records, err := net.LookupTXT("default._bimi." + domain)
	if err != nil {
		return ""
	}
	for _, r := range records {
		if match := bimiLogoRe.FindStringSubmatch(r); match != nil {
			return match[1]
		}
	}
	return ""
}

func avatarHandler(c *gin.Context) {
	domain := c.Query("domain")
	if domain == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing_domain"})
		return
	}
	url := bimiLogoURL(domain)
	if url == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "no_logo"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"url": url})
}

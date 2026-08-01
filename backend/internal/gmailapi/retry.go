package gmailapi

import (
	"io"
	"math/rand"
	"net/http"
	"strconv"
	"time"
)

const (
	maxRetries  = 3
	baseBackoff = 500 * time.Millisecond
	maxBackoff  = 8 * time.Second
)

// retryTransport retries a request on Gmail's rate limit (429) and on
// transient server/network failures — one place, so every call through the
// SDK (list, get, send, attachments) gets it for free instead of each call
// site hand-rolling its own retry loop.
type retryTransport struct {
	base http.RoundTripper
}

func (t *retryTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	var resp *http.Response
	var err error

	for attempt := 0; ; attempt++ {
		resp, err = t.base.RoundTrip(req)

		retryable := err != nil || resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500
		if !retryable || attempt >= maxRetries {
			return resp, err
		}

		wait := backoffFor(attempt)
		if resp != nil {
			if ra := retryAfter(resp); ra > 0 {
				wait = ra
			}
			// Drain and close before retrying, so the connection can be
			// reused instead of forcing a new one for the retry.
			_, _ = io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
		}

		select {
		case <-req.Context().Done():
			return resp, req.Context().Err()
		case <-time.After(wait):
		}
	}
}

// backoffFor is exponential with full jitter (0..cap), so N concurrent
// requests hitting a 429 together don't all retry in lockstep.
func backoffFor(attempt int) time.Duration {
	ceiling := baseBackoff * time.Duration(1<<attempt)
	if ceiling > maxBackoff {
		ceiling = maxBackoff
	}
	return time.Duration(rand.Int63n(int64(ceiling)))
}

// retryAfter reads Gmail's own Retry-After header (seconds) when present —
// trust the server's own number over our guess if it gives us one.
func retryAfter(resp *http.Response) time.Duration {
	v := resp.Header.Get("Retry-After")
	if v == "" {
		return 0
	}
	secs, err := strconv.Atoi(v)
	if err != nil || secs <= 0 {
		return 0
	}
	return time.Duration(secs) * time.Second
}

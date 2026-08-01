package gmailapi

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// fakeTransport returns responses[i] on the i-th call, then repeats the
// last one — lets a test script "fail twice, then succeed" without a real
// server or real sleeps.
type fakeTransport struct {
	responses []roundTripResult
	calls     int
}

type roundTripResult struct {
	status int
	err    error
}

func (f *fakeTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	i := f.calls
	if i >= len(f.responses) {
		i = len(f.responses) - 1
	}
	f.calls++
	r := f.responses[i]
	if r.err != nil {
		return nil, r.err
	}
	return &http.Response{
		StatusCode: r.status,
		Body:       io.NopCloser(strings.NewReader("")),
		Header:     http.Header{},
	}, nil
}

func newTestRequest(t *testing.T) *http.Request {
	t.Helper()
	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, "https://example.com", nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	return req
}

func TestRetryTransportSucceedsAfterTransient429(t *testing.T) {
	fake := &fakeTransport{responses: []roundTripResult{
		{status: http.StatusTooManyRequests},
		{status: http.StatusOK},
	}}
	rt := &retryTransport{base: fake}

	resp, err := rt.RoundTrip(newTestRequest(t))
	if err != nil {
		t.Fatalf("RoundTrip: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("final status = %d, want 200", resp.StatusCode)
	}
	if fake.calls != 2 {
		t.Errorf("calls = %d, want 2 (one retry)", fake.calls)
	}
}

func TestRetryTransportGivesUpAfterMaxRetries(t *testing.T) {
	fake := &fakeTransport{responses: []roundTripResult{{status: http.StatusServiceUnavailable}}}
	rt := &retryTransport{base: fake}

	resp, err := rt.RoundTrip(newTestRequest(t))
	if err != nil {
		t.Fatalf("RoundTrip: %v", err)
	}
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Errorf("final status = %d, want 503 (exhausted retries)", resp.StatusCode)
	}
	if fake.calls != maxRetries+1 {
		t.Errorf("calls = %d, want %d (1 initial + %d retries)", fake.calls, maxRetries+1, maxRetries)
	}
}

func TestRetryTransportDoesNotRetryOnSuccess(t *testing.T) {
	fake := &fakeTransport{responses: []roundTripResult{{status: http.StatusOK}}}
	rt := &retryTransport{base: fake}

	if _, err := rt.RoundTrip(newTestRequest(t)); err != nil {
		t.Fatalf("RoundTrip: %v", err)
	}
	if fake.calls != 1 {
		t.Errorf("calls = %d, want 1 (no retry on success)", fake.calls)
	}
}

func TestRetryTransportDoesNotRetryOnClientError(t *testing.T) {
	fake := &fakeTransport{responses: []roundTripResult{{status: http.StatusNotFound}}}
	rt := &retryTransport{base: fake}

	resp, err := rt.RoundTrip(newTestRequest(t))
	if err != nil {
		t.Fatalf("RoundTrip: %v", err)
	}
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("status = %d, want 404 unchanged", resp.StatusCode)
	}
	if fake.calls != 1 {
		t.Errorf("calls = %d, want 1 — 404 is not retryable", fake.calls)
	}
}

func TestRetryTransportRetriesOnNetworkError(t *testing.T) {
	fake := &fakeTransport{responses: []roundTripResult{
		{err: errors.New("connection reset")},
		{status: http.StatusOK},
	}}
	rt := &retryTransport{base: fake}

	resp, err := rt.RoundTrip(newTestRequest(t))
	if err != nil {
		t.Fatalf("RoundTrip: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want 200 after retrying the network error", resp.StatusCode)
	}
}

func TestRetryTransportHonorsContextCancellation(t *testing.T) {
	fake := &fakeTransport{responses: []roundTripResult{{status: http.StatusTooManyRequests}}}
	rt := &retryTransport{base: fake}

	ctx, cancel := context.WithCancel(context.Background())
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://example.com", nil)
	cancel() // already cancelled before the first retry wait

	_, err := rt.RoundTrip(req)
	if !errors.Is(err, context.Canceled) {
		t.Errorf("err = %v, want context.Canceled", err)
	}
}

func TestRetryTransportHonorsRetryAfterHeader(t *testing.T) {
	// Real behavioral check would require sleeping; assert the header is
	// parsed into the expected wait instead of asserting wall-clock time.
	resp := &http.Response{Header: http.Header{"Retry-After": {"2"}}}
	if got := retryAfter(resp); got != 2*time.Second {
		t.Errorf("retryAfter = %v, want 2s", got)
	}

	respMissing := &http.Response{Header: http.Header{}}
	if got := retryAfter(respMissing); got != 0 {
		t.Errorf("retryAfter with no header = %v, want 0", got)
	}
}

func TestRetryTransportAgainstRealServer(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 2 {
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := &http.Client{Transport: &retryTransport{base: http.DefaultTransport}}
	resp, err := client.Get(server.URL)
	if err != nil {
		t.Fatalf("GET: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want 200", resp.StatusCode)
	}
	if attempts != 2 {
		t.Errorf("server saw %d attempts, want 2", attempts)
	}
}

// Package ai calls the user's own Claude or OpenAI key (BYO-key — Volt
// never absorbs inference cost) and loads prompt templates from
// docs/prompts/ at runtime, per CLAUDE.md's single-source-of-truth rule.
package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

type Config struct {
	Provider string // "anthropic" or "openai"
	APIKey   string
}

// ProviderError wraps a non-200 response from an AI provider with its HTTP
// status, so callers can distinguish "your key is wrong" (401/403) from
// "you're rate limited" (429) from everything else, instead of collapsing
// every failure into one generic message.
type ProviderError struct {
	StatusCode int
	Body       string
}

func (e *ProviderError) Error() string {
	return fmt.Sprintf("ai: provider returned %d: %s", e.StatusCode, e.Body)
}

func (e *ProviderError) InvalidKey() bool  { return e.StatusCode == 401 || e.StatusCode == 403 }
func (e *ProviderError) RateLimited() bool { return e.StatusCode == 429 }

// Validate makes one cheap round-trip to the provider to confirm the key
// actually works, before it's saved — so a typo'd or revoked key is caught
// immediately instead of surfacing as a mystery failure on first real use.
func Validate(ctx context.Context, cfg Config) error {
	_, err := Complete(ctx, cfg, "", "Reply with just: OK")
	return err
}

// LoadPrompt reads docs/prompts/<name>.md, the app's single source of
// truth for prompt text — never duplicated as a string literal in code.
func LoadPrompt(promptsDir, name string) (string, error) {
	b, err := os.ReadFile(filepath.Join(promptsDir, name+".md"))
	if err != nil {
		return "", fmt.Errorf("ai: load prompt %s: %w", name, err)
	}
	return string(b), nil
}

// Complete sends systemPrompt + userPrompt to the configured provider and
// returns the model's text reply.
func Complete(ctx context.Context, cfg Config, systemPrompt, userPrompt string) (string, error) {
	switch cfg.Provider {
	case "anthropic":
		return completeAnthropic(ctx, cfg.APIKey, systemPrompt, userPrompt)
	case "openai":
		return completeOpenAI(ctx, cfg.APIKey, systemPrompt, userPrompt)
	case "google":
		return completeGoogle(ctx, cfg.APIKey, systemPrompt, userPrompt)
	case "groq":
		return completeOpenAICompatible(ctx, "https://api.groq.com/openai/v1/chat/completions", groqModel, cfg.APIKey, systemPrompt, userPrompt)
	case "openrouter":
		return completeOpenAICompatible(ctx, "https://openrouter.ai/api/v1/chat/completions", openRouterModel, cfg.APIKey, systemPrompt, userPrompt)
	case "kimi":
		return completeOpenAICompatible(ctx, "https://api.moonshot.ai/v1/chat/completions", kimiModel, cfg.APIKey, systemPrompt, userPrompt)
	default:
		return "", fmt.Errorf("ai: unknown provider %q", cfg.Provider)
	}
}

const anthropicModel = "claude-haiku-4-5-20251001"

func completeAnthropic(ctx context.Context, apiKey, systemPrompt, userPrompt string) (string, error) {
	body, _ := json.Marshal(map[string]any{
		"model":      anthropicModel,
		"max_tokens": 1024,
		"system":     systemPrompt,
		"messages":   []map[string]string{{"role": "user", "content": userPrompt}},
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := doRequest(req)
	if err != nil {
		return "", err
	}
	var out struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(resp, &out); err != nil || len(out.Content) == 0 {
		return "", fmt.Errorf("ai: unexpected anthropic response: %s", resp)
	}
	return out.Content[0].Text, nil
}

const (
	openAIModel     = "gpt-5-mini"
	groqModel       = "llama-3.3-70b-versatile"
	openRouterModel = "openai/gpt-4o-mini"
	kimiModel       = "moonshot-v1-8k"
)

func completeOpenAI(ctx context.Context, apiKey, systemPrompt, userPrompt string) (string, error) {
	return completeOpenAICompatible(ctx, "https://api.openai.com/v1/chat/completions", openAIModel, apiKey, systemPrompt, userPrompt)
}

// completeOpenAICompatible covers every provider that speaks the same
// chat-completions shape OpenAI does — Groq and OpenRouter both do, so
// this one function backs all three instead of near-duplicate copies.
func completeOpenAICompatible(ctx context.Context, url, model, apiKey, systemPrompt, userPrompt string) (string, error) {
	body, _ := json.Marshal(map[string]any{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := doRequest(req)
	if err != nil {
		return "", err
	}
	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(resp, &out); err != nil || len(out.Choices) == 0 {
		return "", fmt.Errorf("ai: unexpected response from %s: %s", url, resp)
	}
	return out.Choices[0].Message.Content, nil
}

const googleModel = "gemini-2.0-flash"

func completeGoogle(ctx context.Context, apiKey, systemPrompt, userPrompt string) (string, error) {
	body, _ := json.Marshal(map[string]any{
		"contents":          []map[string]any{{"parts": []map[string]string{{"text": userPrompt}}}},
		"systemInstruction": map[string]any{"parts": []map[string]string{{"text": systemPrompt}}},
	})
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", googleModel)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", apiKey)

	resp, err := doRequest(req)
	if err != nil {
		return "", err
	}
	var out struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(resp, &out); err != nil || len(out.Candidates) == 0 || len(out.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("ai: unexpected google response: %s", resp)
	}
	return out.Candidates[0].Content.Parts[0].Text, nil
}

func doRequest(req *http.Request) ([]byte, error) {
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ai: request failed: %w", err)
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, &ProviderError{StatusCode: resp.StatusCode, Body: string(b)}
	}
	return b, nil
}

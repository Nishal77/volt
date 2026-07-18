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

const openAIModel = "gpt-5-mini"

func completeOpenAI(ctx context.Context, apiKey, systemPrompt, userPrompt string) (string, error) {
	body, _ := json.Marshal(map[string]any{
		"model": openAIModel,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
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
		return "", fmt.Errorf("ai: unexpected openai response: %s", resp)
	}
	return out.Choices[0].Message.Content, nil
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
		return nil, fmt.Errorf("ai: provider returned %d: %s", resp.StatusCode, b)
	}
	return b, nil
}

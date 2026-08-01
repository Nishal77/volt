package gmailapi

import (
	"encoding/base64"
	"fmt"
	"regexp"
	"strings"

	"golang.org/x/net/html"
	"google.golang.org/api/gmail/v1"
)

func partHeader(part *gmail.MessagePart, name string) string {
	for _, h := range part.Headers {
		if strings.EqualFold(h.Name, name) {
			return h.Value
		}
	}
	return ""
}

// extractBody prefers text/plain; many marketing emails have no plain part
// at all, so it falls back to stripping text out of text/html rather than
// showing a blank body.
func extractBody(part *gmail.MessagePart) string {
	if plain := findPart(part, "text/plain"); plain != "" {
		return plain
	}
	if doc := findPart(part, "text/html"); doc != "" {
		return htmlToText(doc)
	}
	return ""
}

// extractBodyHTML returns the email's original HTML, for display — as
// opposed to extractBody's plain-text version, which is what AI prompts
// use. Inline images referenced by cid: (Content-ID, common in newsletter
// logos and signatures) are inlined as data URIs so they render without a
// second request; images the sender hosts on their own CDN are left as
// normal https:// URLs and load directly in the browser.
//
// ponytail: cid parts without inline body.Data (large inline images Gmail
// makes you fetch via a separate Attachments.Get call) are left
// unresolved — add an Attachments.Get round trip if that shows up.
func extractBodyHTML(part *gmail.MessagePart) string {
	doc := findPart(part, "text/html")
	if doc == "" {
		return ""
	}
	cids := collectCIDs(part)
	if len(cids) == 0 {
		return doc
	}
	return cidRefPattern.ReplaceAllStringFunc(doc, func(match string) string {
		id := cidRefPattern.FindStringSubmatch(match)[1]
		if dataURI, ok := cids[id]; ok {
			return `src="` + dataURI + `"`
		}
		return match
	})
}

var cidRefPattern = regexp.MustCompile(`src=["']cid:([^"']+)["']`)

func collectCIDs(part *gmail.MessagePart) map[string]string {
	out := map[string]string{}
	var walk func(p *gmail.MessagePart)
	walk = func(p *gmail.MessagePart) {
		if p == nil {
			return
		}
		cid := strings.Trim(partHeader(p, "Content-ID"), "<>")
		if cid != "" && p.Body != nil && p.Body.Data != "" && p.MimeType != "" {
			data, err := base64.URLEncoding.WithPadding(base64.NoPadding).DecodeString(p.Body.Data)
			if err == nil {
				out[cid] = fmt.Sprintf("data:%s;base64,%s", p.MimeType, base64.StdEncoding.EncodeToString(data))
			}
		}
		for _, child := range p.Parts {
			walk(child)
		}
	}
	walk(part)
	return out
}

func findPart(part *gmail.MessagePart, mimeType string) string {
	if part == nil {
		return ""
	}
	if part.MimeType == mimeType && part.Body != nil && part.Body.Data != "" {
		data, err := base64.URLEncoding.WithPadding(base64.NoPadding).DecodeString(part.Body.Data)
		if err != nil {
			return ""
		}
		return string(data)
	}
	for _, p := range part.Parts {
		if body := findPart(p, mimeType); body != "" {
			return body
		}
	}
	return ""
}

// htmlToText walks an HTML document and joins its visible text, skipping
// script/style content and inserting line breaks at block boundaries so
// the result reads like a plain-text email instead of one run-on line.
func htmlToText(doc string) string {
	tokenizer := html.NewTokenizer(strings.NewReader(doc))
	var b strings.Builder
	skipDepth := 0
	for {
		switch tokenizer.Next() {
		case html.ErrorToken:
			return strings.TrimSpace(b.String())
		case html.StartTagToken, html.SelfClosingTagToken:
			tok := tokenizer.Token()
			switch tok.Data {
			case "script", "style":
				skipDepth++
			case "br", "p", "div", "tr", "li":
				b.WriteString("\n")
			}
		case html.EndTagToken:
			if tok := tokenizer.Token(); (tok.Data == "script" || tok.Data == "style") && skipDepth > 0 {
				skipDepth--
			}
		case html.TextToken:
			if skipDepth == 0 {
				if text := strings.TrimSpace(tokenizer.Token().Data); text != "" {
					b.WriteString(text)
					b.WriteString(" ")
				}
			}
		}
	}
}

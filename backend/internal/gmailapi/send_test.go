package gmailapi

import (
	"encoding/base64"
	"mime"
	"mime/multipart"
	"net/mail"
	"strings"
	"testing"
)

func TestReplySubject(t *testing.T) {
	cases := map[string]string{
		"Hello":       "Re: Hello",
		"Re: Hello":   "Re: Hello",
		"re: hello":   "re: hello",
		"  Re: Hello": "  Re: Hello",
	}
	for in, want := range cases {
		if got := replySubject(in); got != want {
			t.Errorf("replySubject(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestBuildReplyRawPlainTextWhenNoAttachments(t *testing.T) {
	raw, err := buildReplyRaw("a@example.com", "Re: Hi", "<msg1>", "<msg1>", "hello", nil)
	if err != nil {
		t.Fatalf("buildReplyRaw: %v", err)
	}

	msg, err := mail.ReadMessage(strings.NewReader(string(raw)))
	if err != nil {
		t.Fatalf("not a valid RFC 822 message: %v", err)
	}
	if got := msg.Header.Get("To"); got != "a@example.com" {
		t.Errorf("To = %q", got)
	}
	if ct := msg.Header.Get("Content-Type"); !strings.HasPrefix(ct, "text/plain") {
		t.Errorf("Content-Type = %q, want text/plain", ct)
	}
	body, _ := readAll(msg)
	if body != "hello" {
		t.Errorf("body = %q, want %q", body, "hello")
	}
}

func TestBuildReplyRawMultipartWithAttachment(t *testing.T) {
	attachments := []OutgoingAttachment{
		{Filename: "notes.txt", MimeType: "text/plain", Data: []byte("attachment content")},
	}
	raw, err := buildReplyRaw("a@example.com", "Re: Hi", "<msg1>", "<msg1>", "hello", attachments)
	if err != nil {
		t.Fatalf("buildReplyRaw: %v", err)
	}

	msg, err := mail.ReadMessage(strings.NewReader(string(raw)))
	if err != nil {
		t.Fatalf("not a valid RFC 822 message: %v", err)
	}
	mediaType, params, err := mime.ParseMediaType(msg.Header.Get("Content-Type"))
	if err != nil || !strings.HasPrefix(mediaType, "multipart/") {
		t.Fatalf("Content-Type = %q (err %v), want multipart/*", msg.Header.Get("Content-Type"), err)
	}

	mr := multipart.NewReader(msg.Body, params["boundary"])
	var sawText, sawAttachment bool
	for {
		part, err := mr.NextPart()
		if err != nil {
			break
		}
		switch part.Header.Get("Content-Type") {
		case `text/plain; charset="UTF-8"`:
			sawText = true
		default:
			if part.FileName() == "notes.txt" {
				sawAttachment = true
				data, _ := decodeBase64Part(part)
				if data != "attachment content" {
					t.Errorf("attachment content = %q, want %q", data, "attachment content")
				}
			}
		}
	}
	if !sawText {
		t.Error("multipart message missing the text/plain body part")
	}
	if !sawAttachment {
		t.Error("multipart message missing the notes.txt attachment part")
	}
}

func readAll(msg *mail.Message) (string, error) {
	var b strings.Builder
	buf := make([]byte, 4096)
	for {
		n, err := msg.Body.Read(buf)
		b.Write(buf[:n])
		if err != nil {
			break
		}
	}
	return b.String(), nil
}

func decodeBase64Part(part *multipart.Part) (string, error) {
	var b strings.Builder
	buf := make([]byte, 4096)
	for {
		n, err := part.Read(buf)
		b.Write(buf[:n])
		if err != nil {
			break
		}
	}
	decoded, err := base64.StdEncoding.DecodeString(b.String())
	return string(decoded), err
}

package api

import (
	"reflect"
	"testing"

	"github.com/Nishal77/volt/backend/internal/gmailapi"
)

func TestFilterByThreadIDPreservesAIOrderAndDropsUnknown(t *testing.T) {
	messages := []gmailapi.MessageSummary{
		{ThreadID: "a", Subject: "A"},
		{ThreadID: "b", Subject: "B"},
		{ThreadID: "c", Subject: "C"},
	}

	got := filterByThreadID(messages, []string{"c", "a", "missing"})

	want := []gmailapi.MessageSummary{
		{ThreadID: "c", Subject: "C"},
		{ThreadID: "a", Subject: "A"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %+v, want %+v", got, want)
	}
}

package search

import (
	"context"
	"testing"
	"time"
)

func TestCleanHTMLText(t *testing.T) {
	input := "<b>Amul</b> &amp; <i>Nandini</i> Milk &#x27;Prices&#x27;"
	expected := "Amul & Nandini Milk 'Prices'"
	got := cleanHTMLText(input)
	if got != expected {
		t.Errorf("cleanHTMLText() = %q, want %q", got, expected)
	}
}

func TestSearchWebEmptyQuery(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	results, err := SearchWeb(ctx, "", 5)
	if err != nil {
		t.Fatalf("expected no error for empty query, got: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 results for empty query, got %d", len(results))
	}
}

func TestSearchWebLive(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	results, err := SearchWeb(ctx, "Amul milk Bangalore price", 3)
	if err != nil {
		t.Logf("SearchWeb live network note (skipped if offline): %v", err)
		return
	}

	if len(results) > 0 {
		for _, s := range results {
			if s.URL == "" {
				t.Errorf("source URL should not be empty: %+v", s)
			}
			if s.Domain == "" {
				t.Errorf("source Domain should not be empty: %+v", s)
			}
			if s.Title == "" {
				t.Errorf("source Title should not be empty: %+v", s)
			}
		}
	}
}

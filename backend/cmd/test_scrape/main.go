package main

import (
	"comparex/scraper"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"
)

func main() {
	query := "eggs"
	if len(os.Args) > 1 {
		query = os.Args[1]
	}

	log.Printf("🔍 Testing scraper for query: '%s'\n", query)

	svc := scraper.NewService("localhost:6379")

	start := time.Now()
	result, err := svc.Compare(context.Background(), query, 12.97, 77.59, nil)
	elapsed := time.Since(start)

	if err != nil {
		log.Fatalf("❌ Compare failed: %v", err)
	}

	data, _ := json.MarshalIndent(result, "", "  ")
	fmt.Printf("\n📊 Results for '%s' (took %.1fs):\n%s\n", query, elapsed.Seconds(), string(data))

	// Summary
	fmt.Printf("\n📋 Summary:\n")
	for _, p := range result.Products {
		fmt.Printf("  Product: %s (Best: ₹%.0f)\n", p.Name, p.BestPrice)
		for _, l := range p.Listings {
			status := "✅"
			if !l.InStock {
				status = "❌"
			}
			fmt.Printf("    %s %-12s ₹%.0f  %s\n", status, l.Platform, l.Price, l.DeliveryTime)
		}
	}
}

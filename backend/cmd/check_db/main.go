package main

import (
	"comparez/database"
	"fmt"
)

func main() {
	database.Connect()
	if database.DB != nil {
		fmt.Println("SUCCESS: Neon Database is connected!")
	} else {
		fmt.Println("FAILURE: Neon Database is NOT connected.")
	}
}

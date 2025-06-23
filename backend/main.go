package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"forum/middleware"
	"forum/routes"
	"forum/sqlite"
)

func main() {
	// Validate CLI args
	if len(os.Args) > 2 {
		fmt.Println("Usage:\n\n$ go run .\n\nor\n\n$ go run . 'port no'\n\nwhere port no; is a four digit integer greater than 1023 and not equal to 3306/3389")
		return
	}
	port := ":8080"
	if len(os.Args) == 2 {
		p, er := strconv.Atoi(os.Args[1])
		if er != nil || !(p > 1023 && p < 65536 && p != 3306 && p != 3389) {
			fmt.Println("Usage:\n\n$ go run .\n\nor\n\n$ go run . 'port no'\n\nwhere port no; is a four digit integer greater than 1023 and not equal to 3306/3389")
			return
		}
		port = ":" + os.Args[1]
	}

	// Initialize the database
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "forum.db" // fallback default
	}
	err := sqlite.InitializeDatabase(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer sqlite.CloseDatabase()

	// Set up routes and CORS
	mux := routes.SetupRoutes(sqlite.DB)
	handler := middleware.CORS(mux)

	// Start daily session cleanup in background
	go scheduleDailyCleanup()

	// Start server
	fmt.Printf("🚀 [%s] Server is running at http://localhost%s\n", time.Now().Format(time.RFC3339), port)
	log.Fatal(http.ListenAndServe(port, handler))
}

// scheduleDailyCleanup runs session cleanup at midnight every day
func scheduleDailyCleanup() {
	for {
		now := time.Now()
		nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
		sleepDuration := time.Until(nextMidnight)

		fmt.Println("🕛 Session cleanup scheduled for midnight...")
		for remaining := sleepDuration; remaining > 0; remaining -= time.Minute {
			hours := int(remaining.Hours())
			minutes := int(remaining.Minutes()) % 60
			fmt.Printf("\r⏳ Time until cleanup: %02d h %02d min", hours, minutes)
			time.Sleep(1 * time.Minute)
		}

		fmt.Println("\n🚀 Running session cleanup...")
		if err := sqlite.CleanupSessions(sqlite.DB, 24); err != nil {
			fmt.Printf("❌ [%s] Session cleanup failed: %v\n", time.Now().Format(time.RFC3339), err)
		} else {
			fmt.Println("✅ Expired sessions cleaned up successfully at midnight.")
		}
	}
}

package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"forum/models"
	"forum/sqlite"

	_ "github.com/mattn/go-sqlite3"
)

func setupPostTestDB(t *testing.T) *sql.DB {
	// Use in-memory database for testing
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}

	// Enable foreign keys
	_, err = db.Exec("PRAGMA foreign_keys = ON")
	if err != nil {
		t.Fatalf("Failed to enable foreign keys: %v", err)
	}

	// Create test schema
	schema := `
	CREATE TABLE users (
		id TEXT PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		avatar_url TEXT DEFAULT '/static/default-avatar.png',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE categories (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT UNIQUE NOT NULL
	);

	CREATE TABLE posts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		title TEXT NOT NULL,
		content TEXT NOT NULL,
		image_url TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);

	CREATE TABLE post_categories (
		post_id INTEGER NOT NULL,
		category_id INTEGER NOT NULL,
		PRIMARY KEY (post_id, category_id),
		FOREIGN KEY (post_id) REFERENCES posts(id),
		FOREIGN KEY (category_id) REFERENCES categories(id)
	);

	CREATE TABLE likes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		post_id INTEGER,
		comment_id INTEGER,
		type TEXT NOT NULL DEFAULT 'like',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id),
		FOREIGN KEY (post_id) REFERENCES posts(id)
	);

	CREATE TABLE sessions (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);
	`

	_, err = db.Exec(schema)
	if err != nil {
		t.Fatalf("Failed to create test schema: %v", err)
	}

	return db
}

func TestGetLikedPosts(t *testing.T) {
	db := setupPostTestDB(t)
	defer db.Close()

	// Create test user
	err := sqlite.CreateUser(db, "testuser", "test@example.com", "password", "/static/avatar.png")
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Get the created user to get the actual user ID
	user, err := sqlite.GetUserByUsername(db, "testuser")
	if err != nil {
		t.Fatalf("Failed to get created user: %v", err)
	}
	userID := user.ID

	// Create a test post
	post, err := sqlite.CreatePost(db, userID, []int{}, "Test Post", "This is a test post", "")
	if err != nil {
		t.Fatalf("Failed to create test post: %v", err)
	}

	// Create a like for the post using ToggleLike
	err = sqlite.ToggleLike(db, userID, &post.ID, nil, "like")
	if err != nil {
		t.Fatalf("Failed to create like: %v", err)
	}

	// Create session for the user
	sessionID, err := sqlite.CreateSession(db, userID)
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}

	t.Run("successful retrieval of liked posts", func(t *testing.T) {
		req, err := http.NewRequest("GET", "/api/posts/liked", nil)
		if err != nil {
			t.Fatal(err)
		}

		// Add session cookie
		req.AddCookie(&http.Cookie{
			Name:  "session_id",
			Value: sessionID,
		})

		rr := httptest.NewRecorder()
		GetLikedPosts(db, rr, req)

		if status := rr.Code; status != http.StatusOK {
			t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}

		var posts []models.Post
		err = json.Unmarshal(rr.Body.Bytes(), &posts)
		if err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		if len(posts) != 1 {
			t.Errorf("Expected 1 liked post, got %d", len(posts))
		}

		if len(posts) > 0 && posts[0].ID != post.ID {
			t.Errorf("Expected post ID %d, got %d", post.ID, posts[0].ID)
		}
	})

	t.Run("unauthorized access", func(t *testing.T) {
		req, err := http.NewRequest("GET", "/api/posts/liked", nil)
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		GetLikedPosts(db, rr, req)

		if status := rr.Code; status != http.StatusUnauthorized {
			t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusUnauthorized)
		}
	})

	t.Run("method not allowed", func(t *testing.T) {
		req, err := http.NewRequest("POST", "/api/posts/liked", nil)
		if err != nil {
			t.Fatal(err)
		}

		// Add session cookie
		req.AddCookie(&http.Cookie{
			Name:  "session_id",
			Value: sessionID,
		})

		rr := httptest.NewRecorder()
		GetLikedPosts(db, rr, req)

		if status := rr.Code; status != http.StatusMethodNotAllowed {
			t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusMethodNotAllowed)
		}
	})
}

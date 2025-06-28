package sqlite

import (
	"database/sql"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// setupTestDB creates an in-memory SQLite database for testing
func setupTestDB(t *testing.T) *sql.DB {
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
		name TEXT UNIQUE NOT NULL,
		description TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
		FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
		FOREIGN KEY (category_id) REFERENCES categories(id)
	);

	CREATE TABLE comments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		post_id INTEGER NOT NULL,
		content TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id),
		FOREIGN KEY (post_id) REFERENCES posts(id)
	);

	CREATE TABLE sessions (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);

	CREATE TABLE likes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		post_id INTEGER,
		comment_id INTEGER,
		is_like BOOLEAN NOT NULL DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id),
		FOREIGN KEY (post_id) REFERENCES posts(id),
		FOREIGN KEY (comment_id) REFERENCES comments(id)
	);
	`

	_, err = db.Exec(schema)
	if err != nil {
		t.Fatalf("Failed to create test schema: %v", err)
	}

	return db
}

func TestGetUserByUsername(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Insert test user
	userID := "test-user-123"
	username := "testuser"
	email := "test@example.com"
	passwordHash := "hashedpassword"
	avatarURL := "/static/avatar.png"

	_, err := db.Exec(`
		INSERT INTO users (id, username, email, password_hash, avatar_url)
		VALUES (?, ?, ?, ?, ?)
	`, userID, username, email, passwordHash, avatarURL)
	if err != nil {
		t.Fatalf("Failed to insert test user: %v", err)
	}

	t.Run("existing user", func(t *testing.T) {
		user, err := GetUserByUsername(db, username)
		if err != nil {
			t.Fatalf("GetUserByUsername failed: %v", err)
		}

		if user.ID != userID {
			t.Fatalf("Expected ID %s, got %s", userID, user.ID)
		}
		if user.Username != username {
			t.Fatalf("Expected username %s, got %s", username, user.Username)
		}
		if user.Email != email {
			t.Fatalf("Expected email %s, got %s", email, user.Email)
		}
		if user.PasswordHash != passwordHash {
			t.Fatalf("Expected password hash %s, got %s", passwordHash, user.PasswordHash)
		}
	})

	t.Run("non-existing user", func(t *testing.T) {
		_, err := GetUserByUsername(db, "nonexistent")
		if err == nil {
			t.Fatal("Expected error for non-existing user")
		}
		if err != sql.ErrNoRows {
			t.Fatalf("Expected sql.ErrNoRows, got %v", err)
		}
	})
}

func TestCreateUser(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	t.Run("successful user creation", func(t *testing.T) {
		username := "newuser"
		email := "new@example.com"
		passwordHash := "hashedpassword123"
		avatarURL := "/static/new-avatar.png"

		err := CreateUser(db, username, email, passwordHash, avatarURL)
		if err != nil {
			t.Fatalf("CreateUser failed: %v", err)
		}

		// Verify user was created
		user, err := GetUserByUsername(db, username)
		if err != nil {
			t.Fatalf("Failed to retrieve created user: %v", err)
		}

		if user.Username != username {
			t.Fatalf("Expected username %s, got %s", username, user.Username)
		}
		if user.Email != email {
			t.Fatalf("Expected email %s, got %s", email, user.Email)
		}
	})

	t.Run("duplicate username", func(t *testing.T) {
		username := "duplicateuser"
		email1 := "user1@example.com"
		email2 := "user2@example.com"
		passwordHash := "hashedpassword"
		avatarURL := "/static/avatar.png"

		// Create first user
		err := CreateUser(db, username, email1, passwordHash, avatarURL)
		if err != nil {
			t.Fatalf("First CreateUser failed: %v", err)
		}

		// Try to create second user with same username
		err = CreateUser(db, username, email2, passwordHash, avatarURL)
		if err == nil {
			t.Fatal("Expected error for duplicate username")
		}
	})
}

func TestCreatePost(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Create test user
	err := CreateUser(db, "testuser", "test@example.com", "password", "/static/avatar.png")
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Get the created user to get the actual user ID
	user, err := GetUserByUsername(db, "testuser")
	if err != nil {
		t.Fatalf("Failed to get created user: %v", err)
	}
	userID := user.ID

	// Create test categories
	_, err = db.Exec("INSERT INTO categories (name) VALUES (?)", "Technology")
	if err != nil {
		t.Fatalf("Failed to create test category: %v", err)
	}

	t.Run("successful post creation", func(t *testing.T) {
		categoryIDs := []int{1}
		title := "Test Post Title"
		content := "This is test post content"
		imageURL := "/static/post-image.jpg"

		post, err := CreatePost(db, userID, categoryIDs, title, content, imageURL)
		if err != nil {
			t.Fatalf("CreatePost failed: %v", err)
		}

		if post.Title != title {
			t.Fatalf("Expected title %s, got %s", title, post.Title)
		}
		if post.Content != content {
			t.Fatalf("Expected content %s, got %s", content, post.Content)
		}
		if post.UserID != userID {
			t.Fatalf("Expected user ID %s, got %s", userID, post.UserID)
		}
		if len(post.CategoryIDs) != 1 || post.CategoryIDs[0] != 1 {
			t.Fatalf("Expected category IDs [1], got %v", post.CategoryIDs)
		}
	})

	t.Run("post with invalid user", func(t *testing.T) {
		categoryIDs := []int{1}
		title := "Test Post"
		content := "Content"
		imageURL := ""

		_, err := CreatePost(db, "invalid-user-id", categoryIDs, title, content, imageURL)
		if err == nil {
			t.Fatal("Expected error for invalid user ID")
		}
	})
}

func TestGetPost(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Setup test data
	err := CreateUser(db, "testuser", "test@example.com", "password", "/static/avatar.png")
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Get the created user to get the actual user ID
	user, err := GetUserByUsername(db, "testuser")
	if err != nil {
		t.Fatalf("Failed to get created user: %v", err)
	}
	userID := user.ID

	_, err = db.Exec("INSERT INTO categories (name) VALUES (?)", "Technology")
	if err != nil {
		t.Fatalf("Failed to create test category: %v", err)
	}

	categoryIDs := []int{1}
	title := "Test Post"
	content := "Test content"
	imageURL := "/static/image.jpg"

	createdPost, err := CreatePost(db, userID, categoryIDs, title, content, imageURL)
	if err != nil {
		t.Fatalf("Failed to create test post: %v", err)
	}

	t.Run("existing post", func(t *testing.T) {
		post, err := GetPost(db, createdPost.ID)
		if err != nil {
			t.Fatalf("GetPost failed: %v", err)
		}

		if post.ID != createdPost.ID {
			t.Fatalf("Expected ID %d, got %d", createdPost.ID, post.ID)
		}
		if post.Title != title {
			t.Fatalf("Expected title %s, got %s", title, post.Title)
		}
	})

	t.Run("non-existing post", func(t *testing.T) {
		_, err := GetPost(db, 99999)
		if err == nil {
			t.Fatal("Expected error for non-existing post")
		}
	})
}

func TestCreateSession(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Create test user
	err := CreateUser(db, "testuser", "test@example.com", "password", "/static/avatar.png")
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Get the created user to get the actual user ID
	user, err := GetUserByUsername(db, "testuser")
	if err != nil {
		t.Fatalf("Failed to get created user: %v", err)
	}
	userID := user.ID

	t.Run("successful session creation", func(t *testing.T) {
		sessionID, err := CreateSession(db, userID)
		if err != nil {
			t.Fatalf("CreateSession failed: %v", err)
		}

		if sessionID == "" {
			t.Fatal("Session ID should not be empty")
		}

		// Verify session was created
		var storedUserID string
		err = db.QueryRow("SELECT user_id FROM sessions WHERE id = ?", sessionID).Scan(&storedUserID)
		if err != nil {
			t.Fatalf("Failed to retrieve session: %v", err)
		}

		if storedUserID != userID {
			t.Fatalf("Expected user ID %s, got %s", userID, storedUserID)
		}
	})

	t.Run("session with invalid user", func(t *testing.T) {
		_, err := CreateSession(db, "invalid-user-id")
		if err == nil {
			t.Fatal("Expected error for invalid user ID")
		}
	})
}

func TestGetUserIDFromSession(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Create test user and session
	err := CreateUser(db, "testuser", "test@example.com", "password", "/static/avatar.png")
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Get the created user to get the actual user ID
	user, err := GetUserByUsername(db, "testuser")
	if err != nil {
		t.Fatalf("Failed to get created user: %v", err)
	}
	userID := user.ID

	sessionID, err := CreateSession(db, userID)
	if err != nil {
		t.Fatalf("Failed to create test session: %v", err)
	}

	t.Run("valid session", func(t *testing.T) {
		retrievedUserID, err := GetUserIDFromSession(db, sessionID)
		if err != nil {
			t.Fatalf("GetUserIDFromSession failed: %v", err)
		}

		if retrievedUserID != userID {
			t.Fatalf("Expected user ID %s, got %s", userID, retrievedUserID)
		}
	})

	t.Run("invalid session", func(t *testing.T) {
		userID, err := GetUserIDFromSession(db, "invalid-session-id")
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}
		if userID != "" {
			t.Fatal("Expected empty user ID for invalid session")
		}
	})
}

func TestCleanupSessions(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Create test user
	err := CreateUser(db, "testuser", "test@example.com", "password", "/static/avatar.png")
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Get the created user to get the actual user ID
	user, err := GetUserByUsername(db, "testuser")
	if err != nil {
		t.Fatalf("Failed to get created user: %v", err)
	}
	userID := user.ID

	// Create an old session (simulate expired session)
	oldSessionID := "old-session-123"
	oldTime := time.Now().Add(-25 * time.Hour) // 25 hours ago
	_, err = db.Exec("INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)",
		oldSessionID, userID, oldTime)
	if err != nil {
		t.Fatalf("Failed to create old session: %v", err)
	}

	// Create a recent session (should not be cleaned up)
	recentSessionID, err := CreateSession(db, userID)
	if err != nil {
		t.Fatalf("Failed to create recent session: %v", err)
	}

	t.Run("cleanup expired sessions", func(t *testing.T) {
		err := CleanupSessions(db, 24) // Sessions older than 24 hours
		if err != nil {
			t.Fatalf("CleanupSessions failed: %v", err)
		}

		// Check that old session was deleted
		var count int
		err = db.QueryRow("SELECT COUNT(*) FROM sessions WHERE id = ?", oldSessionID).Scan(&count)
		if err != nil {
			t.Fatalf("Failed to check old session: %v", err)
		}
		if count != 0 {
			t.Fatal("Old session should have been deleted")
		}

		// Check that recent session still exists
		err = db.QueryRow("SELECT COUNT(*) FROM sessions WHERE id = ?", recentSessionID).Scan(&count)
		if err != nil {
			t.Fatalf("Failed to check recent session: %v", err)
		}
		if count != 1 {
			t.Fatal("Recent session should still exist")
		}
	})
}

func TestGetCategories(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Insert test categories
	categories := []string{"Technology", "Sports", "Music"}
	for _, name := range categories {
		_, err := db.Exec("INSERT INTO categories (name) VALUES (?)", name)
		if err != nil {
			t.Fatalf("Failed to insert category %s: %v", name, err)
		}
	}

	t.Run("get all categories", func(t *testing.T) {
		result, err := GetCategories(db)
		if err != nil {
			t.Fatalf("GetCategories failed: %v", err)
		}

		if len(result) != len(categories) {
			t.Fatalf("Expected %d categories, got %d", len(categories), len(result))
		}

		// Check that all category names are present
		categoryNames := make(map[string]bool)
		for _, cat := range result {
			categoryNames[cat.Name] = true
		}

		for _, expectedName := range categories {
			if !categoryNames[expectedName] {
				t.Fatalf("Expected category %s not found", expectedName)
			}
		}
	})
}

func TestDatabaseIntegration(t *testing.T) {
	t.Run("complete user workflow", func(t *testing.T) {
		db := setupTestDB(t)
		defer db.Close()

		// Create user
		username := "integrationuser"
		email := "integration@example.com"
		passwordHash := "hashedpassword"
		avatarURL := "/static/avatar.png"

		err := CreateUser(db, username, email, passwordHash, avatarURL)
		if err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}

		// Get user
		user, err := GetUserByUsername(db, username)
		if err != nil {
			t.Fatalf("Failed to get user: %v", err)
		}

		// Create session
		sessionID, err := CreateSession(db, user.ID)
		if err != nil {
			t.Fatalf("Failed to create session: %v", err)
		}

		// Verify session
		retrievedUserID, err := GetUserIDFromSession(db, sessionID)
		if err != nil {
			t.Fatalf("Failed to get user ID from session: %v", err)
		}

		if retrievedUserID != user.ID {
			t.Fatalf("Session user ID mismatch: expected %s, got %s", user.ID, retrievedUserID)
		}

		// Create category and post
		_, err = db.Exec("INSERT INTO categories (name) VALUES (?)", "Integration Test")
		if err != nil {
			t.Fatalf("Failed to create category: %v", err)
		}

		post, err := CreatePost(db, user.ID, []int{1}, "Integration Post", "Test content", "")
		if err != nil {
			t.Fatalf("Failed to create post: %v", err)
		}

		// Retrieve post
		retrievedPost, err := GetPost(db, post.ID)
		if err != nil {
			t.Fatalf("Failed to get post: %v", err)
		}

		if retrievedPost.Title != "Integration Post" {
			t.Fatalf("Post title mismatch: expected 'Integration Post', got '%s'", retrievedPost.Title)
		}
	})
}

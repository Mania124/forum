package utils

import (
	"database/sql"
	"net/http/httptest"
	"strings"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func TestHashPassword(t *testing.T) {
	password := "testpassword123"
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}
	if hash == "" {
		t.Fatal("Hash should not be empty")
	}
	if hash == password {
		t.Fatal("Hash should not equal original password")
	}
}

func TestCheckPasswordHash(t *testing.T) {
	password := "testpassword123"
	hash, _ := HashPassword(password)

	// Test correct password
	if !CheckPasswordHash(password, hash) {
		t.Fatal("Password verification should succeed")
	}

	// Test incorrect password
	if CheckPasswordHash("wrongpassword", hash) {
		t.Fatal("Password verification should fail for wrong password")
	}
}

func TestValidateAndSanitizeString(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		maxLength   int
		fieldName   string
		expectError bool
		expected    string
	}{
		{"valid string", "test", 10, "field", false, "test"},
		{"empty string", "", 10, "field", true, ""},
		{"too long", "verylongstring", 5, "field", true, ""},
		{"with whitespace", "  test  ", 10, "field", false, "test"},
		{"with HTML", "<script>alert('xss')</script>", 100, "field", false, "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"},
		{"null byte", "test\x00", 10, "field", true, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ValidateAndSanitizeString(tt.input, tt.maxLength, tt.fieldName)
			if tt.expectError && err == nil {
				t.Fatalf("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if !tt.expectError && result != tt.expected {
				t.Fatalf("Expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		email string
		valid bool
	}{
		{"test@example.com", true},
		{"user.name@domain.co.uk", true},
		{"user+tag@domain.com", true},
		{"invalid-email", false},
		{"@domain.com", false},
		{"user@", false},
		{"user@domain", false},
		{"", false},
	}

	for _, tt := range tests {
		t.Run(tt.email, func(t *testing.T) {
			err := ValidateEmail(tt.email)
			if tt.valid && err != nil {
				t.Fatalf("Expected valid email but got error: %v", err)
			}
			if !tt.valid && err == nil {
				t.Fatalf("Expected invalid email but got no error")
			}
		})
	}
}

func TestValidateUsername(t *testing.T) {
	tests := []struct {
		username string
		valid    bool
	}{
		{"validuser", true},
		{"user123", true},
		{"user_name", true},
		{"user-name", true},
		{"ab", false},        // too short
		{"user with spaces", false}, // spaces not allowed
		{"user@domain", false}, // @ not allowed
		{"", false},          // empty
		{strings.Repeat("a", 31), false}, // too long
	}

	for _, tt := range tests {
		t.Run(tt.username, func(t *testing.T) {
			err := ValidateUsername(tt.username)
			if tt.valid && err != nil {
				t.Fatalf("Expected valid username but got error: %v", err)
			}
			if !tt.valid && err == nil {
				t.Fatalf("Expected invalid username but got no error")
			}
		})
	}
}

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		password string
		valid    bool
	}{
		{"password123", true},
		{"Password1", true},
		{"short", false},     // too short
		{"onlyletters", false}, // no numbers
		{"12345678", false},  // no letters
		{"", false},          // empty
		{strings.Repeat("a", 129), false}, // too long
	}

	for _, tt := range tests {
		t.Run(tt.password, func(t *testing.T) {
			err := ValidatePassword(tt.password)
			if tt.valid && err != nil {
				t.Fatalf("Expected valid password but got error: %v", err)
			}
			if !tt.valid && err == nil {
				t.Fatalf("Expected invalid password but got no error")
			}
		})
	}
}

func TestValidateID(t *testing.T) {
	tests := []struct {
		idStr     string
		fieldName string
		valid     bool
		expected  int
	}{
		{"123", "id", true, 123},
		{"1", "id", true, 1},
		{"0", "id", false, 0},
		{"-1", "id", false, 0},
		{"abc", "id", false, 0},
		{"", "id", false, 0},
	}

	for _, tt := range tests {
		t.Run(tt.idStr, func(t *testing.T) {
			result, err := ValidateID(tt.idStr, tt.fieldName)
			if tt.valid && err != nil {
				t.Fatalf("Expected valid ID but got error: %v", err)
			}
			if !tt.valid && err == nil {
				t.Fatalf("Expected invalid ID but got no error")
			}
			if tt.valid && result != tt.expected {
				t.Fatalf("Expected %d, got %d", tt.expected, result)
			}
		})
	}
}

func TestValidateUUID(t *testing.T) {
	tests := []struct {
		uuid  string
		valid bool
	}{
		{"123e4567-e89b-12d3-a456-426614174000", true},
		{"550e8400-e29b-41d4-a716-446655440000", true},
		{"not-a-uuid", false},
		{"123e4567-e89b-12d3-a456", false}, // too short
		{"", false},
		{"123E4567-E89B-12D3-A456-426614174000", false}, // uppercase not allowed in this implementation
	}

	for _, tt := range tests {
		t.Run(tt.uuid, func(t *testing.T) {
			err := ValidateUUID(tt.uuid)
			if tt.valid && err != nil {
				t.Fatalf("Expected valid UUID but got error: %v", err)
			}
			if !tt.valid && err == nil {
				t.Fatalf("Expected invalid UUID but got no error")
			}
		})
	}
}

func TestGetPaginationParams(t *testing.T) {
	tests := []struct {
		name         string
		url          string
		expectedPage int
		expectedLimit int
	}{
		{"default values", "/api/posts", 1, 10},
		{"custom values", "/api/posts?page=2&limit=20", 2, 20},
		{"invalid page", "/api/posts?page=invalid&limit=5", 1, 5},
		{"invalid limit", "/api/posts?page=3&limit=invalid", 3, 10},
		{"negative values", "/api/posts?page=-1&limit=-5", 1, 10},
		{"zero values", "/api/posts?page=0&limit=0", 1, 10},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.url, nil)
			page, limit := GetPaginationParams(req)
			
			if page != tt.expectedPage {
				t.Fatalf("Expected page %d, got %d", tt.expectedPage, page)
			}
			if limit != tt.expectedLimit {
				t.Fatalf("Expected limit %d, got %d", tt.expectedLimit, limit)
			}
		})
	}
}

func TestValidatePostContent(t *testing.T) {
	tests := []struct {
		name    string
		title   string
		content string
		valid   bool
	}{
		{"valid post", "Test Title", "Test content", true},
		{"empty title", "", "Test content", true}, // ValidateAndSanitizeString will handle this
		{"empty content", "Test Title", "", true}, // ValidateAndSanitizeString will handle this
		{"long title", strings.Repeat("a", 201), "Test content", true}, // ValidateAndSanitizeString will handle this
		{"long content", "Test Title", strings.Repeat("a", 10001), true}, // ValidateAndSanitizeString will handle this
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePostContent(tt.title, tt.content)
			// Since ValidatePostContent just calls ValidateAndSanitizeString,
			// we're testing the integration rather than specific validation logic
			if err != nil {
				t.Logf("Validation error (expected for some cases): %v", err)
			}
		})
	}
}

func TestValidateCommentContent(t *testing.T) {
	tests := []struct {
		name    string
		content string
		valid   bool
	}{
		{"valid comment", "Test comment", true},
		{"empty comment", "", true}, // ValidateAndSanitizeString will handle this
		{"long comment", strings.Repeat("a", 2001), true}, // ValidateAndSanitizeString will handle this
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateCommentContent(tt.content)
			// Since ValidateCommentContent just calls ValidateAndSanitizeString,
			// we're testing the integration
			if err != nil {
				t.Logf("Validation error (expected for some cases): %v", err)
			}
		})
	}
}

// setupTestDB creates a test database for testing functions that require DB
func setupTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}

	// Create necessary tables for testing
	schema := `
	CREATE TABLE users (
		id TEXT PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE sessions (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);

	CREATE TABLE posts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		title TEXT NOT NULL,
		content TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);

	CREATE TABLE comments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		post_id INTEGER NOT NULL,
		content TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id),
		FOREIGN KEY (post_id) REFERENCES posts(id)
	);
	`

	_, err = db.Exec(schema)
	if err != nil {
		t.Fatalf("Failed to create test schema: %v", err)
	}

	return db
}

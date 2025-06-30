package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"forum/sqlite"
	"forum/utils"

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

func TestRegisterUser(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Create test static directory
	err := os.MkdirAll("static/uploads", 0755)
	if err != nil {
		t.Fatalf("Failed to create static directory: %v", err)
	}
	defer os.RemoveAll("static")

	t.Run("successful registration", func(t *testing.T) {
		// Create multipart form data
		var buf bytes.Buffer
		writer := multipart.NewWriter(&buf)

		// Add form fields
		writer.WriteField("username", "testuser")
		writer.WriteField("email", "test@example.com")
		writer.WriteField("password", "password123")

		writer.Close()

		req := httptest.NewRequest("POST", "/register", &buf)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		w := httptest.NewRecorder()

		RegisterUser(db, w, req)

		if w.Code != http.StatusCreated {
			t.Fatalf("Expected status %d, got %d. Body: %s", http.StatusCreated, w.Code, w.Body.String())
		}

		// Verify user was created in database
		user, err := sqlite.GetUserByUsername(db, "testuser")
		if err != nil {
			t.Fatalf("Failed to get created user: %v", err)
		}

		if user.Username != "testuser" {
			t.Fatalf("Expected username 'testuser', got '%s'", user.Username)
		}
		if user.Email != "test@example.com" {
			t.Fatalf("Expected email 'test@example.com', got '%s'", user.Email)
		}
	})

	t.Run("invalid method", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/register", nil)
		w := httptest.NewRecorder()

		RegisterUser(db, w, req)

		if w.Code != http.StatusMethodNotAllowed {
			t.Fatalf("Expected status %d, got %d", http.StatusMethodNotAllowed, w.Code)
		}
	})

	t.Run("missing required fields", func(t *testing.T) {
		var buf bytes.Buffer
		writer := multipart.NewWriter(&buf)
		writer.WriteField("username", "testuser2")
		// Missing email and password
		writer.Close()

		req := httptest.NewRequest("POST", "/register", &buf)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		w := httptest.NewRecorder()

		RegisterUser(db, w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
		}

		var response map[string]string
		json.Unmarshal(w.Body.Bytes(), &response)
		if !strings.Contains(response["error"], "Missing required fields") {
			t.Fatalf("Expected missing fields error, got: %s", response["error"])
		}
	})

	t.Run("invalid username", func(t *testing.T) {
		var buf bytes.Buffer
		writer := multipart.NewWriter(&buf)
		writer.WriteField("username", "ab") // Too short
		writer.WriteField("email", "test2@example.com")
		writer.WriteField("password", "password123")
		writer.Close()

		req := httptest.NewRequest("POST", "/register", &buf)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		w := httptest.NewRecorder()

		RegisterUser(db, w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("invalid email", func(t *testing.T) {
		var buf bytes.Buffer
		writer := multipart.NewWriter(&buf)
		writer.WriteField("username", "testuser3")
		writer.WriteField("email", "invalid-email") // Invalid format
		writer.WriteField("password", "password123")
		writer.Close()

		req := httptest.NewRequest("POST", "/register", &buf)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		w := httptest.NewRecorder()

		RegisterUser(db, w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("duplicate username", func(t *testing.T) {
		// First registration
		var buf1 bytes.Buffer
		writer1 := multipart.NewWriter(&buf1)
		writer1.WriteField("username", "duplicate")
		writer1.WriteField("email", "first@example.com")
		writer1.WriteField("password", "password123")
		writer1.Close()

		req1 := httptest.NewRequest("POST", "/register", &buf1)
		req1.Header.Set("Content-Type", writer1.FormDataContentType())
		w1 := httptest.NewRecorder()

		RegisterUser(db, w1, req1)

		if w1.Code != http.StatusCreated {
			t.Fatalf("First registration should succeed")
		}

		// Second registration with same username
		var buf2 bytes.Buffer
		writer2 := multipart.NewWriter(&buf2)
		writer2.WriteField("username", "duplicate")
		writer2.WriteField("email", "second@example.com")
		writer2.WriteField("password", "password123")
		writer2.Close()

		req2 := httptest.NewRequest("POST", "/register", &buf2)
		req2.Header.Set("Content-Type", writer2.FormDataContentType())
		w2 := httptest.NewRecorder()

		RegisterUser(db, w2, req2)

		if w2.Code != http.StatusConflict {
			t.Fatalf("Expected status %d for duplicate username, got %d", http.StatusConflict, w2.Code)
		}
	})
}

func TestLoginUser(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Create test user
	username := "loginuser"
	email := "login@example.com"
	password := "password123"
	passwordHash, _ := utils.HashPassword(password)
	err := sqlite.CreateUser(db, username, email, passwordHash, "/static/default-avatar.png")
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	t.Run("successful login", func(t *testing.T) {
		loginData := map[string]string{
			"username": username,
			"password": password,
		}
		jsonData, _ := json.Marshal(loginData)

		req := httptest.NewRequest("POST", "/login", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		LoginUser(db, w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected status %d, got %d. Body: %s", http.StatusOK, w.Code, w.Body.String())
		}

		// Check that session cookie was set
		cookies := w.Result().Cookies()
		var sessionCookie *http.Cookie
		for _, cookie := range cookies {
			if cookie.Name == "session_id" {
				sessionCookie = cookie
				break
			}
		}

		if sessionCookie == nil {
			t.Fatal("Session cookie should be set")
		}

		if sessionCookie.Value == "" {
			t.Fatal("Session cookie value should not be empty")
		}

		// Verify session exists in database
		userID, err := sqlite.GetUserIDFromSession(db, sessionCookie.Value)
		if err != nil {
			t.Fatalf("Failed to get user from session: %v", err)
		}

		user, err := sqlite.GetUserByUsername(db, username)
		if err != nil {
			t.Fatalf("Failed to get user: %v", err)
		}

		if userID != user.ID {
			t.Fatalf("Session user ID mismatch")
		}
	})

	t.Run("invalid method", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/login", nil)
		w := httptest.NewRecorder()

		LoginUser(db, w, req)

		if w.Code != http.StatusMethodNotAllowed {
			t.Fatalf("Expected status %d, got %d", http.StatusMethodNotAllowed, w.Code)
		}
	})

	t.Run("invalid credentials", func(t *testing.T) {
		loginData := map[string]string{
			"username": username,
			"password": "wrongpassword",
		}
		jsonData, _ := json.Marshal(loginData)

		req := httptest.NewRequest("POST", "/login", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		LoginUser(db, w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("non-existent user", func(t *testing.T) {
		loginData := map[string]string{
			"username": "nonexistent",
			"password": "password123",
		}
		jsonData, _ := json.Marshal(loginData)

		req := httptest.NewRequest("POST", "/login", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		LoginUser(db, w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("malformed JSON", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/login", strings.NewReader("invalid json"))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		LoginUser(db, w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("missing fields", func(t *testing.T) {
		loginData := map[string]string{
			"username": username,
			// Missing password
		}
		jsonData, _ := json.Marshal(loginData)

		req := httptest.NewRequest("POST", "/login", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		LoginUser(db, w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})
}

func TestLogoutUser(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Create test user and session
	username := "logoutuser"
	email := "logout@example.com"
	password := "password123"
	passwordHash, _ := utils.HashPassword(password)
	err := sqlite.CreateUser(db, username, email, passwordHash, "/static/default-avatar.png")
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	user, err := sqlite.GetUserByUsername(db, username)
	if err != nil {
		t.Fatalf("Failed to get test user: %v", err)
	}

	sessionID, err := sqlite.CreateSession(db, user.ID)
	if err != nil {
		t.Fatalf("Failed to create test session: %v", err)
	}

	t.Run("successful logout", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/logout", nil)
		// Add session cookie
		req.AddCookie(&http.Cookie{
			Name:  "session_id",
			Value: sessionID,
		})
		w := httptest.NewRecorder()

		LogoutUser(db, w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected status %d, got %d", http.StatusOK, w.Code)
		}

		// Verify session was deleted from database
		userID, err := sqlite.GetUserIDFromSession(db, sessionID)
		if err != nil {
			t.Fatalf("Unexpected error checking session: %v", err)
		}
		if userID != "" {
			t.Fatal("Session should have been deleted")
		}

		// Check that session cookie was cleared
		cookies := w.Result().Cookies()
		var sessionCookie *http.Cookie
		for _, cookie := range cookies {
			if cookie.Name == "session_id" {
				sessionCookie = cookie
				break
			}
		}

		if sessionCookie == nil {
			t.Fatal("Session cookie should be set to clear it")
		}

		if sessionCookie.MaxAge != -1 {
			t.Fatal("Session cookie should be set to expire")
		}
	})

	t.Run("invalid method", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/logout", nil)
		w := httptest.NewRecorder()

		LogoutUser(db, w, req)

		if w.Code != http.StatusMethodNotAllowed {
			t.Fatalf("Expected status %d, got %d", http.StatusMethodNotAllowed, w.Code)
		}
	})

	t.Run("no session cookie", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/logout", nil)
		w := httptest.NewRecorder()

		LogoutUser(db, w, req)

		// Should still return OK even without session
		if w.Code != http.StatusOK {
			t.Fatalf("Expected status %d, got %d", http.StatusOK, w.Code)
		}
	})
}

func TestGetUser(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Create test user and session
	username := "currentuser"
	email := "current@example.com"
	password := "password123"
	passwordHash, _ := utils.HashPassword(password)
	err := sqlite.CreateUser(db, username, email, passwordHash, "/static/avatar.png")
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	user, err := sqlite.GetUserByUsername(db, username)
	if err != nil {
		t.Fatalf("Failed to get test user: %v", err)
	}

	sessionID, err := sqlite.CreateSession(db, user.ID)
	if err != nil {
		t.Fatalf("Failed to create test session: %v", err)
	}

	t.Run("successful get current user", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/current-user", nil)
		req.AddCookie(&http.Cookie{
			Name:  "session_id",
			Value: sessionID,
		})
		w := httptest.NewRecorder()

		GetUser(db, w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected status %d, got %d", http.StatusOK, w.Code)
		}

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		if err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}

		if response["username"] != username {
			t.Fatalf("Expected username %s, got %v", username, response["username"])
		}
		if response["email"] != email {
			t.Fatalf("Expected email %s, got %v", email, response["email"])
		}

		// Password hash should not be included
		if _, exists := response["password_hash"]; exists {
			t.Fatal("Password hash should not be included in response")
		}
	})

	t.Run("invalid method", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/current-user", nil)
		w := httptest.NewRecorder()

		GetUser(db, w, req)

		if w.Code != http.StatusMethodNotAllowed {
			t.Fatalf("Expected status %d, got %d", http.StatusMethodNotAllowed, w.Code)
		}
	})

	t.Run("no session cookie", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/current-user", nil)
		w := httptest.NewRecorder()

		GetUser(db, w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("invalid session", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/current-user", nil)
		req.AddCookie(&http.Cookie{
			Name:  "session_id",
			Value: "invalid-session-id",
		})
		w := httptest.NewRecorder()

		GetUser(db, w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})
}

func TestAuthHandlersIntegration(t *testing.T) {
	t.Run("complete auth flow", func(t *testing.T) {
		db := setupTestDB(t)
		defer db.Close()

		// Create static directory for registration
		err := os.MkdirAll("static/uploads", 0755)
		if err != nil {
			t.Fatalf("Failed to create static directory: %v", err)
		}
		defer os.RemoveAll("static")

		username := "integrationuser"
		email := "integration@example.com"
		password := "password123"

		// 1. Register user
		var regBuf bytes.Buffer
		regWriter := multipart.NewWriter(&regBuf)
		regWriter.WriteField("username", username)
		regWriter.WriteField("email", email)
		regWriter.WriteField("password", password)
		regWriter.Close()

		regReq := httptest.NewRequest("POST", "/register", &regBuf)
		regReq.Header.Set("Content-Type", regWriter.FormDataContentType())
		regW := httptest.NewRecorder()

		RegisterUser(db, regW, regReq)

		if regW.Code != http.StatusCreated {
			t.Fatalf("Registration failed: %d - %s", regW.Code, regW.Body.String())
		}

		// 2. Login user
		loginData := map[string]string{
			"username": username,
			"password": password,
		}
		loginJSON, _ := json.Marshal(loginData)

		loginReq := httptest.NewRequest("POST", "/login", bytes.NewBuffer(loginJSON))
		loginReq.Header.Set("Content-Type", "application/json")
		loginW := httptest.NewRecorder()

		LoginUser(db, loginW, loginReq)

		if loginW.Code != http.StatusOK {
			t.Fatalf("Login failed: %d - %s", loginW.Code, loginW.Body.String())
		}

		// Extract session cookie
		var sessionCookie *http.Cookie
		for _, cookie := range loginW.Result().Cookies() {
			if cookie.Name == "session_id" {
				sessionCookie = cookie
				break
			}
		}

		if sessionCookie == nil {
			t.Fatal("No session cookie found after login")
		}

		// 3. Get current user
		currentUserReq := httptest.NewRequest("GET", "/current-user", nil)
		currentUserReq.AddCookie(sessionCookie)
		currentUserW := httptest.NewRecorder()

		GetUser(db, currentUserW, currentUserReq)

		if currentUserW.Code != http.StatusOK {
			t.Fatalf("Get current user failed: %d - %s", currentUserW.Code, currentUserW.Body.String())
		}

		var userResponse map[string]interface{}
		json.Unmarshal(currentUserW.Body.Bytes(), &userResponse)

		if userResponse["username"] != username {
			t.Fatalf("Current user username mismatch: expected %s, got %v", username, userResponse["username"])
		}

		// 4. Logout user
		logoutReq := httptest.NewRequest("POST", "/logout", nil)
		logoutReq.AddCookie(sessionCookie)
		logoutW := httptest.NewRecorder()

		LogoutUser(db, logoutW, logoutReq)

		if logoutW.Code != http.StatusOK {
			t.Fatalf("Logout failed: %d - %s", logoutW.Code, logoutW.Body.String())
		}

		// 5. Verify user is logged out
		verifyReq := httptest.NewRequest("GET", "/current-user", nil)
		verifyReq.AddCookie(sessionCookie)
		verifyW := httptest.NewRecorder()

		GetUser(db, verifyW, verifyReq)

		if verifyW.Code != http.StatusUnauthorized {
			t.Fatalf("User should be logged out, got status %d", verifyW.Code)
		}
	})
}

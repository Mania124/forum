package utils

import (
	"database/sql"
	"fmt"
	"html"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"forum/sqlite"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hashed), err
}

// CheckPasswordHash compares a hashed password with a plain password
func CheckPasswordHash(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// IsAuthor checks if the given user is the author of a specific comment
func IsAuthor(db *sql.DB, userID string, id int, isPost bool) (bool, error) {
	var authorID string
	query := "SELECT user_id FROM comments WHERE id = ?"
	if isPost {
		query = "SELECT user_id FROM posts WHERE id = ?"
	}
	err := db.QueryRow(query, id).Scan(&authorID)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return authorID == userID, nil
}

// IsAuthenticated checks if the user is logged in
func IsAuthenticated(db *sql.DB, r *http.Request) (bool, error) {
	sessionCookie, err := r.Cookie("session_id")
	if err != nil {
		return false, err // Return error instead of just false
	}

	valid, err := validateSession(db, sessionCookie.Value)
	if err != nil {
		log.Println("Session validation error:", err)
		return false, err
	}
	return valid, nil
}

// GetUserIDFromSession retrieves the user ID from the session
func GetUserIDFromSession(db *sql.DB, r *http.Request) (string, error) {
	sessionCookie, err := r.Cookie("session_id")
	if err != nil {
		return "", err
	}
	return getUserIDFromSession(db, sessionCookie.Value)
}

// validateSession validates the session
func validateSession(db *sql.DB, sessionID string) (bool, error) {
	var userID int
	var createdAt time.Time

	err := db.QueryRow(`
        SELECT user_id, created_at FROM sessions WHERE id = ?
    `, sessionID).Scan(&userID, &createdAt)
	if err != nil {
		return false, err
	}

	// Ensure session is not expired (e.g., 24 hours validity)
	if time.Since(createdAt) > 24*time.Hour {
		return false, nil
	}

	return userID > 0, nil
}

// getUserIDFromSession retrieves the user ID from the session
func getUserIDFromSession(db *sql.DB, sessionID string) (string, error) {
	userID, err := sqlite.GetUserIDFromSession(db, sessionID)
	if err != nil {
		return "", err
	}
	return userID, nil
}

// GetPaginationParams extracts "page" and "limit" from query parameters
func GetPaginationParams(r *http.Request) (int, int) {
	page, err := strconv.Atoi(r.URL.Query().Get("page"))
	if err != nil || page < 1 {
		page = 1 // Default to first page
	}

	limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
	if err != nil || limit < 1 {
		limit = 10 // Default page size
	}

	return page, limit
}

// Input Validation and Sanitization Functions

// ValidateAndSanitizeString validates and sanitizes string input
func ValidateAndSanitizeString(input string, maxLength int, fieldName string) (string, error) {
	// Check for null bytes (potential for SQL injection bypass)
	if strings.Contains(input, "\x00") {
		return "", fmt.Errorf("%s contains invalid characters", fieldName)
	}

	// Trim whitespace
	input = strings.TrimSpace(input)

	// Check length
	if len(input) == 0 {
		return "", fmt.Errorf("%s cannot be empty", fieldName)
	}

	if len(input) > maxLength {
		return "", fmt.Errorf("%s exceeds maximum length of %d characters", fieldName, maxLength)
	}

	// Check for valid UTF-8
	if !utf8.ValidString(input) {
		return "", fmt.Errorf("%s contains invalid UTF-8 characters", fieldName)
	}

	// HTML escape to prevent XSS
	sanitized := html.EscapeString(input)

	return sanitized, nil
}

// ValidateEmail validates email format
func ValidateEmail(email string) error {
	// Basic email regex pattern
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

	if !emailRegex.MatchString(email) {
		return fmt.Errorf("invalid email format")
	}

	return nil
}

// ValidateUsername validates username format
func ValidateUsername(username string) error {
	// Username should only contain alphanumeric characters, underscores, and hyphens
	usernameRegex := regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

	if !usernameRegex.MatchString(username) {
		return fmt.Errorf("username can only contain letters, numbers, underscores, and hyphens")
	}

	if len(username) < 3 || len(username) > 30 {
		return fmt.Errorf("username must be between 3 and 30 characters")
	}

	return nil
}

// ValidatePassword validates password strength
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}

	if len(password) > 128 {
		return fmt.Errorf("password must be less than 128 characters")
	}

	// Check for at least one letter and one number
	hasLetter := regexp.MustCompile(`[a-zA-Z]`).MatchString(password)
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)

	if !hasLetter || !hasNumber {
		return fmt.Errorf("password must contain at least one letter and one number")
	}

	return nil
}

// ValidatePostContent validates post title and content
func ValidatePostContent(title, content string) error {
	if _, err := ValidateAndSanitizeString(title, 200, "title"); err != nil {
		return err
	}

	if _, err := ValidateAndSanitizeString(content, 10000, "content"); err != nil {
		return err
	}

	return nil
}

// ValidateCommentContent validates comment content
func ValidateCommentContent(content string) error {
	if _, err := ValidateAndSanitizeString(content, 2000, "comment"); err != nil {
		return err
	}

	return nil
}

// ValidateID validates and converts string ID to integer
func ValidateID(idStr string, fieldName string) (int, error) {
	if idStr == "" {
		return 0, fmt.Errorf("%s cannot be empty", fieldName)
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		return 0, fmt.Errorf("invalid %s format", fieldName)
	}

	if id <= 0 {
		return 0, fmt.Errorf("%s must be a positive integer", fieldName)
	}

	return id, nil
}

// ValidateUUID validates UUID format for user IDs
func ValidateUUID(uuid string) error {
	uuidRegex := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

	if !uuidRegex.MatchString(uuid) {
		return fmt.Errorf("invalid UUID format")
	}

	return nil
}

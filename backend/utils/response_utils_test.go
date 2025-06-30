package utils

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJSONResponse(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		data       interface{}
	}{
		{"success response", http.StatusOK, map[string]string{"message": "success"}},
		{"error response", http.StatusBadRequest, map[string]string{"error": "bad request"}},
		{"array response", http.StatusOK, []string{"item1", "item2"}},
		{"string response", http.StatusOK, "simple string"},
		{"number response", http.StatusOK, 42},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			JSONResponse(w, tt.statusCode, tt.data)

			// Check status code
			if w.Code != tt.statusCode {
				t.Fatalf("Expected status %d, got %d", tt.statusCode, w.Code)
			}

			// Check content type
			expectedContentType := "application/json"
			if contentType := w.Header().Get("Content-Type"); contentType != expectedContentType {
				t.Fatalf("Expected content type %s, got %s", expectedContentType, contentType)
			}

			// Check that response body is valid JSON
			var response interface{}
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Fatalf("Response body is not valid JSON: %v", err)
			}
		})
	}
}

func TestErrorResponse(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		message    string
	}{
		{"bad request", http.StatusBadRequest, "Invalid input"},
		{"unauthorized", http.StatusUnauthorized, "Authentication required"},
		{"not found", http.StatusNotFound, "Resource not found"},
		{"internal error", http.StatusInternalServerError, "Internal server error"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			ErrorResponse(w, tt.statusCode, tt.message)

			// Check status code
			if w.Code != tt.statusCode {
				t.Fatalf("Expected status %d, got %d", tt.statusCode, w.Code)
			}

			// Check content type
			expectedContentType := "application/json"
			if contentType := w.Header().Get("Content-Type"); contentType != expectedContentType {
				t.Fatalf("Expected content type %s, got %s", expectedContentType, contentType)
			}

			// Parse response body
			var response map[string]string
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Fatalf("Failed to unmarshal response: %v", err)
			}

			// Check error message
			if response["error"] != tt.message {
				t.Fatalf("Expected error message %q, got %q", tt.message, response["error"])
			}
		})
	}
}

func TestSuccessResponse(t *testing.T) {
	tests := []struct {
		name    string
		message string
	}{
		{"user created", "User created successfully"},
		{"post updated", "Post updated successfully"},
		{"comment deleted", "Comment deleted successfully"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			SuccessResponse(w, tt.message)

			// Check status code
			if w.Code != http.StatusOK {
				t.Fatalf("Expected status %d, got %d", http.StatusOK, w.Code)
			}

			// Check content type
			expectedContentType := "application/json"
			if contentType := w.Header().Get("Content-Type"); contentType != expectedContentType {
				t.Fatalf("Expected content type %s, got %s", expectedContentType, contentType)
			}

			// Parse response body
			var response map[string]string
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Fatalf("Failed to unmarshal response: %v", err)
			}

			// Check success message
			if response["message"] != tt.message {
				t.Fatalf("Expected message %q, got %q", tt.message, response["message"])
			}
		})
	}
}

func TestSendJSONError(t *testing.T) {
	tests := []struct {
		name       string
		message    string
		statusCode int
	}{
		{"validation error", "Invalid email format", http.StatusBadRequest},
		{"auth error", "Invalid credentials", http.StatusUnauthorized},
		{"not found", "User not found", http.StatusNotFound},
		{"server error", "Database connection failed", http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			SendJSONError(w, tt.message, tt.statusCode)

			// Check status code
			if w.Code != tt.statusCode {
				t.Fatalf("Expected status %d, got %d", tt.statusCode, w.Code)
			}

			// Check content type
			expectedContentType := "application/json"
			if contentType := w.Header().Get("Content-Type"); contentType != expectedContentType {
				t.Fatalf("Expected content type %s, got %s", expectedContentType, contentType)
			}

			// Parse response body
			var response map[string]string
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Fatalf("Failed to unmarshal response: %v", err)
			}

			// Check error message
			if response["error"] != tt.message {
				t.Fatalf("Expected error message %q, got %q", tt.message, response["error"])
			}
		})
	}
}

func TestSendJSONResponse(t *testing.T) {
	tests := []struct {
		name       string
		data       interface{}
		statusCode int
	}{
		{"created response", map[string]string{"id": "123"}, http.StatusCreated},
		{"accepted response", map[string]string{"status": "processing"}, http.StatusAccepted},
		{"no content", nil, http.StatusNoContent},
		{"custom data", map[string]interface{}{
			"users":  []string{"user1", "user2"},
			"total":  2,
			"active": true,
		}, http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			SendJSONResponse(w, tt.data, tt.statusCode)

			// Check status code
			if w.Code != tt.statusCode {
				t.Fatalf("Expected status %d, got %d", tt.statusCode, w.Code)
			}

			// Check content type
			expectedContentType := "application/json"
			if contentType := w.Header().Get("Content-Type"); contentType != expectedContentType {
				t.Fatalf("Expected content type %s, got %s", expectedContentType, contentType)
			}

			// Check that response body is valid JSON (if not nil)
			if tt.data != nil {
				var response interface{}
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatalf("Response body is not valid JSON: %v", err)
				}
			}
		})
	}
}

func TestResponseUtilsIntegration(t *testing.T) {
	// Test that all response utilities work together correctly
	t.Run("mixed responses", func(t *testing.T) {
		// Test error response
		w1 := httptest.NewRecorder()
		ErrorResponse(w1, http.StatusBadRequest, "Validation failed")
		
		var errorResp map[string]string
		json.Unmarshal(w1.Body.Bytes(), &errorResp)
		if errorResp["error"] != "Validation failed" {
			t.Fatal("Error response failed")
		}

		// Test success response
		w2 := httptest.NewRecorder()
		SuccessResponse(w2, "Operation completed")
		
		var successResp map[string]string
		json.Unmarshal(w2.Body.Bytes(), &successResp)
		if successResp["message"] != "Operation completed" {
			t.Fatal("Success response failed")
		}

		// Test custom JSON response
		w3 := httptest.NewRecorder()
		customData := map[string]interface{}{
			"id":     "123",
			"status": "active",
			"count":  42,
		}
		JSONResponse(w3, http.StatusCreated, customData)
		
		var customResp map[string]interface{}
		json.Unmarshal(w3.Body.Bytes(), &customResp)
		if customResp["id"] != "123" || customResp["status"] != "active" {
			t.Fatal("Custom response failed")
		}
	})
}

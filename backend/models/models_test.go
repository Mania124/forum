package models

import (
	"encoding/json"
	"testing"
	"time"
)

func TestUserModel(t *testing.T) {
	t.Run("User JSON serialization", func(t *testing.T) {
		user := User{
			ID:           "123e4567-e89b-12d3-a456-426614174000",
			Username:     "testuser",
			Email:        "test@example.com",
			PasswordHash: "hashedpassword123",
			AvatarURL:    "/static/avatar.png",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		// Test JSON marshaling
		jsonData, err := json.Marshal(user)
		if err != nil {
			t.Fatalf("Failed to marshal user: %v", err)
		}

		// Test that password hash is not included in JSON (json:"-" tag)
		jsonStr := string(jsonData)
		if containsString(jsonStr, "password_hash") || containsString(jsonStr, "hashedpassword123") {
			t.Fatal("Password hash should not be included in JSON output")
		}

		// Test that other fields are included
		if !containsString(jsonStr, "testuser") {
			t.Fatal("Username should be included in JSON output")
		}
		if !containsString(jsonStr, "test@example.com") {
			t.Fatal("Email should be included in JSON output")
		}

		// Test JSON unmarshaling
		var unmarshaledUser User
		err = json.Unmarshal(jsonData, &unmarshaledUser)
		if err != nil {
			t.Fatalf("Failed to unmarshal user: %v", err)
		}

		// Verify fields (except password hash which is excluded)
		if unmarshaledUser.ID != user.ID {
			t.Fatalf("Expected ID %s, got %s", user.ID, unmarshaledUser.ID)
		}
		if unmarshaledUser.Username != user.Username {
			t.Fatalf("Expected username %s, got %s", user.Username, unmarshaledUser.Username)
		}
		if unmarshaledUser.Email != user.Email {
			t.Fatalf("Expected email %s, got %s", user.Email, unmarshaledUser.Email)
		}
	})

	t.Run("User default values", func(t *testing.T) {
		user := User{
			ID:       "test-id",
			Username: "testuser",
			Email:    "test@example.com",
		}

		// Test that default avatar URL is set correctly in JSON tags
		jsonData, _ := json.Marshal(user)
		var result map[string]interface{}
		json.Unmarshal(jsonData, &result)

		// The actual default value setting would be handled by the database/GORM
		// Here we just test the struct definition
		if user.AvatarURL == "" {
			// This is expected for a new struct, default would be set by DB
			t.Log("Avatar URL is empty as expected for new struct")
		}
	})
}

func TestPostModel(t *testing.T) {
	t.Run("Post JSON serialization", func(t *testing.T) {
		imageURL := "/static/post-image.jpg"
		post := Post{
			ID:            1,
			ProfileAvatar: "/static/user-avatar.png",
			Title:         "Test Post Title",
			Content:       "This is test post content",
			Username:      "testuser",
			UserID:        "user-123",
			CategoryIDs:   []int{1, 2, 3},
			CategoryNames: []string{"Technology", "Programming", "Go"},
			ImageURL:      &imageURL,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		// Test JSON marshaling
		jsonData, err := json.Marshal(post)
		if err != nil {
			t.Fatalf("Failed to marshal post: %v", err)
		}

		jsonStr := string(jsonData)

		// Test that all fields are included
		if !containsString(jsonStr, "Test Post Title") {
			t.Fatal("Title should be included in JSON output")
		}
		if !containsString(jsonStr, "This is test post content") {
			t.Fatal("Content should be included in JSON output")
		}
		if !containsString(jsonStr, "testuser") {
			t.Fatal("Username should be included in JSON output")
		}

		// Test JSON unmarshaling
		var unmarshaledPost Post
		err = json.Unmarshal(jsonData, &unmarshaledPost)
		if err != nil {
			t.Fatalf("Failed to unmarshal post: %v", err)
		}

		// Verify fields
		if unmarshaledPost.ID != post.ID {
			t.Fatalf("Expected ID %d, got %d", post.ID, unmarshaledPost.ID)
		}
		if unmarshaledPost.Title != post.Title {
			t.Fatalf("Expected title %s, got %s", post.Title, unmarshaledPost.Title)
		}
		if unmarshaledPost.UserID != post.UserID {
			t.Fatalf("Expected user ID %s, got %s", post.UserID, unmarshaledPost.UserID)
		}
	})

	t.Run("Post with nil image URL", func(t *testing.T) {
		post := Post{
			ID:       1,
			Title:    "Post without image",
			Content:  "Content here",
			UserID:   "user-123",
			ImageURL: nil,
		}

		jsonData, err := json.Marshal(post)
		if err != nil {
			t.Fatalf("Failed to marshal post with nil image: %v", err)
		}

		var result map[string]interface{}
		json.Unmarshal(jsonData, &result)

		// Check that image_url is either omitted or null
		if imageURL, exists := result["image_url"]; exists && imageURL != nil {
			t.Fatal("ImageURL should be omitted or null when nil")
		}
	})

	t.Run("Post categories", func(t *testing.T) {
		post := Post{
			CategoryIDs:   []int{1, 2, 3},
			CategoryNames: []string{"Tech", "Programming", "Go"},
		}

		jsonData, _ := json.Marshal(post)
		var result map[string]interface{}
		json.Unmarshal(jsonData, &result)

		// Verify category data is preserved
		categoryIDs, ok := result["category_ids"].([]interface{})
		if !ok || len(categoryIDs) != 3 {
			t.Fatal("Category IDs should be preserved in JSON")
		}

		categoryNames, ok := result["category_names"].([]interface{})
		if !ok || len(categoryNames) != 3 {
			t.Fatal("Category names should be preserved in JSON")
		}
	})
}

func TestCommentModel(t *testing.T) {
	t.Run("Comment JSON serialization", func(t *testing.T) {
		comment := Comment{
			ID:            1,
			UserID:        "user-123",
			UserName:      "testuser",
			ProfileAvatar: "/static/avatar.png",
			PostID:        42,
			Content:       "This is a test comment",
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
			Replies:       []ReplyComment{},
		}

		// Test JSON marshaling
		jsonData, err := json.Marshal(comment)
		if err != nil {
			t.Fatalf("Failed to marshal comment: %v", err)
		}

		jsonStr := string(jsonData)

		// Test that all fields are included
		if !containsString(jsonStr, "This is a test comment") {
			t.Fatal("Content should be included in JSON output")
		}
		if !containsString(jsonStr, "testuser") {
			t.Fatal("Username should be included in JSON output")
		}

		// Test JSON unmarshaling
		var unmarshaledComment Comment
		err = json.Unmarshal(jsonData, &unmarshaledComment)
		if err != nil {
			t.Fatalf("Failed to unmarshal comment: %v", err)
		}

		// Verify fields
		if unmarshaledComment.ID != comment.ID {
			t.Fatalf("Expected ID %d, got %d", comment.ID, unmarshaledComment.ID)
		}
		if unmarshaledComment.Content != comment.Content {
			t.Fatalf("Expected content %s, got %s", comment.Content, unmarshaledComment.Content)
		}
		if unmarshaledComment.UserID != comment.UserID {
			t.Fatalf("Expected user ID %s, got %s", comment.UserID, unmarshaledComment.UserID)
		}
	})

	t.Run("Comment with replies", func(t *testing.T) {
		replies := []ReplyComment{
			{
				ID:              1,
				UserID:          "user-456",
				UserName:        "replier1",
				ParentCommentID: 1,
				Content:         "This is a reply",
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			},
			{
				ID:              2,
				UserID:          "user-789",
				UserName:        "replier2",
				ParentCommentID: 1,
				Content:         "Another reply",
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			},
		}

		comment := Comment{
			ID:      1,
			UserID:  "user-123",
			Content: "Original comment",
			Replies: replies,
		}

		jsonData, err := json.Marshal(comment)
		if err != nil {
			t.Fatalf("Failed to marshal comment with replies: %v", err)
		}

		var unmarshaledComment Comment
		err = json.Unmarshal(jsonData, &unmarshaledComment)
		if err != nil {
			t.Fatalf("Failed to unmarshal comment with replies: %v", err)
		}

		if len(unmarshaledComment.Replies) != 2 {
			t.Fatalf("Expected 2 replies, got %d", len(unmarshaledComment.Replies))
		}

		if unmarshaledComment.Replies[0].Content != "This is a reply" {
			t.Fatal("First reply content not preserved")
		}
	})
}

func TestReplyCommentModel(t *testing.T) {
	t.Run("ReplyComment JSON serialization", func(t *testing.T) {
		reply := ReplyComment{
			ID:              1,
			UserID:          "user-123",
			UserName:        "testuser",
			ProfileAvatar:   "/static/avatar.png",
			ParentCommentID: 42,
			Content:         "This is a reply comment",
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}

		// Test JSON marshaling
		jsonData, err := json.Marshal(reply)
		if err != nil {
			t.Fatalf("Failed to marshal reply comment: %v", err)
		}

		jsonStr := string(jsonData)

		// Test that all fields are included
		if !containsString(jsonStr, "This is a reply comment") {
			t.Fatal("Content should be included in JSON output")
		}
		if !containsString(jsonStr, "testuser") {
			t.Fatal("Username should be included in JSON output")
		}

		// Test JSON unmarshaling
		var unmarshaledReply ReplyComment
		err = json.Unmarshal(jsonData, &unmarshaledReply)
		if err != nil {
			t.Fatalf("Failed to unmarshal reply comment: %v", err)
		}

		// Verify fields
		if unmarshaledReply.ID != reply.ID {
			t.Fatalf("Expected ID %d, got %d", reply.ID, unmarshaledReply.ID)
		}
		if unmarshaledReply.Content != reply.Content {
			t.Fatalf("Expected content %s, got %s", reply.Content, unmarshaledReply.Content)
		}
		if unmarshaledReply.ParentCommentID != reply.ParentCommentID {
			t.Fatalf("Expected parent comment ID %d, got %d", reply.ParentCommentID, unmarshaledReply.ParentCommentID)
		}
	})
}

func TestModelValidation(t *testing.T) {
	t.Run("Empty required fields", func(t *testing.T) {
		// Test Post with empty required fields
		post := Post{
			Title:   "",
			Content: "",
			UserID:  "",
		}

		// The actual validation would be done by the validation library
		// Here we just test that the struct can be created and marshaled
		jsonData, err := json.Marshal(post)
		if err != nil {
			t.Fatalf("Failed to marshal post with empty fields: %v", err)
		}

		if len(jsonData) == 0 {
			t.Fatal("JSON data should not be empty")
		}
	})

	t.Run("Comment with empty required fields", func(t *testing.T) {
		comment := Comment{
			UserID:  "",
			Content: "",
		}

		jsonData, err := json.Marshal(comment)
		if err != nil {
			t.Fatalf("Failed to marshal comment with empty fields: %v", err)
		}

		if len(jsonData) == 0 {
			t.Fatal("JSON data should not be empty")
		}
	})
}

// Helper function to check if a string contains a substring
func containsString(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || 
		(len(s) > len(substr) && func() bool {
			for i := 0; i <= len(s)-len(substr); i++ {
				if s[i:i+len(substr)] == substr {
					return true
				}
			}
			return false
		}()))
}

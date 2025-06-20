package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"forum/sqlite"
	"forum/utils"
)

// ToggleLike handles liking/disliking a post or comment
func ToggleLike(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Define the request struct
	var request struct {
		PostID    *int   `json:"post_id,omitempty"`
		CommentID *int   `json:"comment_id,omitempty"`
		Type      string `json:"type"` // like or dislike
	}

	// Decode request body
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request data", http.StatusBadRequest)
		return
	}

	// Validate user session
	userID, ok := RequireAuth(db, w, r)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Ensure exactly one of PostID or CommentID is provided
	if (request.PostID != nil && request.CommentID != nil) || (request.PostID == nil && request.CommentID == nil) {
		http.Error(w, "Must provide either post_id or comment_id, but not both", http.StatusBadRequest)
		return
	}

	// Validate type
	if request.Type != "like" && request.Type != "dislike" {
		http.Error(w, "Invalid type. Must be 'like' or 'dislike'", http.StatusBadRequest)
		return
	}

	// Validate IDs are positive integers
	if request.PostID != nil && *request.PostID <= 0 {
		http.Error(w, "Invalid post_id", http.StatusBadRequest)
		return
	}

	if request.CommentID != nil && *request.CommentID <= 0 {
		http.Error(w, "Invalid comment_id", http.StatusBadRequest)
		return
	}

	// Call the updated toggle function with type
	err := sqlite.ToggleLike(db, userID, request.PostID, request.CommentID, request.Type)
	if err != nil {
		utils.SendJSONError(w, fmt.Sprintf("Database error: %v", err), http.StatusInternalServerError)
		return
	}

	utils.SendJSONResponse(w, map[string]string{"message": "Reaction toggled successfully"}, http.StatusOK)
}

// GetReactions returns the total number of likes and dislikes for a post or comment
func GetReactions(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query()
	postIDStr := query.Get("post_id")
	commentIDStr := query.Get("comment_id")

	var (
		postID    *int
		commentID *int
		err       error
	)

	if postIDStr != "" {
		id, err := utils.ValidateID(postIDStr, "post_id")
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		postID = &id
	} else if commentIDStr != "" {
		id, err := utils.ValidateID(commentIDStr, "comment_id")
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		commentID = &id
	} else {
		http.Error(w, "Must provide post_id or comment_id", http.StatusBadRequest)
		return
	}

	likes, dislikes, err := sqlite.CountLikesAndDislikes(db, postID, commentID)
	if err != nil {
		utils.SendJSONError(w, fmt.Sprintf("Database error: %v", err), http.StatusInternalServerError)
		return
	}

	utils.SendJSONResponse(w, map[string]int{
		"likes":    likes,
		"dislikes": dislikes,
	}, http.StatusOK)
}

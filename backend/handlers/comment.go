package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"forum/models"
	"forum/sqlite"
	"forum/utils"
)

// CreateComment creates a new comment
func CreateComment(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var comment models.Comment
	err := json.NewDecoder(r.Body).Decode(&comment)
	if err != nil {
		http.Error(w, "Invalid comment data", http.StatusBadRequest)
		return
	}

	// Validate and sanitize comment content
	if err := utils.ValidateCommentContent(comment.Content); err != nil {
		utils.SendJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	sanitizedContent, err := utils.ValidateAndSanitizeString(comment.Content, 2000, "comment")
	if err != nil {
		utils.SendJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Validate user session
	userID, ok := RequireAuth(db, w, r)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	comment.UserID = userID

	// Validate input: post_id must be set for a top-level comment
	if comment.PostID == 0 {
		http.Error(w, "Missing post_id", http.StatusBadRequest)
		return
	}

	// Create top-level comment
	comm, err := sqlite.CreateComment(db, comment.UserID, comment.PostID, sanitizedContent)
	if err != nil {
		utils.SendJSONError(w, "Failed to create comment", http.StatusInternalServerError)
		return
	}

	utils.SendJSONResponse(w, comm, http.StatusCreated)
}

func CreateReplComment(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var reply models.ReplyComment
	err := json.NewDecoder(r.Body).Decode(&reply)
	if err != nil {
		http.Error(w, "Invalid reply data", http.StatusBadRequest)
		return
	}

	// Validate and sanitize reply content
	if err := utils.ValidateCommentContent(reply.Content); err != nil {
		utils.SendJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	sanitizedReplyContent, err := utils.ValidateAndSanitizeString(reply.Content, 2000, "reply")
	if err != nil {
		utils.SendJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Validate user session
	userID, ok := RequireAuth(db, w, r)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	reply.UserID = userID

	// Ensure parent_comment_id is provided
	if reply.ParentCommentID == 0 {
		http.Error(w, "Missing parent_comment_id", http.StatusBadRequest)
		return
	}

	// post_id should not be included for replies
	if r.FormValue("post_id") != "" {
		http.Error(w, "post_id not allowed for replies", http.StatusBadRequest)
		return
	}

	// Create the reply
	createdReply, err := sqlite.CreateReplyComment(db, reply.UserID, reply.ParentCommentID, sanitizedReplyContent)
	if err != nil {
		utils.SendJSONError(w, "Failed to create reply", http.StatusInternalServerError)
		return
	}

	utils.SendJSONResponse(w, createdReply, http.StatusCreated)
}

// GetComments fetches comments for a post
// func GetReplComments(db *sql.DB, w http.ResponseWriter, r *http.Request) {
// 	if r.Method != http.MethodGet {
// 		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
// 		return
// 	}

// 	postIDStr := r.URL.Query().Get("post_id")
// 	if postIDStr == "" {
// 		http.Error(w, "Missing post_id parameter", http.StatusBadRequest)
// 		return
// 	}

// 	postID, err := strconv.Atoi(postIDStr)
// 	if err != nil {
// 		http.Error(w, "Invalid post_id parameter", http.StatusBadRequest)
// 		return
// 	}

// 	// Fetch all comments for the post (flat list)
// 	comments, err := sqlite.GetPostComments(db, postID)
// 	if err != nil {
// 		utils.SendJSONError(w, "Failed to fetch comments", http.StatusInternalServerError)
// 		return
// 	}

// 	utils.SendJSONResponse(w, comments, http.StatusOK)
// }

// DeleteComment deletes a comment
func DeleteComment(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		CommentID int `json:"comment_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request data", http.StatusBadRequest)
		return
	}

	// Validate user session and check if the user is the author of the comment
	userID, err := utils.GetUserIDFromSession(db, r)
	if err != nil || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	isAuthor, err := utils.IsAuthor(db, userID, request.CommentID, false)
	if err != nil || !isAuthor {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Delete comment from database
	err = sqlite.DeleteComment(db, request.CommentID)
	if err != nil {
		utils.SendJSONError(w, "Failed to delete comment", http.StatusInternalServerError)
		return
	}

	utils.SendJSONResponse(w, map[string]string{"message": "Comment deleted"}, http.StatusOK)
}

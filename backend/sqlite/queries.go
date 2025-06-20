package sqlite

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"forum/models"

	"github.com/google/uuid"
)

// GetUserByUsername retrieves a user by username
func GetUserByUsername(db *sql.DB, username string) (models.User, error) {
	var user models.User
	err := db.QueryRow(`
		SELECT id, username, email, password_hash, avatar_url, created_at, updated_at
		FROM users WHERE username = ?
	`, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.AvatarURL,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return models.User{}, err
	}
	return user, nil
}

// CreateUser inserts a new user into the database
func CreateUser(db *sql.DB, username, email, passwordHash, avatarURL string) error {
	userID := uuid.New().String()

	_, err := db.Exec(`
		INSERT INTO users (id, username, email, password_hash, avatar_url)
		VALUES (?, ?, ?, ?, ?)
	`, userID, username, email, passwordHash, avatarURL)

	return err
}

// CreatePost inserts a new post and its category associations
func CreatePost(db *sql.DB, userID string, categoryIDs []int, title, content, imageURL string) (models.Post, error) {
	var post models.Post

	// Insert into posts table
	query := `
		INSERT INTO posts (user_id, title, content, image_url)
		VALUES (?, ?, ?, ?)
		RETURNING id, user_id, title, content, image_url, created_at
	`
	err := db.QueryRow(query, userID, title, content, imageURL).Scan(
		&post.ID,
		&post.UserID,
		&post.Title,
		&post.Content,
		&post.ImageURL,
		&post.CreatedAt,
	)
	if err != nil {
		return post, err
	}

	// Insert into post_categories table
	for _, catID := range categoryIDs {
		_, err := db.Exec(`INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)`, post.ID, catID)
		if err != nil {
			return post, fmt.Errorf("failed to insert into post_categories: %w", err)
		}
	}

	post.CategoryIDs = categoryIDs
	return post, nil
}

// GetPost retrieves a single post by ID with its category IDs
func GetPost(db *sql.DB, postID int) (models.Post, error) {
	var post models.Post

	// Fetch main post data
	err := db.QueryRow(`
        SELECT id, user_id, title, content, image_url, created_at, updated_at
        FROM posts WHERE id = ?
    `, postID).Scan(
		&post.ID,
		&post.UserID,
		&post.Title,
		&post.Content,
		&post.ImageURL,
		&post.CreatedAt,
		&post.UpdatedAt,
	)
	if err != nil {
		return post, err
	}

	// Fetch category IDs from join table
	rows, err := db.Query(`SELECT category_id FROM post_categories WHERE post_id = ?`, postID)
	if err != nil {
		return post, err
	}
	defer rows.Close()

	for rows.Next() {
		var catID int
		if err := rows.Scan(&catID); err != nil {
			return post, err
		}
		post.CategoryIDs = append(post.CategoryIDs, catID)
	}

	// Get category names
	categoryNames, err := GetCategoryNamesByIDs(db, post.CategoryIDs)
	if err != nil {
		// Log error but don't fail the entire request
		fmt.Printf("Warning: Failed to get category names for post %d: %v\n", post.ID, err)
		categoryNames = []string{}
	}
	post.CategoryNames = categoryNames

	return post, nil
}

func GetPosts(db *sql.DB, page, limit int) ([]models.Post, error) {
	offset := (page - 1) * limit

	// Query basic post data
	rows, err := db.Query(`
		SELECT 
			posts.id, 
			posts.user_id, 
			users.username, 
			posts.title, 
			posts.content, 
			posts.image_url,
			posts.created_at, 
			posts.updated_at
		FROM posts
		JOIN users ON posts.user_id = users.id
		ORDER BY posts.created_at DESC
		LIMIT ? OFFSET ?
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	postMap := make(map[int]*models.Post)
	var postIDs []any

	for rows.Next() {
		var post models.Post
		err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.Username,
			&post.Title,
			&post.Content,
			&post.ImageURL,
			&post.CreatedAt,
			&post.UpdatedAt,
		)
		if err != nil {
			fmt.Println(err)
			return nil, err
		}
		post.CategoryIDs = []int{}
		postMap[post.ID] = &post
		postIDs = append(postIDs, post.ID)
	}

	if len(postIDs) == 0 {
		return []models.Post{}, nil
	}

	// Build query for categories
	placeholders := make([]string, len(postIDs))
	for i := range placeholders {
		placeholders[i] = "?"
	}

	query := fmt.Sprintf(`
		SELECT post_id, category_id
		FROM post_categories
		WHERE post_id IN (%s)
	`, strings.Join(placeholders, ","))

	catRows, err := db.Query(query, postIDs...)
	if err != nil {
		return nil, err
	}
	defer catRows.Close()

	for catRows.Next() {
		var postID, categoryID int
		if err := catRows.Scan(&postID, &categoryID); err != nil {
			return nil, err
		}
		if post, ok := postMap[postID]; ok {
			post.CategoryIDs = append(post.CategoryIDs, categoryID)
		}
	}

	// Build final slice from postMap in the original order and fetch category names
	posts := make([]models.Post, 0, len(postMap))

	// Iterate through postIDs to maintain the original order from the SQL query
	for _, postIDInterface := range postIDs {
		postID := postIDInterface.(int)
		if post, ok := postMap[postID]; ok {
			// Get category names for this post
			categoryNames, err := GetCategoryNamesByIDs(db, post.CategoryIDs)
			if err != nil {
				// Log error but don't fail the entire request
				fmt.Printf("Warning: Failed to get category names for post %d: %v\n", post.ID, err)
				categoryNames = []string{}
			}
			post.CategoryNames = categoryNames
			posts = append(posts, *post)
		}
	}

	return posts, nil
}

// DeletePost removes a post by ID
func DeletePost(db *sql.DB, postID int) error {
	_, err := db.Exec(`DELETE FROM posts WHERE id = ?`, postID)
	return err
}

// GetOrCreateCategoryIDs resolves category names to IDs, creating new ones if needed.
func GetOrCreateCategoryIDs(db *sql.DB, names []string) ([]int, error) {
	var ids []int

	for _, name := range names {
		var id int
		err := db.QueryRow(`SELECT id FROM categories WHERE name = ?`, name).Scan(&id)
		if err != nil {
			if err == sql.ErrNoRows {
				// Create new category
				err = db.QueryRow(`INSERT INTO categories (name) VALUES (?) RETURNING id`, name).Scan(&id)
				if err != nil {
					return nil, fmt.Errorf("could not create category %q: %w", name, err)
				}
			} else {
				return nil, fmt.Errorf("failed to fetch category %q: %w", name, err)
			}
		}
		ids = append(ids, id)
	}
	return ids, nil
}

// ToggleLike toggles a like for a post or comment
func ToggleLike(db *sql.DB, userID string, postID *int, commentID *int, reactionType string) error {
	if reactionType != "like" && reactionType != "dislike" {
		return errors.New("invalid reaction type")
	}
	if (postID == nil && commentID == nil) || (postID != nil && commentID != nil) {
		return errors.New("must provide either postID or commentID, but not both")
	}

	var existingType string
	var query string
	var args []any

	if postID != nil {
		query = `SELECT type FROM likes WHERE user_id = ? AND post_id = ?`
		args = []any{userID, *postID}
	} else {
		query = `SELECT type FROM likes WHERE user_id = ? AND comment_id = ?`
		args = []any{userID, *commentID}
	}

	err := db.QueryRow(query, args...).Scan(&existingType)

	switch {
	case err == sql.ErrNoRows:
		// No existing reaction — insert
		if postID != nil {
			_, err = db.Exec(`INSERT INTO likes (user_id, post_id, type) VALUES (?, ?, ?)`, userID, *postID, reactionType)
		} else {
			_, err = db.Exec(`INSERT INTO likes (user_id, comment_id, type) VALUES (?, ?, ?)`, userID, *commentID, reactionType)
		}
	case err == nil && existingType == reactionType:
		// Same reaction exists — toggle off (delete)
		if postID != nil {
			_, err = db.Exec(`DELETE FROM likes WHERE user_id = ? AND post_id = ?`, userID, *postID)
		} else {
			_, err = db.Exec(`DELETE FROM likes WHERE user_id = ? AND comment_id = ?`, userID, *commentID)
		}
	case err == nil:
		// Different reaction — update
		if postID != nil {
			_, err = db.Exec(`UPDATE likes SET type = ? WHERE user_id = ? AND post_id = ?`, reactionType, userID, *postID)
		} else {
			_, err = db.Exec(`UPDATE likes SET type = ? WHERE user_id = ? AND comment_id = ?`, reactionType, userID, *commentID)
		}
	default:
		return err
	}

	return err
}

func CountLikesAndDislikes(db *sql.DB, postID *int, commentID *int) (likes int, dislikes int, err error) {
	if (postID == nil && commentID == nil) || (postID != nil && commentID != nil) {
		return 0, 0, errors.New("must provide either postID or commentID, but not both")
	}

	var rows *sql.Rows
	if postID != nil {
		rows, err = db.Query(`SELECT type, COUNT(*) FROM likes WHERE post_id = ? GROUP BY type`, *postID)
	} else {
		rows, err = db.Query(`SELECT type, COUNT(*) FROM likes WHERE comment_id = ? GROUP BY type`, *commentID)
	}
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var typ string
		var count int
		if err = rows.Scan(&typ, &count); err != nil {
			return
		}
		if typ == "like" {
			likes = count
		} else if typ == "dislike" {
			dislikes = count
		}
	}
	return
}

// CleanupSessions removes expired sessions
func CleanupSessions(db *sql.DB, expiryHours int) error {
	_, err := db.Exec(`
	DELETE FROM sessions WHERE created_at <= datetime('now', '-'|| ? || ' hours')
`, -expiryHours)
	return err
}

// GetUserIDFromSession retrieves a user ID from a session ID
func GetUserIDFromSession(db *sql.DB, sessionID string) (string, error) {
	var userID string
	err := db.QueryRow(`
		SELECT user_id FROM sessions WHERE id = ?
	`, sessionID).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil // No user found
		}
		return "", err
	}
	return userID, nil
}

// IsUniqueConstraintError checks if an error is due to a unique constraint violation in SQLite
func IsUniqueConstraintError(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "UNIQUE constraint failed")
}

// CreateComment inserts a new comment
func CreateComment(db *sql.DB, userID string, postID int, content string) (models.Comment, error) {
	var comment models.Comment

	query := `
		INSERT INTO comments (user_id, post_id, content)
		VALUES (?, ?, ?)
		RETURNING id, user_id, post_id, content, created_at, updated_at
	`

	err := db.QueryRow(query, userID, postID, content).Scan(
		&comment.ID,
		&comment.UserID,
		&comment.PostID,
		&comment.Content,
		&comment.CreatedAt,
		&comment.UpdatedAt,
	)
	if err != nil {
		return comment, fmt.Errorf("failed to create comment: %w", err)
	}

	return comment, err
}

func CreateReplyComment(db *sql.DB, userID string, parentCommentID int, content string) (models.ReplyComment, error) {
	var reply models.ReplyComment

	query := `
		INSERT INTO replycomments (user_id, parent_comment_id, content)
		VALUES (?, ?, ?)
		RETURNING id, user_id, parent_comment_id, content, created_at, updated_at
	`

	err := db.QueryRow(query, userID, parentCommentID, content).Scan(
		&reply.ID,
		&reply.UserID,
		&reply.ParentCommentID,
		&reply.Content,
		&reply.CreatedAt,
		&reply.UpdatedAt,
	)

	return reply, err
}

// GetPostComments retrieves comments for a specific post
func GetPostComments(db *sql.DB, postID int) ([]models.Comment, error) {
	// Step 1: Fetch top-level comments
	commentRows, err := db.Query(`
		SELECT 
			c.id, c.user_id, c.post_id, c.content,
			c.created_at, c.updated_at, u.username, u.avatar_url
		FROM comments c
		JOIN users u ON u.id = c.user_id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC
	`, postID)
	if err != nil {
		return nil, err
	}
	defer commentRows.Close()

	commentsMap := make(map[int]*models.Comment)
	var comments []models.Comment

	for commentRows.Next() {
		var c models.Comment
		err := commentRows.Scan(
			&c.ID,
			&c.UserID,
			&c.PostID,
			&c.Content,
			&c.CreatedAt,
			&c.UpdatedAt,
			&c.UserName,
			&c.ProfileAvatar,
		)
		if err != nil {
			return nil, err
		}
		comments = append(comments, c)
		commentsMap[c.ID] = &comments[len(comments)-1] // store pointer
	}

	// Step 2: Fetch replies
	replyRows, err := db.Query(`
		SELECT 
			r.id, r.user_id, r.parent_comment_id, r.content,
			r.created_at, r.updated_at, u.username, u.avatar_url
		FROM replycomments r
		JOIN users u ON u.id = r.user_id
		WHERE r.parent_comment_id IN (
			SELECT id FROM comments WHERE post_id = ?
		)
		ORDER BY r.created_at ASC
	`, postID)
	if err != nil {
		return nil, err
	}
	defer replyRows.Close()

	for replyRows.Next() {
		var r models.ReplyComment
		err := replyRows.Scan(
			&r.ID,
			&r.UserID,
			&r.ParentCommentID,
			&r.Content,
			&r.CreatedAt,
			&r.UpdatedAt,
			&r.UserName,
			&r.ProfileAvatar,
		)
		if err != nil {
			return nil, err
		}

		if parent, ok := commentsMap[r.ParentCommentID]; ok {
			parent.Replies = append(parent.Replies, r)
		}
	}

	return comments, nil
}

// CreateCategory inserts a new category
func CreateCategory(db *sql.DB, name string) error {
	_, err := db.Exec(`
		INSERT INTO categories (name)
		VALUES (?)
	`, name)
	return err
}

// GetCategories retrieves all categories
func GetCategories(db *sql.DB) ([]models.Category, error) {
	rows, err := db.Query(`SELECT id, name FROM categories`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var category models.Category
		if err := rows.Scan(&category.ID, &category.Name); err != nil {
			return nil, err
		}
		categories = append(categories, category)
	}
	return categories, nil
}

// GetCategoryNamesByIDs retrieves category names for given category IDs
func GetCategoryNamesByIDs(db *sql.DB, categoryIDs []int) ([]string, error) {
	if len(categoryIDs) == 0 {
		return []string{}, nil
	}

	// Build query with placeholders
	placeholders := make([]string, len(categoryIDs))
	args := make([]interface{}, len(categoryIDs))
	for i, id := range categoryIDs {
		placeholders[i] = "?"
		args[i] = id
	}

	query := fmt.Sprintf(`SELECT name FROM categories WHERE id IN (%s) ORDER BY name`, strings.Join(placeholders, ","))

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		names = append(names, name)
	}
	return names, nil
}

// UpdatePost updates an existing post's title and content
func UpdatePost(db *sql.DB, postID int, title, content string) error {
	_, err := db.Exec(`
		UPDATE posts 
		SET title = ?, content = ?
		WHERE id = ?
	`, title, content, postID)
	return err
}

// DeleteComment removes a comment from the database by its ID
func DeleteComment(db *sql.DB, commentID int) error {
	_, err := db.Exec(`
		DELETE FROM comments WHERE id = ?
	`, commentID)
	return err
}

// GetUserByEmail retrieves a user by email
func GetUserByEmail(db *sql.DB, email string) (models.User, error) {
	var user models.User
	err := db.QueryRow(`
		SELECT id, username, email, password_hash, avatar_url, created_at, updated_at
		FROM users
		WHERE email = ?
	`, email).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.AvatarURL,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return models.User{}, err
	}
	return user, nil
}

// CreateSession creates a new session for a user and returns the session ID
func CreateSession(db *sql.DB, userID string) (string, error) {
	sessionID := uuid.New().String()
	_, err := db.Exec(`
		INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)
	`, sessionID, userID, time.Now())
	if err != nil {
		return "", err
	}
	return sessionID, nil
}

// DeleteSession removes a session from the database
func DeleteSession(db *sql.DB, sessionID string) error {
	_, err := db.Exec(`
		DELETE FROM sessions WHERE id = ?
	`, sessionID)
	return err
}

// DeleteAllUserSessions removes all sessions for a specific user
// This enforces single session policy - only the most recent login persists
func DeleteAllUserSessions(db *sql.DB, userID string) error {
	_, err := db.Exec(`
		DELETE FROM sessions WHERE user_id = ?
	`, userID)
	return err
}

func GetUserByID(db *sql.DB, userID string) (*models.User, error) {
	var user models.User

	query := `
		SELECT id, username, email, password_hash, avatar_url, created_at, updated_at
		FROM users
		WHERE id = ?
	`
	err := db.QueryRow(query, userID).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.AvatarURL,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

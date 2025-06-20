package models

import "time"

type Post struct {
	ID            int       `json:"id" gorm:"primaryKey"`
	ProfileAvatar string    `json:"avatar_url"`
	Title         string    `json:"title" validate:"required" gorm:"not null"`
	Content       string    `json:"content" validate:"required" gorm:"not null"`
	Username      string    `json:"username" gorm:"-"`
	UserID        string    `json:"user_id" gorm:"not null"`
	CategoryIDs   []int     `json:"category_ids" gorm:"-"`   // For multiple categories
	CategoryNames []string  `json:"category_names" gorm:"-"` // Category names for display
	ImageURL      *string   `json:"image_url,omitempty"`
	CreatedAt     time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"forum/models"
	"forum/sqlite"
	"forum/utils"
)

func CreateCategory(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var category models.Category
	err := json.NewDecoder(r.Body).Decode(&category)
	if err != nil {
		http.Error(w, "Invalid category data", http.StatusBadRequest)
		return
	}

	// Validate and sanitize category name
	sanitizedName, err := utils.ValidateAndSanitizeString(category.Name, 50, "category name")
	if err != nil {
		utils.SendJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	err = sqlite.CreateCategory(db, sanitizedName)
	if err != nil {
		utils.SendJSONError(w, "Failed to create category", http.StatusInternalServerError)
		return
	}

	utils.SendJSONResponse(w, category, http.StatusCreated)
}

func GetCategories(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	categories, err := sqlite.GetCategories(db)
	if err != nil {
		utils.SendJSONError(w, "Failed to fetch categories", http.StatusInternalServerError)
		return
	}

	utils.SendJSONResponse(w, categories, http.StatusOK)
}

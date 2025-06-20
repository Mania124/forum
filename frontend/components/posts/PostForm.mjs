/**
 * Post Form - Handles the create post form functionality
 */

import { ApiUtils } from '../utils/ApiUtils.mjs';

export class PostForm {
    constructor(categoryManager, authModal, onPostCreated) {
        this.categoryManager = categoryManager;
        this.authModal = authModal;
        this.onPostCreated = onPostCreated;
        this.form = null;
    }

    /**
     * Render the create post section
     */
    renderCreatePostSection() {
        const createPostContainer = document.getElementById("createPostSection");

        if (!createPostContainer) {
            console.error("Missing #createPostForm in index.html");
            return;
        }

        createPostContainer.innerHTML = `
            <form id="postForm" class="create-post-box" method="post" enctype="multipart/form-data">
                <!-- Title Field -->
                <div class="form-group" style="margin-bottom: 0rem;">
                    <input type="text" id="postTitle" name="title" placeholder="Post title" 
                           style="width: 100%; padding: 8px; margin-bottom: 0px; border: 1px solid #ccc; border-radius: 8px;" />
                </div>

                <!-- Textarea and Post Button Side-by-Side -->
                <div style="display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 1rem;">
                    <textarea id="postInput" name="content" placeholder="What's on your mind?" aria-label="Post content"
                        style="flex: 1; min-height: 40px;"></textarea>
                    <button type="submit" id="postBtn" class="post-btn" style="height: 40px;">Post</button>
                </div>

                <!-- Image and Categories -->
                <div class="post-options-row" style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <!-- Image Upload -->
                    <div class="form-group" style="flex: 1;">
                        <label for="postImage" style="display: relative; align-items: center; gap: 0.5rem; cursor: pointer;">
                        Add Image:
                        </label>
                        <input type="file" id="postImage" name="image" accept="image/*" />
                    </div>

                    <!-- Category Selector -->
                    <div class="form-group" style="flex: 1;">
                        <label for="categoryDropdown" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-color);">Categories</label>
                        <div id="categoryDropdown" class="dropdown">
                            <div id="dropdownToggle" class="dropdown-toggle" tabindex="0" role="button" aria-haspopup="listbox" aria-expanded="false">
                                <span id="dropdownText">Select categories</span>
                            </div>
                            <div id="dropdownMenu" class="dropdown-menu hidden" role="listbox">
                                <!-- Categories will load here -->
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        `;

        this.form = document.getElementById("postForm");
        this.categoryManager.setupCategoryDropdown();
        this.bindPostFormSubmit();
    }

    /**
     * Bind form submission event
     */
    bindPostFormSubmit() {
        if (!this.form) return;

        this.form.addEventListener("submit", (event) => this.handlePostFormSubmit(event));
    }

    /**
     * Handle post form submission
     * @param {Event} event - Form submission event
     */
    async handlePostFormSubmit(event) {
        event.preventDefault();

        const formData = this.getFormData();
        const validation = this.validateFormData(formData);

        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        const submitFormData = this.buildSubmissionData(formData);

        try {
            const result = await ApiUtils.post('/api/posts/create', submitFormData, true, true);

            // Success! Reset form and notify parent
            this.resetForm();
            
            if (this.onPostCreated) {
                await this.onPostCreated();
            }
        } catch (error) {
            const errorInfo = ApiUtils.handleError(error, 'post creation');
            
            if (errorInfo.requiresAuth) {
                this.authModal.showLoginModal();
            } else {
                alert(`Failed to create post: ${errorInfo.message}`);
            }
        }
    }

    /**
     * Get form data
     * @returns {Object} - Form data object
     */
    getFormData() {
        return {
            title: this.form.querySelector('#postTitle').value.trim(),
            content: this.form.querySelector('#postInput').value.trim(),
            imageInput: this.form.querySelector('#postImage'),
            selectedCategories: this.categoryManager.getSelectedCategories()
        };
    }

    /**
     * Validate form data
     * @param {Object} formData - Form data to validate
     * @returns {Object} - Validation result
     */
    validateFormData(formData) {
        if (!formData.title) {
            return { valid: false, error: "Title is required." };
        }

        if (!formData.content) {
            return { valid: false, error: "Your post can't be empty!" };
        }

        if (formData.selectedCategories.length === 0) {
            return { valid: false, error: "Please select at least one category." };
        }

        return { valid: true };
    }

    /**
     * Build FormData for submission
     * @param {Object} formData - Validated form data
     * @returns {FormData} - FormData object for submission
     */
    buildSubmissionData(formData) {
        const submitFormData = new FormData();

        submitFormData.append("title", formData.title);
        submitFormData.append("content", formData.content);

        if (formData.imageInput && formData.imageInput.files[0]) {
            submitFormData.append("image", formData.imageInput.files[0]);
        }

        console.log("DEBUG: Selected categories:", formData.selectedCategories);
        submitFormData.append("category_names", JSON.stringify(formData.selectedCategories));
        console.log("DEBUG: Sending category_names as JSON:", JSON.stringify(formData.selectedCategories));

        return submitFormData;
    }

    /**
     * Reset the form after successful submission
     */
    resetForm() {
        this.form.reset();
        this.categoryManager.resetCategoryDropdown();
    }
}

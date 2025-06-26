/**
 * Saved View - Shows user's saved posts
 */

import { BaseView } from './BaseView.mjs';

export class MyPostsView extends BaseView {
    constructor(app, params, query) {
        super(app, params, query);
    }

    /**
     * Render the saved view
     * @param {HTMLElement} container - Container element
     */
    async render(container) {
        try {
            // Check authentication
            if (!await this.isAuthenticated()) {
                this.showAuthModal();
                this.app.router.navigate('/', true);
                return;
            }

            // Clear container
            container.innerHTML = '';

            // Show loading state
            container.appendChild(this.createLoadingElement());

            // Create saved view
            await this.renderSavedContent(container);

        } catch (error) {
            console.error('Error rendering saved view:', error);
            container.innerHTML = '';
            container.appendChild(this.createErrorElement(
                'Failed to load saved posts.',
                () => this.render(container)
            ));
        }
    }

    /**
     * Render saved content
     * @param {HTMLElement} container - Container element
     */
    async renderSavedContent(container) {
        container.innerHTML = '';

        const savedContent = document.createElement('div');
        savedContent.className = 'my-posts-view';
        savedContent.innerHTML = `
            <div class="my-posts-header">
                <h1>My Posts</h1>
                <p>All your created posts are listed here.</p>
            </div>

            <div class="my-posts-content">
                <div class="created-posts" id="myPosts">
                    <div class="loading">Loading your posts...</div>
                </div>
            </div>
        `;

        container.appendChild(savedContent);

        // Setup event listeners
        this.setupEventListeners();

        // Load saved posts
        await this.loadMyPosts('all');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-filter');
                
                // Update active state
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Load filtered data
                this.loadMyPosts(filter);
            });
        });
    }

    /**
     * Load saved posts
     * @param {string} filter - Filter type
     */
    async loadMyPosts(filter) {
        const postsContainer = document.getElementById('myPosts');
        if (!postsContainer) return;

        try {
            postsContainer.innerHTML = '<div class="loading">Loading your  posts...</div>';

            // This would typically fetch saved posts from the API
            // For now, we'll show a placeholder since saved posts functionality isn't implemented yet
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No Posts Yet</h3>
                    <p>Start Creating Your Own Posts!</p>
                    <button class="create-posts-btn">Create Posts</button>
                </div>
            `;

            // Add event listener for browse button
            const browseBtn = postsContainer.querySelector('.create-posts-btn');
            if (browseBtn) {
                browseBtn.addEventListener('click', () => {
                    this.app.router.navigate('/');
                });
            }

        } catch (error) {
            console.error('Error loading your created posts:', error);
            postsContainer.innerHTML = '';
            postsContainer.appendChild(this.createErrorElement(
                'Failed to load your posts.',
                () => this.loadMyPosts(filter)
            ));
        }
    }

    /**
     * Remove post from saved list
     * @param {number} postId - Post ID to remove
     */
    async removeSavedPost(postId) {
        try {
            // This would typically make an API call to remove the saved post
            console.log(`Removing saved post ${postId}`);
            
            // Refresh the saved posts list
            await this.loadMyPosts('all');
            
        } catch (error) {
            console.error('Error removing saved post:', error);
            alert('Failed to remove saved post.');
        }
    }
}

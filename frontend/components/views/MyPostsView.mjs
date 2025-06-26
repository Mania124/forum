/**
 * My Posts View - Shows user's created posts
 */

import { BaseView } from './BaseView.mjs';

export class MyPostsView extends BaseView {
    constructor(app, params, query) {
        super(app, params, query);
    }

    /**
     * Render the my posts view
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

            // Create my posts view
            await this.renderMyPostsContent(container);

        } catch (error) {
            console.error('Error rendering my posts view:', error);
            container.innerHTML = '';
            container.appendChild(this.createErrorElement(
                'Failed to load my posts.',
                () => this.render(container)
            ));
        }
    }

    /**
     * Render my posts content
     * @param {HTMLElement} container - Container element
     */
    async renderMyPostsContent(container) {
        container.innerHTML = '';

        const myPostsContent = document.createElement('div');
        myPostsContent.className = 'my-posts-view';
        myPostsContent.innerHTML = `
            <div class="my-posts-header">
                <h1>My Posts</h1>
                <p>All your created posts are listed here.</p>
            </div>

            <div class="my-posts-filters">
                <button class="filter-btn active" data-filter="all">All Posts</button>
                <button class="filter-btn" data-filter="recent">Recent</button>
                <button class="filter-btn" data-filter="popular">Popular</button>
            </div>

            <div class="my-posts-content">
                <div class="created-posts" id="myPosts">
                    <div class="loading">Loading your posts...</div>
                </div>
            </div>
        `;

        container.appendChild(myPostsContent);

        // Setup event listeners
        this.setupEventListeners();

        // Load my posts
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
     * Load my posts
     * @param {string} filter - Filter type
     */
    async loadMyPosts(filter) {
        const postsContainer = document.getElementById('myPosts');
        if (!postsContainer) return;

        try {
            postsContainer.innerHTML = '<div class="loading">Loading your posts...</div>';

            // Get current user
            const currentUser = this.app.authManager.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not authenticated');
            }

            // Fetch all posts and filter by current user
            const allPosts = await this.app.postManager.fetchForumPosts();

            // Filter posts by current user's ID
            const myPosts = allPosts.filter(post => post.user_id === currentUser.id);

            // Apply additional filtering if needed
            let filteredPosts = myPosts;
            if (filter === 'recent') {
                filteredPosts = myPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else if (filter === 'popular') {
                // Sort by likes/reactions if available
                filteredPosts = myPosts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            }

            postsContainer.innerHTML = '';

            if (filteredPosts.length === 0) {
                postsContainer.innerHTML = `
                    <div class="empty-state">
                        <h3>No Posts Yet</h3>
                        <p>Start Creating Your Own Posts!</p>
                        <button class="btn-primary create-posts-btn">Create Posts</button>
                    </div>
                `;

                // Add event listener for create button
                const createBtn = postsContainer.querySelector('.create-posts-btn');
                if (createBtn) {
                    createBtn.addEventListener('click', () => {
                        this.app.router.navigate('/');
                    });
                }
                return;
            }

            // Render posts using PostCard component
            for (const post of filteredPosts) {
                // Import PostCard dynamically
                const { PostCard } = await import('../posts/PostCard.mjs');
                const postCard = PostCard.create(post);

                // Add my-posts specific styling
                postCard.classList.add('my-post-card');

                // Setup comment toggle for this post
                PostCard.setupCommentToggle(postCard);

                postsContainer.appendChild(postCard);
            }

            // Load additional data for posts (reactions, etc.)
            await this.loadPostsData(filteredPosts);

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
     * Load additional data for posts (reactions, comments count)
     * @param {Array} posts - Posts to load data for
     */
    async loadPostsData(posts) {
        try {
            // Load reactions for all posts
            await this.app.getReactionManager().loadPostsLikes();

            // Update comment counts for all posts
            for (const post of posts) {
                try {
                    await this.app.postManager.updatePostComments(post.id);
                } catch (error) {
                    console.error(`Error updating comments for post ${post.id}:`, error);
                }
            }
        } catch (error) {
            console.error('Error loading posts data:', error);
        }
    }

    /**
     * Remove post from my posts list
     * @param {number} postId - Post ID to remove
     */
    async removeMyPost(postId) {
        try {
            // This would typically make an API call to remove the my post
            console.log(`Removing my post ${postId}`);

            // Refresh the my posts list
            await this.loadMyPosts('all');

        } catch (error) {
            console.error('Error removing my post:', error);
            alert('Failed to remove my post.');
        }
    }
}

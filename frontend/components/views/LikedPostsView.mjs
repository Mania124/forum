/**
 * Liked Posts View - Shows posts liked by the current user
 */

import { BaseView } from './BaseView.mjs';

export class LikedPostsView extends BaseView {
    constructor(app, params, query) {
        super(app, params, query);
    }

    /**
     * Render the liked posts view
     * @param {HTMLElement} container - Container element
     */
    async render(container) {
        console.log('LikedPostsView: Starting render');
        try {
            // Check authentication
            console.log('LikedPostsView: Checking authentication');
            const isAuth = await this.isAuthenticated();
            console.log('LikedPostsView: Authentication status:', isAuth);

            if (!isAuth) {
                console.log('LikedPostsView: User not authenticated, showing auth modal');
                this.showAuthModal();
                this.app.router.navigate('/', true);
                return;
            }

            // Clear container
            container.innerHTML = '';

            // Show loading state
            container.appendChild(this.createLoadingElement());

            // Create liked posts view
            console.log('LikedPostsView: Rendering liked posts content');
            await this.renderLikedPostsContent(container);
            console.log('LikedPostsView: Render completed successfully');

        } catch (error) {
            console.error('Error rendering liked posts view:', error);
            container.innerHTML = '';
            container.appendChild(this.createErrorElement(
                'Failed to load liked posts.',
                () => this.render(container)
            ));
        }
    }

    /**
     * Render liked posts content
     * @param {HTMLElement} container - Container element
     */
    async renderLikedPostsContent(container) {
        container.innerHTML = '';

        const likedPostsContent = document.createElement('div');
        likedPostsContent.className = 'liked-posts-view';
        likedPostsContent.innerHTML = `
            <div class="liked-posts-header">
                <h1><i class="fas fa-heart"></i> Liked Posts</h1>
                <p>All posts you've liked are listed here.</p>
            </div>

            <div class="liked-posts-filters">
                <button class="filter-btn active" data-filter="all">All Liked</button>
                <button class="filter-btn" data-filter="recent">Recent</button>
                <button class="filter-btn" data-filter="popular">Popular</button>
            </div>

            <div class="liked-posts-content">
                <div class="liked-posts-list" id="likedPosts">
                    <div class="loading">Loading your liked posts...</div>
                </div>
            </div>
        `;

        container.appendChild(likedPostsContent);

        // Setup event listeners
        this.setupEventListeners();

        // Load liked posts
        await this.loadLikedPosts('all');
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
                this.loadLikedPosts(filter);
            });
        });
    }

    /**
     * Load liked posts
     * @param {string} filter - Filter type
     */
    async loadLikedPosts(filter) {
        const postsContainer = document.getElementById('likedPosts');
        if (!postsContainer) return;

        try {
            postsContainer.innerHTML = '<div class="loading">Loading your liked posts...</div>';

            // Fetch liked posts from the API
            const likedPosts = await this.fetchLikedPosts();
            console.log('LikedPostsView: Liked posts fetched:', likedPosts);

            // Apply additional filtering if needed
            let filteredPosts = likedPosts;
            if (filter === 'recent') {
                filteredPosts = likedPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else if (filter === 'popular') {
                // Sort by likes/reactions if available
                filteredPosts = likedPosts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            }

            // Clear loading state
            postsContainer.innerHTML = '';

            if (filteredPosts.length === 0) {
                postsContainer.innerHTML = `
                    <div class="no-posts">
                        <div class="no-posts-icon">
                            <i class="fas fa-heart"></i>
                        </div>
                        <h3>No liked posts yet</h3>
                        <p>Posts you like will appear here. Start exploring and like some posts!</p>
                        <button class="explore-btn" onclick="window.location.href='/'"><i class="fas fa-compass"></i> Explore Posts</button>
                    </div>
                `;
                return;
            }

            // Render posts using PostCard component
            for (const post of filteredPosts) {
                // Import PostCard dynamically
                const { PostCard } = await import('../posts/PostCard.mjs');
                const postCard = PostCard.create(post);

                // Add liked-posts specific styling
                postCard.classList.add('liked-post-card');

                // Setup comment toggle for this post
                PostCard.setupCommentToggle(postCard);

                postsContainer.appendChild(postCard);
            }

            // Load additional data for posts (reactions, etc.)
            await this.loadPostsData(filteredPosts);

        } catch (error) {
            console.error('Error loading liked posts:', error);
            postsContainer.innerHTML = '';
            postsContainer.appendChild(this.createErrorElement(
                'Failed to load your liked posts.',
                () => this.loadLikedPosts(filter)
            ));
        }
    }

    /**
     * Fetch liked posts from the API
     * @returns {Array} - Array of liked posts
     */
    async fetchLikedPosts() {
        try {
            console.log('LikedPostsView: Fetching liked posts from API');
            const { ApiUtils } = await import('../utils/ApiUtils.mjs');
            console.log('LikedPostsView: ApiUtils imported, making request to /api/posts/liked');
            const likedPosts = await ApiUtils.get('/api/posts/liked', true); // requireAuth = true
            console.log('LikedPostsView: Received liked posts:', likedPosts);
            return likedPosts || [];
        } catch (error) {
            console.error('Error fetching liked posts:', error);
            throw error;
        }
    }

    /**
     * Load additional data for posts (reactions, comments count, etc.)
     * @param {Array} posts - Array of posts
     */
    async loadPostsData(posts) {
        try {
            // Load reactions for all posts
            await this.app.getReactionManager().loadPostsLikes();
            
            // Load comments count if needed
            // This could be extended to load comment counts for each post
            
        } catch (error) {
            console.error('Error loading posts data:', error);
        }
    }
}

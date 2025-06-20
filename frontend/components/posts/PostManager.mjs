/**
 * Post Manager - Handles post fetching, rendering, and management
 */

import { ApiUtils } from '../utils/ApiUtils.mjs';
import { PostCard } from './PostCard.mjs';

export class PostManager {
    constructor(reactionManager, commentManager) {
        this.posts = [];
        this.filteredPosts = [];
        this.reactionManager = reactionManager;
        this.commentManager = commentManager;
        this.postContainer = document.getElementById("postFeed");
        this.router = null; // Will be set by the app
        this.app = null; // Will be set by the app

        // Pagination state
        this.currentPage = 1;
        this.postsPerPage = 10;
        this.hasMorePosts = true;
        this.isLoading = false;
    }

    /**
     * Set router instance for navigation
     * @param {Object} router - Router instance
     */
    setRouter(router) {
        this.router = router;
    }

    /**
     * Set app instance for accessing other managers
     * @param {Object} app - App instance
     */
    setApp(app) {
        this.app = app;
    }

    /**
     * Fetch forum posts with pagination support
     * @param {boolean} loadMore - Whether to load more posts (append) or reset (replace)
     * @returns {Array} - Array of posts
     */
    async fetchForumPosts(loadMore = false) {
        if (this.isLoading) return this.posts;

        try {
            this.isLoading = true;

            const page = loadMore ? this.currentPage + 1 : 1;
            const url = `/api/posts?page=${page}&limit=${this.postsPerPage}`;

            const newPosts = await ApiUtils.get(url);
            const postsArray = newPosts || [];

            if (loadMore) {
                // Append new posts to existing ones
                this.posts = [...this.posts, ...postsArray];
                this.currentPage = page;
            } else {
                // Replace posts (initial load or refresh)
                this.posts = postsArray;
                this.currentPage = 1;
            }

            // Update hasMorePosts flag
            this.hasMorePosts = postsArray.length === this.postsPerPage;

            this.filteredPosts = [...this.posts];

            return this.posts;

        } catch (error) {
            console.error("Error fetching posts:", error);
            if (!loadMore) {
                this.posts = [];
                this.filteredPosts = [];
            }
            return this.posts;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Render posts in the feed
     * @param {Array} posts - Posts to render (optional, uses this.posts if not provided)
     * @param {boolean} append - Whether to append posts or replace existing ones
     */
    async renderPosts(posts = null, append = false) {
        const postsToRender = posts || this.posts;

        // Ensure we have a valid container
        if (!this.postContainer) {
            this.postContainer = document.getElementById("postFeed");
        }

        if (!this.postContainer) {
            console.error("Post container not found");
            return;
        }

        // Clear container only if not appending
        if (!append) {
            this.postContainer.innerHTML = "";
        }

        // Render posts in chronological order (most recent first)
        // Backend sends posts ordered by created_at DESC, we preserve this order
        for (const post of postsToRender) {
            const postCard = PostCard.create(post);

            // Setup comment toggle for this post
            PostCard.setupCommentToggle(postCard);

            // Setup post navigation for this post (pass app instance instead of router)
            PostCard.setupPostNavigation(postCard, this.app);

            // Append to container - maintains chronological order from backend
            this.postContainer.appendChild(postCard);
        }

        // Add pagination controls
        this.renderPaginationControls();

        // Load additional data for posts (only for new posts if appending)
        if (append) {
            await this.loadPostsDataForNewPosts(postsToRender);
        } else {
            await this.loadPostsData();
        }
    }

    /**
     * Load additional data for posts (likes, comments, etc.)
     */
    async loadPostsData() {
        await this.reactionManager.loadPostsLikes();
        await this.loadPostsComments();
        await this.reactionManager.loadCommentsLikes();
        this.commentManager.initializeCommentForms();
    }

    /**
     * Load additional data for specific posts (used when appending new posts)
     * @param {Array} posts - Posts to load data for
     */
    async loadPostsDataForNewPosts(posts) {
        // Load likes for new posts
        await this.reactionManager.loadPostsLikes();

        // Load comments for new posts only
        for (const post of posts) {
            const postId = post.id;
            try {
                const comments = await ApiUtils.get(`/api/comments/get?post_id=${postId}`);
                const commentsArray = comments && Array.isArray(comments) ? comments : [];

                let totalCommentCount = commentsArray.length;
                commentsArray.forEach(comment => {
                    const replies = comment.replies || comment.Replies;
                    if (replies && Array.isArray(replies)) {
                        totalCommentCount += replies.length;
                    }
                });

                PostCard.updateCommentCount(postId, totalCommentCount);

                const commentsContainer = PostCard.getCommentsContainer(postId);
                if (commentsContainer) {
                    this.renderCommentsInContainer(commentsContainer, commentsArray);
                }
            } catch (error) {
                console.error(`Error loading comments for post ${postId}:`, error);
                PostCard.updateCommentCount(postId, 0);
            }
        }

        await this.reactionManager.loadCommentsLikes();
        this.commentManager.initializeCommentForms();
    }

    /**
     * Render pagination controls
     */
    renderPaginationControls() {
        // Remove existing pagination controls
        const existingControls = document.querySelector('.pagination-controls');
        if (existingControls) {
            existingControls.remove();
        }

        // Create pagination controls container
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-controls';

        if (this.hasMorePosts && !this.isLoading) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'load-more-btn';
            loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i> Load More Posts';
            loadMoreBtn.addEventListener('click', () => this.loadMorePosts());
            paginationContainer.appendChild(loadMoreBtn);
        } else if (this.isLoading) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-more';
            loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading more posts...';
            paginationContainer.appendChild(loadingDiv);
        } else if (!this.hasMorePosts && this.posts.length > 0) {
            const endDiv = document.createElement('div');
            endDiv.className = 'end-of-posts';
            endDiv.innerHTML = '<i class="fas fa-check"></i> You\'ve reached the end!';
            paginationContainer.appendChild(endDiv);
        }

        // Add pagination controls after the post container
        if (this.postContainer && paginationContainer.children.length > 0) {
            this.postContainer.parentNode.insertBefore(paginationContainer, this.postContainer.nextSibling);
        }
    }

    /**
     * Load more posts (pagination)
     */
    async loadMorePosts() {
        if (this.isLoading || !this.hasMorePosts) return;

        try {
            const currentPostCount = this.posts.length;
            await this.fetchForumPosts(true); // loadMore = true

            // Get only the new posts that were added
            const newPosts = this.posts.slice(currentPostCount);

            if (newPosts.length > 0) {
                await this.renderPosts(newPosts, true); // append = true
            }
        } catch (error) {
            console.error('Error loading more posts:', error);
        }
    }

    /**
     * Load comments for all posts
     */
    async loadPostsComments() {
        const commentBtns = document.querySelectorAll(".comment-btn");

        for (const btn of commentBtns) {
            const postId = btn.getAttribute('data-id');

            try {
                const comments = await ApiUtils.get(`/api/comments/get?post_id=${postId}`);

                // Handle null or undefined responses by treating them as empty arrays
                const commentsArray = comments && Array.isArray(comments) ? comments : [];

                // Update comment count
                // Calculate total comment count (including replies)
                let totalCommentCount = commentsArray.length;
                commentsArray.forEach(comment => {
                    // Check both 'replies' and 'Replies' for compatibility
                    const replies = comment.replies || comment.Replies;
                    if (replies && Array.isArray(replies)) {
                        console.log(`Comment ${comment.id} has ${replies.length} replies in PostManager`); // Debug log
                        totalCommentCount += replies.length;
                    }
                });

                PostCard.updateCommentCount(postId, totalCommentCount);

                // Render comments with replies
                const commentsContainer = PostCard.getCommentsContainer(postId);
                if (commentsContainer) {
                    this.renderCommentsInContainer(commentsContainer, commentsArray);
                }
            } catch (error) {
                console.error(`Error loading comments for post ${postId}:`, error);
                // Set comment count to 0 on error
                PostCard.updateCommentCount(postId, 0);
            }
        }
    }

    /**
     * Render comments in a container with proper threading
     * @param {HTMLElement} container - Comments container
     * @param {Array} comments - Comments to render
     */
    renderCommentsInContainer(container, comments) {
        // Keep the header
        const header = container.querySelector('h4');
        container.innerHTML = '';
        if (header) {
            container.appendChild(header);
        } else {
            container.innerHTML = '<h4>Comments</h4>';
        }

        // Render each top-level comment with its own independent thread
        for (const comment of comments) {
            // Create a comment thread container for this specific comment
            const commentThreadContainer = document.createElement('div');
            commentThreadContainer.classList.add('comment-thread');
            commentThreadContainer.setAttribute('data-comment-id', comment.id);

            // Create the main comment element
            const commentElement = this.commentManager.createCommentElement(comment);
            commentThreadContainer.appendChild(commentElement);

            // Render replies directly under this specific comment
            const replies = comment.replies || comment.Replies;
            if (replies && Array.isArray(replies) && replies.length > 0) {
                console.log(`Rendering ${replies.length} replies for comment ${comment.id} in PostManager`); // Debug log
                this.commentManager.renderRepliesForComment(commentElement, replies);
            }

            // Add the complete thread (comment + replies) to the comments container
            container.appendChild(commentThreadContainer);
        }
    }

    /**
     * Filter posts by category
     * @param {number} categoryId - Category ID (0 for all)
     */
    async filterPostsByCategory(categoryId) {
        if (categoryId === 0) {
            this.filteredPosts = this.posts;
        } else {
            this.filteredPosts = this.posts.filter(post => 
                post.category_ids && post.category_ids.includes(categoryId)
            );
        }

        await this.renderPosts(this.filteredPosts);
    }

    /**
     * Refresh posts (fetch and render)
     */
    async refreshPosts() {
        // Reset pagination state
        this.currentPage = 1;
        this.hasMorePosts = true;

        await this.fetchForumPosts(false); // loadMore = false (reset)
        await this.renderPosts();
    }

    /**
     * Get all posts
     * @returns {Array} - Array of posts
     */
    getPosts() {
        return this.posts;
    }

    /**
     * Get filtered posts
     * @returns {Array} - Array of filtered posts
     */
    getFilteredPosts() {
        return this.filteredPosts;
    }

    /**
     * Add a new post to the beginning of the posts array
     * @param {Object} post - New post object
     */
    addPost(post) {
        this.posts.unshift(post);
        this.filteredPosts.unshift(post);
    }

    /**
     * Update comment count for a specific post
     * @param {string} postId - Post ID
     */
    async updatePostComments(postId) {
        try {
            const comments = await ApiUtils.get(`/api/comments/get?post_id=${postId}`);

            // Handle null or undefined responses by treating them as empty arrays
            const commentsArray = comments && Array.isArray(comments) ? comments : [];

            // Calculate total comment count (including replies)
            let totalCommentCount = commentsArray.length;
            commentsArray.forEach(comment => {
                // Check both 'replies' and 'Replies' for compatibility
                const replies = comment.replies || comment.Replies;
                if (replies && Array.isArray(replies)) {
                    totalCommentCount += replies.length;
                }
            });

            PostCard.updateCommentCount(postId, totalCommentCount);

            const commentsContainer = PostCard.getCommentsContainer(postId);
            if (commentsContainer) {
                this.renderCommentsInContainer(commentsContainer, commentsArray);
            }

            // Refresh comment likes
            await this.reactionManager.loadCommentsLikes();
        } catch (error) {
            console.error(`Error updating comments for post ${postId}:`, error);
            // Set comment count to 0 on error
            PostCard.updateCommentCount(postId, 0);
        }
    }

    /**
     * Get a post by ID (fetch from API if not in cache)
     * @param {string} postId - Post ID
     * @returns {Object} - Post data
     */
    async getPostById(postId) {
        // First check if we have it in our cached posts
        const cachedPost = this.posts.find(post => post.id.toString() === postId.toString());
        if (cachedPost) {
            return cachedPost;
        }

        // If not cached, fetch from API
        try {
            const post = await ApiUtils.get(`/api/posts/${postId}`);
            return post;
        } catch (error) {
            console.error('Error fetching post by ID:', error);
            throw error;
        }
    }
}

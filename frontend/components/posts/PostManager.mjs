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
     * Fetch all forum posts
     * @returns {Array} - Array of posts
     */
    async fetchForumPosts() {
        try {
            this.posts = await ApiUtils.get("/api/posts");
            return this.posts;
        } catch (error) {
            console.error("Error fetching posts:", error);
            return [];
        }
    }

    /**
     * Render posts in the feed
     * @param {Array} posts - Posts to render (optional, uses this.posts if not provided)
     */
    async renderPosts(posts = null) {
        const postsToRender = posts || this.posts;

        // Ensure we have a valid container
        if (!this.postContainer) {
            this.postContainer = document.getElementById("postFeed");
        }

        if (!this.postContainer) {
            console.error("Post container not found");
            return;
        }

        this.postContainer.innerHTML = "";

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

        // Load additional data for posts
        await this.loadPostsData();
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
        await this.fetchForumPosts();
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

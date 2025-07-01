/**
 * Reaction Manager - Handles likes and dislikes for posts and comments
 */

import { ApiUtils } from '../utils/ApiUtils.mjs';

export class ReactionManager {
    constructor(authModal) {
        this.authModal = authModal;
        this.setupGlobalEventListeners();
    }

    /**
     * Setup global event listeners for reaction buttons
     */
    setupGlobalEventListeners() {
        document.addEventListener("click", async (event) => {
            const likeBtn = event.target.closest(".like-btn");
            const dislikeBtn = event.target.closest(".dislike-btn");
            const commentLikeBtn = event.target.closest(".comment-like-btn");
            const commentDislikeBtn = event.target.closest(".comment-dislike-btn");

            if (likeBtn) {
                await this.handlePostReaction(likeBtn, "like");
                return;
            }

            if (dislikeBtn) {
                await this.handlePostReaction(dislikeBtn, "dislike");
                return;
            }

            if (commentLikeBtn) {
                await this.handleCommentReaction(commentLikeBtn, "like");
                return;
            }

            if (commentDislikeBtn) {
                await this.handleCommentReaction(commentDislikeBtn, "dislike");
                return;
            }
        });
    }

    /**
     * Handle post like/dislike reactions
     * @param {HTMLElement} button - The clicked button
     * @param {string} type - "like" or "dislike"
     */
    async handlePostReaction(button, type) {
        const postID = button.dataset.id;
        
        try {
            const result = await ApiUtils.post(
                `/api/likes/toggle`, 
                { post_id: parseInt(postID), type }, 
                true
            );
            
            await this.loadPostsLikes();
        } catch (error) {
            const errorInfo = ApiUtils.handleError(error, 'post reaction');
            
            if (errorInfo.requiresAuth) {
                this.authModal.showLoginModal();
            } else {
                alert(errorInfo.message);
            }
        }
    }

    /**
     * Handle comment like/dislike reactions
     * @param {HTMLElement} button - The clicked button
     * @param {string} type - "like" or "dislike"
     */
    async handleCommentReaction(button, type) {
        const commentID = button.dataset.id;
        
        try {
            const result = await ApiUtils.post(
                `/api/likes/toggle`, 
                { comment_id: parseInt(commentID), type }, 
                true
            );
            
            await this.loadCommentsLikes();
        } catch (error) {
            const errorInfo = ApiUtils.handleError(error, 'comment reaction');
            
            if (errorInfo.requiresAuth) {
                this.authModal.showLoginModal();
            } else {
                alert(errorInfo.message);
            }
        }
    }

    /**
     * Load and display likes/dislikes for all posts
     */
    async loadPostsLikes() {
        const reactionBtns = document.querySelectorAll(".reaction-btn");

        for (const btn of reactionBtns) {
            const postId = btn.getAttribute('data-id');
            
            // Skip if this is a comment reaction button
            if (btn.classList.contains('comment-like-btn') || btn.classList.contains('comment-dislike-btn')) {
                continue;
            }
            
            try {
                const result = await ApiUtils.get(`/api/likes/reactions?post_id=${postId}`);

                if (btn.classList.contains('like-btn')) {
                    let span = btn.querySelector(".like-count");
                    if (!span) {
                        span = document.createElement("span");
                        span.className = "like-count";
                        btn.appendChild(span);
                    }
                    span.textContent = `${result.likes === 0 ? '' : result.likes + ' '}Likes`;
                }

                if (btn.classList.contains('dislike-btn')) {
                    let span = btn.querySelector(".dislike-count");
                    if (!span) {
                        span = document.createElement("span");
                        span.className = "dislike-count";
                        btn.appendChild(span);
                    }
                    span.textContent = `${result.dislikes === 0 ? '' : result.dislikes + ' '}Dislikes`;
                }
            } catch (error) {
                console.error(`Error loading reactions for post ${postId}:`, error);
            }
        }
    }

    /**
     * Load and display likes/dislikes for all comments
     */
    async loadCommentsLikes() {
        const reactionBtns = document.querySelectorAll(".comment-actions .reaction-btn");

        for (const btn of reactionBtns) {
            const commentId = btn.getAttribute('data-id');
            
            try {
                const result = await ApiUtils.get(`/api/likes/reactions?comment_id=${commentId}`);

                if (btn.classList.contains('comment-like-btn')) {
                    const countSpan = btn.querySelector('.like-count');
                    if (countSpan) {
                        countSpan.textContent = result.likes || 0;
                        // Hide count if zero for cleaner look
                        countSpan.style.display = result.likes > 0 ? 'inline' : 'none';
                    }

                    // Add active state if user has liked
                    if (result.userReaction === 'like') {
                        btn.classList.add('active', 'liked');
                        btn.classList.remove('disliked');
                    } else {
                        btn.classList.remove('active', 'liked');
                    }
                }

                if (btn.classList.contains('comment-dislike-btn')) {
                    const countSpan = btn.querySelector('.dislike-count');
                    if (countSpan) {
                        countSpan.textContent = result.dislikes || 0;
                        // Hide count if zero for cleaner look
                        countSpan.style.display = result.dislikes > 0 ? 'inline' : 'none';
                    }

                    // Add active state if user has disliked
                    if (result.userReaction === 'dislike') {
                        btn.classList.add('active', 'disliked');
                        btn.classList.remove('liked');
                    } else {
                        btn.classList.remove('active', 'disliked');
                    }
                }
            } catch (error) {
                console.error(`Error loading reactions for comment ${commentId}:`, error);
            }
        }
    }

    /**
     * Get reactions for a specific post
     * @param {number} postId - Post ID
     * @returns {Object} - Object with likes and dislikes counts
     */
    async getPostReactions(postId) {
        try {
            const result = await ApiUtils.get(`/api/likes/reactions?post_id=${postId}`);
            return {
                likes: result.likes || 0,
                dislikes: result.dislikes || 0
            };
        } catch (error) {
            console.error(`Error getting reactions for post ${postId}:`, error);
            return { likes: 0, dislikes: 0 };
        }
    }

    /**
     * Get reactions for a specific comment
     * @param {number} commentId - Comment ID
     * @returns {Object} - Object with likes and dislikes counts
     */
    async getCommentReactions(commentId) {
        try {
            const result = await ApiUtils.get(`/api/likes/reactions?comment_id=${commentId}`);
            return {
                likes: result.likes || 0,
                dislikes: result.dislikes || 0
            };
        } catch (error) {
            console.error(`Error getting reactions for comment ${commentId}:`, error);
            return { likes: 0, dislikes: 0 };
        }
    }
}

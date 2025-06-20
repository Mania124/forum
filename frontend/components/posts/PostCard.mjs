/**
 * Post Card - Handles rendering of individual post cards
 */

import { TimeUtils } from '../utils/TimeUtils.mjs';

export class PostCard {
    /**
     * Create a post card element
     * @param {Object} post - Post data
     * @param {Object} options - Options for post card creation
     * @returns {HTMLElement} - Post card element
     */
    static create(post, options = {}) {
        const postDiv = document.createElement("div");
        postDiv.classList.add("post-card");

        // Add clickable class if navigation is enabled
        if (options.enableNavigation !== false) {
            postDiv.classList.add("post-card-clickable");
        }

        postDiv.innerHTML = `
            <div class="post-header">
                <div class="post-author-info">
                    <img class="post-author-img" src="http://localhost:8080${post.avatar_url || '/static/pictures/default-avatar.png'}"
                         alt="Profile" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlNWU3ZWIiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSIjOWNhM2FmIi8+CjxwYXRoIGQ9Ik0xMiAxNEM5LjMzIDEzLjk5IDcuMDEgMTUuNjIgNiAxOEMxMC4wMSAyMCAxMy45OSAyMCAxOCAxOEMxNi45OSAxNS42MiAxNC42NyAxMy45OSAxMiAxNFoiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+Cjwvc3ZnPgo8L3N2Zz4K'">
                    <span class="post-author-name">${post.username}</span>
                </div>
                <span class="post-time">${TimeUtils.getTimeAgo(post.created_at)}</span>
            </div>
            <div class="post-content">
                <div class="post-title">${post.title}</div>
                ${PostCard.renderCategories(post.category_names || [])}
                <div class="post-image hidden">
                    <img src="http://localhost:8080${post.image_url || ''}" alt="Post image" onerror="this.parentElement.innerHTML='<div class=\\'image-error\\'>Image unavailable</div>'"/>
                </div>
                <div class="post-body">${post.content}</div>
            </div>
            <div class="post-actions">
                <button class="reaction-btn like-btn" data-id="${post.id}"><i class="fas fa-thumbs-up"></i></button>
                <button class="reaction-btn dislike-btn" data-id="${post.id}"><i class="fas fa-thumbs-down"></i></button>
                <button class="reaction-btn comment-btn" data-id="${post.id}"><i class="fas fa-comment"></i></button>
            </div>
            <div class="post-comment hidden" data-id="${post.id}">
                <div class="comments-container">
                    <h4>Comments</h4>
                </div>
            </div>
        `;

        // Show image if it exists
        if (post.image_url) {
            const imageEl = postDiv.querySelector(".post-image");
            imageEl.classList.remove("hidden");
        }

        return postDiv;
    }

    /**
     * Render categories for a post
     * @param {Array} categoryNames - Array of category names
     * @returns {string} - HTML string for categories
     */
    static renderCategories(categoryNames) {
        if (!categoryNames || categoryNames.length === 0) {
            return '';
        }

        const categoriesHTML = categoryNames.map(name =>
            `<span class="post-category">${name}</span>`
        ).join('');

        return `<div class="post-categories">${categoriesHTML}</div>`;
    }

    /**
     * Setup comment toggle functionality for a post card
     * @param {HTMLElement} postCard - The post card element
     */
    static setupCommentToggle(postCard) {
        const commentBtn = postCard.querySelector('.comment-btn');
        const postId = commentBtn.dataset.id;

        commentBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent post navigation when clicking comment button
            const commentSection = postCard.querySelector(`.post-comment[data-id="${postId}"]`);
            if (commentSection) {
                commentSection.classList.toggle('hidden');
            }
        });
    }

    /**
     * Setup post card navigation functionality
     * @param {HTMLElement} postCard - Post card element
     * @param {Object} app - App instance for accessing managers
     */
    static setupPostNavigation(postCard, app) {
        if (!postCard.classList.contains('post-card-clickable')) {
            return;
        }

        const postId = postCard.getAttribute('data-id');

        // Add click handler to the post card
        postCard.addEventListener('click', (e) => {
            // Don't expand if clicking on interactive elements
            if (e.target.closest('.reaction-btn, .comment-btn, .post-actions, button, a')) {
                return;
            }

            // Toggle post detail expansion AND update URL
            if (postId && app) {
                PostCard.togglePostDetailWithNavigation(postCard, postId, app);
            }
        });

        // Add visual feedback
        postCard.style.cursor = 'pointer';
    }

    /**
     * Toggle post detail expansion with URL navigation
     * @param {HTMLElement} postCard - Post card element
     * @param {string} postId - Post ID
     * @param {Object} app - App instance
     */
    static async togglePostDetailWithNavigation(postCard, postId, app) {
        const existingDetail = postCard.querySelector('.post-detail-expansion');

        if (existingDetail) {
            // Collapse the detail view and navigate back
            existingDetail.remove();
            postCard.classList.remove('post-expanded');

            // Navigate back to home (or previous page)
            if (app.router) {
                window.history.back();
            }
            return;
        }

        // Update URL to show post detail
        if (app.router) {
            // Use pushState to update URL without triggering router navigation
            const newUrl = `/post/${postId}`;
            window.history.pushState({ postId, expandedInPlace: true }, '', newUrl);
        }

        // Expand the detail view
        await PostCard.togglePostDetail(postCard, postId, app);
    }

    /**
     * Toggle post detail expansion
     * @param {HTMLElement} postCard - Post card element
     * @param {string} postId - Post ID
     * @param {Object} app - App instance
     */
    static async togglePostDetail(postCard, postId, app) {
        const existingDetail = postCard.querySelector('.post-detail-expansion');

        if (existingDetail) {
            // Collapse the detail view
            existingDetail.remove();
            postCard.classList.remove('post-expanded');
            return;
        }

        // Expand the detail view
        try {
            postCard.classList.add('post-expanded');

            // Create detail expansion container
            const detailContainer = document.createElement('div');
            detailContainer.className = 'post-detail-expansion';
            detailContainer.innerHTML = '<div class="loading">Loading post details...</div>';

            // Insert after the main post content
            const postContent = postCard.querySelector('.post-content');
            postContent.parentNode.insertBefore(detailContainer, postContent.nextSibling);

            // Load full post data
            const fullPost = await app.getPostManager().getPostById(postId);

            // Render detailed view
            await PostCard.renderPostDetailExpansion(detailContainer, fullPost, app);

        } catch (error) {
            console.error('Error loading post details:', error);
            const errorDiv = postCard.querySelector('.post-detail-expansion');
            if (errorDiv) {
                errorDiv.innerHTML = `
                    <div class="error-state">
                        <p>Failed to load post details.</p>
                        <button onclick="this.closest('.post-detail-expansion').remove(); this.closest('.post-card').classList.remove('post-expanded');">Close</button>
                    </div>
                `;
            }
        }
    }

    /**
     * Update comment count for a post
     * @param {string} postId - Post ID
     * @param {number} count - Comment count
     */
    static updateCommentCount(postId, count) {
        const commentBtn = document.querySelector(`.comment-btn[data-id="${postId}"]`);
        if (commentBtn) {
            // Clear existing text and add new count
            const icon = commentBtn.querySelector('i');
            commentBtn.innerHTML = '';
            commentBtn.appendChild(icon);
            commentBtn.insertAdjacentHTML("beforeend", ` ${count} Comments`);
        }
    }

    /**
     * Get post card element by post ID
     * @param {string} postId - Post ID
     * @returns {HTMLElement|null} - Post card element or null
     */
    static getPostCard(postId) {
        return document.querySelector(`.post-card .post-comment[data-id="${postId}"]`)?.closest('.post-card');
    }

    /**
     * Get comments container for a post
     * @param {string} postId - Post ID
     * @returns {HTMLElement|null} - Comments container or null
     */
    static getCommentsContainer(postId) {
        return document.querySelector(`.post-card .post-comment[data-id="${postId}"] .comments-container`);
    }

    /**
     * Clear comments in a post's comments container
     * @param {string} postId - Post ID
     */
    static clearComments(postId) {
        const commentsContainer = this.getCommentsContainer(postId);
        if (commentsContainer) {
            commentsContainer.innerHTML = '<h4>Comments</h4>';
        }
    }

    /**
     * Render post detail expansion
     * @param {HTMLElement} container - Container element
     * @param {Object} post - Full post data
     * @param {Object} app - App instance
     */
    static async renderPostDetailExpansion(container, post, app) {
        container.innerHTML = `
            <div class="post-detail-header">
                <button class="back-btn collapse-post-btn">
                    <i class="fas fa-chevron-up"></i> Collapse
                </button>
                <div class="post-actions">
                    <button class="save-post-btn" title="Save Post">
                        <i class="fas fa-bookmark"></i>
                    </button>
                    <button class="share-post-btn" title="Share Post">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
            </div>

            <div class="post-full-content">
                ${PostCard.renderCategories(post.category_names || [])}
                ${post.image_url ? `
                    <div class="post-image-container">
                        <img src="http://localhost:8080${post.image_url}" alt="Post image" class="post-image-full" onerror="this.parentElement.innerHTML='<div class=\\'image-error\\'>Image unavailable</div>'">
                    </div>
                ` : ''}
                <div class="post-full-text">${post.content}</div>
            </div>

            <div class="post-stats-detailed">
                <button class="reaction-btn like-btn" data-id="${post.id}">
                    <i class="fas fa-thumbs-up"></i>
                    <span class="like-count">${post.likes || 0}</span>
                </button>
                <button class="reaction-btn dislike-btn" data-id="${post.id}">
                    <i class="fas fa-thumbs-down"></i>
                    <span class="dislike-count">${post.dislikes || 0}</span>
                </button>
                <span class="comment-count-detailed">
                    <i class="fas fa-comment"></i>
                    ${post.comments_count || 0} comments
                </span>
            </div>

            <div class="comments-section-expanded">
                <div class="comments-header">
                    <h3>Comments</h3>
                </div>

                <div class="comment-form-expanded">
                    <!-- Comment form will be rendered here -->
                </div>

                <div class="comments-list-expanded">
                    <div class="loading">Loading comments...</div>
                </div>
            </div>
        `;

        // Setup collapse button
        const collapseBtn = container.querySelector('.collapse-post-btn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                container.remove();
                container.closest('.post-card').classList.remove('post-expanded');

                // Navigate back in history if we have a post URL
                if (window.location.pathname.includes('/post/')) {
                    window.history.back();
                }
            });
        }

        // Setup save and share buttons
        const saveBtn = container.querySelector('.save-post-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                console.log('Save post:', post.id);
                saveBtn.classList.toggle('saved');
            });
        }

        const shareBtn = container.querySelector('.share-post-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                if (navigator.share) {
                    navigator.share({
                        title: post.title,
                        url: `${window.location.origin}/post/${post.id}`
                    });
                } else {
                    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`).then(() => {
                        alert('Post URL copied to clipboard!');
                    });
                }
            });
        }

        // Load and render comments
        await PostCard.loadExpandedComments(container, post.id, app);

        // Initialize reactions for the expanded view
        await app.getReactionManager().loadPostsLikes();
    }

    /**
     * Load comments for expanded post view
     * @param {HTMLElement} container - Container element
     * @param {string} postId - Post ID
     * @param {Object} app - App instance
     */
    static async loadExpandedComments(container, postId, app) {
        const commentsList = container.querySelector('.comments-list-expanded');
        const commentForm = container.querySelector('.comment-form-expanded');

        try {
            // Load comments
            const comments = await app.getCommentManager().getPostComments(postId);

            if (comments.length === 0) {
                commentsList.innerHTML = `
                    <div class="empty-comments">
                        <i class="fas fa-comments"></i>
                        <p>No comments yet. Be the first to comment!</p>
                    </div>
                `;
            } else {
                commentsList.innerHTML = '';

                // Render each comment with threading
                for (const comment of comments) {
                    const commentThreadContainer = document.createElement('div');
                    commentThreadContainer.classList.add('comment-thread');
                    commentThreadContainer.setAttribute('data-comment-id', comment.id);

                    const commentElement = app.getCommentManager().createCommentElement(comment);
                    commentThreadContainer.appendChild(commentElement);

                    const replies = comment.replies || comment.Replies;
                    if (replies && Array.isArray(replies) && replies.length > 0) {
                        app.getCommentManager().renderRepliesForComment(commentElement, replies);
                    }

                    commentsList.appendChild(commentThreadContainer);
                }
            }

            // Render comment form
            if (await app.isAuthenticated()) {
                commentForm.innerHTML = `
                    <form class="comment-box-form" data-post-id="${postId}">
                        <textarea placeholder="Write a comment..." rows="2" required></textarea>
                        <button type="submit">Comment</button>
                    </form>
                `;

                const form = commentForm.querySelector('form');
                if (form) {
                    form.addEventListener('submit', async (e) => {
                        await app.getCommentManager().handleCommentSubmit(e);
                        // Reload comments after submission
                        await PostCard.loadExpandedComments(container, postId, app);
                    });
                }
            } else {
                commentForm.innerHTML = `
                    <div class="auth-prompt">
                        <p>Please <button class="login-link">sign in</button> to comment.</p>
                    </div>
                `;

                const loginLink = commentForm.querySelector('.login-link');
                if (loginLink) {
                    loginLink.addEventListener('click', () => {
                        app.showAuthModal();
                    });
                }
            }

            // Load comment reactions
            await app.getReactionManager().loadCommentsLikes();

        } catch (error) {
            console.error('Error loading comments:', error);
            commentsList.innerHTML = `
                <div class="error-comments">
                    <p>Failed to load comments.</p>
                    <button onclick="PostCard.loadExpandedComments(this.closest('.post-detail-expansion'), '${postId}', window.app)">Retry</button>
                </div>
            `;
        }
    }
}

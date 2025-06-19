/**
 * Comment Manager - Handles comment functionality including creation, replies, and rendering
 */

import { ApiUtils } from '../utils/ApiUtils.mjs';
import { TimeUtils } from '../utils/TimeUtils.mjs';
import { PostCard } from '../posts/PostCard.mjs';

export class CommentManager {
    constructor(authModal, reactionManager) {
        this.authModal = authModal;
        this.reactionManager = reactionManager;
    }

    /**
     * Create a comment element with threaded replies
     * @param {Object} comment - Comment data
     * @param {boolean} isReply - Whether this is a reply comment
     * @returns {HTMLElement} - Comment element
     */
    createCommentElement(comment, isReply = false) {
        const commentItem = document.createElement('div');
        commentItem.classList.add('comment');
        if (isReply) {
            commentItem.classList.add('reply-comment');
        }
        commentItem.setAttribute('comment-id', `${comment.id}`);

        // Use the correct field names from the backend
        const username = comment.username || comment.UserName;
        const avatarUrl = comment.avatar_url || comment.ProfileAvatar;

        // Build comment actions - only show reactions for top-level comments
        let commentActions = '';
        if (isReply) {
            // Reply comments only show timestamp, no reactions or reply button
            commentActions = '';
        } else {
            // Top-level comments show reactions and reply button
            commentActions = `
                <div class="comment-actions">
                    <button class="reaction-btn comment-like-btn" data-id="${comment.id}"><i class="fas fa-thumbs-up"></i></button>
                    <button class="reaction-btn comment-dislike-btn" data-id="${comment.id}"><i class="fas fa-thumbs-down"></i></button>
                    <button class="reaction-btn comment-reply-btn" data-id="${comment.id}"><i class="fas fa-comment"></i></button>
                </div>
            `;
        }

        commentItem.innerHTML = `
            <div class="comment-wrapper">
                        <div class="comment-avatar">
                <img class="post-author-img" src="http://localhost:8080${avatarUrl || '/static/pictures/default-avatar.png'}"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlNWU3ZWIiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSIjOWNhM2FmIi8+CjxwYXRoIGQ9Ik0xMiAxNEM5LjMzIDEzLjk5IDcuMDEgMTUuNjIgNiAxOEMxMC4wMSAyMCAxMy45OSAyMCAxOCAxOEMxNi45OSAxNS42MiAxNC42NyAxMy45OSAxMiAxNFoiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+Cjwvc3ZnPgo8L3N2Zz4K'" />
            </div>
            <div class="comment-details">
                <div>
                    <p class="comment-content"> <strong><span class="comment-username">${username}</span>:</strong> <span class="comment-text">${comment.content}</span></p>
                </div>
                <div class="comment-footer">
                    ${commentActions}
                    <p class="comment-time">${TimeUtils.getTimeAgo(comment.created_at)}</p>
                </div>
            </div>
            </div>
            ${!isReply ? `<div class="replies-container" data-comment-id="${comment.id}"></div>` : ''}
        `;

        return commentItem;
    }

    /**
     * Render replies for a comment using the replies data from the comment object
     * @param {HTMLElement} commentElement - The parent comment element
     * @param {Array} replies - Array of reply objects
     */
    renderRepliesForComment(commentElement, replies) {
        const repliesContainer = commentElement.querySelector('.replies-container');
        if (!repliesContainer || !replies || replies.length === 0) return;

        replies.forEach(reply => {
            const replyElement = this.createCommentElement(reply, true);
            repliesContainer.appendChild(replyElement);
        });
    }

    /**
     * Initialize comment forms for all posts
     */
    initializeCommentForms() {
        const commentContainers = document.querySelectorAll(`.post-card .post-comment`);
        
        commentContainers.forEach(commentContainer => {
            const postID = commentContainer.getAttribute('data-id');
            this.createCommentForm(commentContainer, postID);
        });

        this.setupReplyHandlers();
        this.setupCloseReplyHandlers();
    }

    /**
     * Create comment form for a post
     * @param {HTMLElement} commentContainer - Comment container element
     * @param {string} postID - Post ID
     */
    createCommentForm(commentContainer, postID) {
        // Check if form already exists
        if (commentContainer.querySelector('.write-comment-box')) {
            return;
        }

        const commentForm = document.createElement('div');
        commentForm.classList.add('write-comment-box');        
        commentForm.innerHTML = `
            <form class="comment-box-form" data-post-id="${postID}">
                <textarea type="text" placeholder="Write comment..." cols="30" rows="1" required autocomplete="off"></textarea>
                <button type="submit">send</button>
            </form>
        `;

        commentContainer.appendChild(commentForm);

        // Add submit handler for the comment form
        const form = commentForm.querySelector('form');
        form.addEventListener('submit', (e) => this.handleCommentSubmit(e));
    }

    /**
     * Handle comment form submission
     * @param {Event} e - Form submission event
     */
    async handleCommentSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const textarea = form.querySelector('textarea');
        const content = textarea.value.trim();
        const postId = form.getAttribute('data-post-id');
        const parentCommentId = form.getAttribute('comment-id'); // For replies

        if (!content) {
            alert('Comment cannot be empty');
            return;
        }

        // Determine if this is a top-level comment or a reply
        if (parentCommentId) {
            // This is a reply to a comment
            await this.handleReplySubmit(form, content, parentCommentId);
        } else if (postId) {
            // This is a top-level comment
            await this.handleTopLevelCommentSubmit(form, content, postId);
        } else {
            console.error('No post ID or parent comment ID found');
            alert('Error: Could not determine where to post the comment');
            return;
        }
    }

    /**
     * Handle top-level comment submission
     * @param {HTMLElement} form - The form element
     * @param {string} content - Comment content
     * @param {string} postId - Post ID
     */
    async handleTopLevelCommentSubmit(form, content, postId) {
        const commentData = {
            post_id: parseInt(postId),
            content: content
        };

        try {
            const result = await ApiUtils.post('/api/comments/create', commentData, true);

            // Clear the textarea
            form.querySelector('textarea').value = '';

            // Refresh comments for this post
            await this.refreshPostComments(postId);

        } catch (error) {
            const errorInfo = ApiUtils.handleError(error, 'comment creation');

            if (errorInfo.requiresAuth) {
                this.authModal.showLoginModal();
            } else {
                alert(`Failed to post comment: ${errorInfo.message}`);
            }
        }
    }

    /**
     * Handle reply submission
     * @param {HTMLElement} form - The form element
     * @param {string} content - Reply content
     * @param {string} parentCommentId - Parent comment ID
     */
    async handleReplySubmit(form, content, parentCommentId) {
        const replyData = {
            parent_comment_id: parseInt(parentCommentId),
            content: content
        };

        console.log('Submitting reply:', replyData); // Debug log

        try {
            const result = await ApiUtils.post('/api/comment/reply/create', replyData, true);
            console.log('Reply created successfully:', result); // Debug log

            // Find the post ID from the parent comment context
            const postCommentSection = form.closest('.post-comment');
            const postId = postCommentSection.getAttribute('data-id');

            // Close the specific reply form
            const replyFormContainer = form.closest('.reply-form-container');
            if (replyFormContainer) {
                const commentId = replyFormContainer.getAttribute('data-comment-id');
                this.closeReplyForm(postId, commentId);
            }

            // Refresh comments for this post to show the new reply
            await this.refreshPostComments(postId);

        } catch (error) {
            console.error('Reply submission error:', error); // Debug log
            const errorInfo = ApiUtils.handleError(error, 'reply creation');

            if (errorInfo.requiresAuth) {
                this.authModal.showLoginModal();
            } else {
                alert(`Failed to post reply: ${errorInfo.message}`);
            }
        }
    }

    /**
     * Refresh comments for a specific post
     * @param {string} postId - Post ID
     */
    async refreshPostComments(postId) {
        try {
            const comments = await ApiUtils.get(`/api/comments/get?post_id=${postId}`);

            console.log(`Comments for post ${postId}:`, comments); // Debug log

            if (!comments || !Array.isArray(comments)) {
                console.error('Invalid comments data received:', comments);
                return;
            }

            // Calculate total comment count (including replies)
            let totalCommentCount = comments.length;
            comments.forEach(comment => {
                // Check both 'replies' and 'Replies' for compatibility
                const replies = comment.replies || comment.Replies;
                if (replies && Array.isArray(replies)) {
                    console.log(`Comment ${comment.id} has ${replies.length} replies:`, replies); // Debug log
                    totalCommentCount += replies.length;
                }
            });

            console.log(`Total comment count for post ${postId}: ${totalCommentCount}`); // Debug log

            // Clear and re-render comments with proper threading
            const commentsContainer = PostCard.getCommentsContainer(postId);
            if (commentsContainer) {
                commentsContainer.innerHTML = '<h4>Comments</h4>';

                // Render each top-level comment with its own independent thread
                for (const comment of comments) {
                    // Create a comment thread container for this specific comment
                    const commentThreadContainer = document.createElement('div');
                    commentThreadContainer.classList.add('comment-thread');
                    commentThreadContainer.setAttribute('data-comment-id', comment.id);

                    // Create the main comment element
                    const commentElement = this.createCommentElement(comment);
                    commentThreadContainer.appendChild(commentElement);

                    // Render replies directly under this specific comment
                    const replies = comment.replies || comment.Replies;
                    if (replies && Array.isArray(replies) && replies.length > 0) {
                        console.log(`Rendering ${replies.length} replies for comment ${comment.id}`); // Debug log
                        this.renderRepliesForComment(commentElement, replies);
                    }

                    // Add the complete thread (comment + replies) to the comments container
                    commentsContainer.appendChild(commentThreadContainer);
                }
            }

            // Update comment count with total (comments + replies)
            PostCard.updateCommentCount(postId, totalCommentCount);

            // Refresh comment likes
            await this.reactionManager.loadCommentsLikes();

        } catch (error) {
            console.error('Error refreshing comments:', error);
        }
    }

    /**
     * Setup reply button handlers
     */
    setupReplyHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.comment-reply-btn')) {
                this.handleReplyClick(e);
            }
        });
    }

    /**
     * Handle reply button click
     * @param {Event} e - Click event
     */
    handleReplyClick(e) {
        const replyBtn = e.target.closest('.comment-reply-btn');
        const commentID = replyBtn.getAttribute('data-id');
        const postComments = e.target.closest(`.post-card .post-comment`);
        const postID = postComments.getAttribute('data-id');

        // Find the specific comment element being replied to
        const originalCommentElement = document.querySelector(`.post-card .post-comment[data-id="${postID}"] .comment[comment-id="${commentID}"]`);

        if (!originalCommentElement) {
            console.error('Original comment element not found');
            return;
        }

        // Remove any existing reply forms from this post
        this.clearAllReplyForms(postID);

        // Get comment details
        const commenterAvatarSrc = originalCommentElement.querySelector('.comment-avatar img').getAttribute('src');
        const originalCommenterUsername = originalCommentElement.querySelector('.comment-details .comment-content span.comment-username').textContent;
        const originalCommenterText = originalCommentElement.querySelector('.comment-details .comment-content span.comment-text').textContent;
        const commentTimestamp = originalCommentElement.querySelector('.comment-details .comment-time').textContent;

        // Create reply form directly under this specific comment
        this.createReplyFormUnderComment(originalCommentElement, {
            commentID,
            postID,
            commenterAvatarSrc,
            originalCommenterUsername,
            originalCommenterText,
            commentTimestamp
        });
    }

    /**
     * Clear all existing reply forms from a post
     * @param {string} postID - Post ID
     */
    clearAllReplyForms(postID) {
        // Remove any existing reply forms
        const existingReplyForms = document.querySelectorAll(`.post-card .post-comment[data-id="${postID}"] .reply-form-container`);
        existingReplyForms.forEach(form => form.remove());

        // Restore the main comment form if it was replaced
        const mainCommentBox = document.querySelector(`.post-card .post-comment[data-id="${postID}"] .write-comment-box`);
        if (mainCommentBox && !mainCommentBox.querySelector('form[data-post-id]')) {
            this.restoreMainCommentForm(postID);
        }
    }

    /**
     * Create reply form directly under a specific comment
     * @param {HTMLElement} commentElement - The comment element to reply to
     * @param {Object} replyData - Reply data
     */
    createReplyFormUnderComment(commentElement, replyData) {
        // Create reply form container
        const replyFormContainer = document.createElement('div');
        replyFormContainer.classList.add('reply-form-container');
        replyFormContainer.setAttribute('data-comment-id', replyData.commentID);

        replyFormContainer.innerHTML = `
            <div class="reply-comment-header">
                <div><p><em>Replying to ${replyData.originalCommenterUsername}</em></p></div>
                <button class="close-reply" data-post-id="${replyData.postID}" data-comment-id="${replyData.commentID}">Cancel</button>
            </div>
            <div class="comment original-comment-preview">
                <div class="comment-avatar">
                    <img class="post-author-img" src="${replyData.commenterAvatarSrc}" alt="username"/>
                </div>
                <div class="comment-details">
                    <p><strong>${replyData.originalCommenterUsername}:</strong> ${replyData.originalCommenterText}</p>
                    <div class="comment-footer">
                        <p class="comment-time">${replyData.commentTimestamp}</p>
                    </div>
                </div>
            </div>
            <form class="comment-box-form reply-form" comment-id="${replyData.commentID}">
                <textarea placeholder="Write your reply to @${replyData.originalCommenterUsername}..." cols="30" rows="2" required autocomplete="off"></textarea>
                <button type="submit">Reply</button>
            </form>
        `;

        // Insert the reply form directly after the comment element
        commentElement.parentNode.insertBefore(replyFormContainer, commentElement.nextSibling);

        // Attach the submit handler to the new form
        const form = replyFormContainer.querySelector('form');
        form.addEventListener('submit', (e) => this.handleCommentSubmit(e));

        // Focus on the textarea
        const textarea = replyFormContainer.querySelector('textarea');
        if (textarea) {
            textarea.focus();
        }
    }

    /**
     * Restore the main comment form for a post
     * @param {string} postID - Post ID
     */
    restoreMainCommentForm(postID) {
        const mainCommentBox = document.querySelector(`.post-card .post-comment[data-id="${postID}"] .write-comment-box`);
        if (mainCommentBox) {
            mainCommentBox.innerHTML = `
                <form class="comment-box-form" data-post-id="${postID}">
                    <textarea placeholder="Write a comment..." cols="30" rows="1" required autocomplete="off"></textarea>
                    <button type="submit">Comment</button>
                </form>
            `;

            // Re-attach event listener
            const form = mainCommentBox.querySelector('form');
            form.addEventListener('submit', (e) => this.handleCommentSubmit(e));
        }
    }



    /**
     * Setup close reply handlers
     */
    setupCloseReplyHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.close-reply')) {
                this.handleCloseReply(e);
            }
        });
    }

    /**
     * Handle close reply button click
     * @param {Event} e - Click event
     */
    handleCloseReply(e) {
        const postId = e.target.getAttribute('data-post-id');
        const commentId = e.target.getAttribute('data-comment-id');
        this.closeReplyForm(postId, commentId);
    }

    /**
     * Close specific reply form
     * @param {string} postId - Post ID
     * @param {string} commentId - Comment ID (optional)
     */
    closeReplyForm(postId, commentId = null) {
        if (commentId) {
            // Remove specific reply form
            const replyFormContainer = document.querySelector(`.post-card .post-comment[data-id="${postId}"] .reply-form-container[data-comment-id="${commentId}"]`);
            if (replyFormContainer) {
                replyFormContainer.remove();
            }
        } else {
            // Remove all reply forms for this post
            this.clearAllReplyForms(postId);
        }
    }

    /**
     * Get comments for a specific post
     * @param {number} postId - Post ID
     * @returns {Array} - Array of comments
     */
    async getPostComments(postId) {
        try {
            const comments = await ApiUtils.get(`/api/comments/get?post_id=${postId}`);
            return Array.isArray(comments) ? comments : [];
        } catch (error) {
            console.error(`Error getting comments for post ${postId}:`, error);
            return [];
        }
    }
}

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
     * Create a parent comment element with proper structure for child replies
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

        // Build comment actions - show reply button for all comments (parent and child)
        let commentActions = '';
        if (isReply) {
            // Reply comments show only reply button (no reactions)
            commentActions = `
                <div class="comment-actions">
                    <button class="reaction-btn comment-reply-btn" data-id="${comment.id}">
                        <i class="fas fa-reply"></i>
                        <span>Reply</span>
                    </button>
                </div>
            `;
        } else {
            // Parent comments show reactions and reply button
            commentActions = `
                <div class="comment-actions">
                    <button class="reaction-btn comment-like-btn" data-id="${comment.id}">
                        <i class="fas fa-thumbs-up"></i>
                        <span class="reaction-count like-count">0</span>
                    </button>
                    <button class="reaction-btn comment-dislike-btn" data-id="${comment.id}">
                        <i class="fas fa-thumbs-down"></i>
                        <span class="reaction-count dislike-count">0</span>
                    </button>
                    <button class="reaction-btn comment-reply-btn" data-id="${comment.id}">
                        <i class="fas fa-reply"></i>
                        <span>Reply</span>
                    </button>
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
                        <p class="comment-content">
                            <strong><span class="comment-username">${username}</span>:</strong>
                            <span class="comment-text">${comment.content}</span>
                        </p>
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
     * Render ALL CHILD replies directly under a PARENT comment - FETCH AND SHOW EVERYTHING
     * @param {HTMLElement} parentCommentElement - The parent comment element
     * @param {Array} childReplies - Array of child reply objects
     */
    renderChildRepliesUnderParent(parentCommentElement, childReplies) {
        const repliesContainer = parentCommentElement.querySelector('.replies-container');
        if (!repliesContainer) {
            console.warn('⚠️ No replies container found for PARENT comment element');
            return;
        }

        if (!childReplies || !Array.isArray(childReplies)) {
            console.log('ℹ️ No CHILD replies array provided');
            return;
        }

        if (childReplies.length === 0) {
            console.log('ℹ️ CHILD replies array is empty');
            return;
        }

        console.log(`🔄 RENDERING ALL ${childReplies.length} CHILD REPLIES under PARENT:`, childReplies);

        // Clear any existing replies first to avoid duplicates
        repliesContainer.innerHTML = '';

        // RENDER EVERY SINGLE CHILD REPLY - NO EXCEPTIONS
        childReplies.forEach((childReply, index) => {
            console.log(`📝 RENDERING CHILD REPLY ${index + 1}/${childReplies.length} (ID: ${childReply.id}):`, {
                id: childReply.id,
                content: childReply.content,
                username: childReply.username || childReply.UserName,
                created_at: childReply.created_at
            });

            try {
                // Create the CHILD reply element
                const childReplyElement = this.createCommentElement(childReply, true);

                // FORCE ADD the CHILD reply to the PARENT's replies container
                repliesContainer.appendChild(childReplyElement);

                console.log(`✅ SUCCESS: CHILD reply ${childReply.id} rendered under PARENT`);
            } catch (error) {
                console.error(`❌ FAILED: Error rendering CHILD reply ${childReply.id}:`, error);

                // Try to render a fallback element
                try {
                    const fallbackElement = document.createElement('div');
                    fallbackElement.className = 'comment reply-comment error-reply';
                    fallbackElement.innerHTML = `
                        <div class="comment-wrapper">
                            <div class="comment-details">
                                <p class="comment-content">
                                    <strong>Error loading reply:</strong> ${childReply.content || 'Content unavailable'}
                                </p>
                            </div>
                        </div>
                    `;
                    repliesContainer.appendChild(fallbackElement);
                    console.log(`🔧 Fallback element created for reply ${childReply.id}`);
                } catch (fallbackError) {
                    console.error(`❌ Even fallback failed for reply ${childReply.id}:`, fallbackError);
                }
            }
        });

        console.log(`✅ COMPLETED: ALL ${childReplies.length} CHILD REPLIES RENDERED under PARENT`);
        console.log(`📊 Final replies container children count:`, repliesContainer.children.length);
    }

    /**
     * Legacy method - keeping for compatibility
     * @param {HTMLElement} commentElement - The parent comment element
     * @param {Array} replies - Array of reply objects
     */
    renderRepliesForComment(commentElement, replies) {
        // Use the new method
        this.renderChildRepliesUnderParent(commentElement, replies);
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

        // Initialize responsive behavior
        this.initializeResponsive();
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
     * Handle PARENT comment submission
     * @param {HTMLElement} form - The form element
     * @param {string} content - Comment content
     * @param {string} postId - Post ID
     */
    async handleTopLevelCommentSubmit(form, content, postId) {
        console.log(`💬 Submitting new PARENT comment for post ${postId}:`, content);

        // CLOSE ALL REPLY FORMS when submitting a parent comment
        this.clearAllReplyForms(postId);

        const commentData = {
            post_id: parseInt(postId),
            content: content
        };

        try {
            const result = await ApiUtils.post('/api/comments/create', commentData, true);
            console.log(`✅ PARENT comment created successfully:`, result);

            // Clear the textarea
            form.querySelector('textarea').value = '';

            // Refresh comments for this post - this will preserve all PARENT-CHILD relationships
            console.log(`🔄 Refreshing comments for post ${postId} after new PARENT comment...`);
            await this.refreshPostComments(postId);

        } catch (error) {
            console.error(`❌ Error submitting PARENT comment:`, error);
            const errorInfo = ApiUtils.handleError(error, 'comment creation');

            if (errorInfo.requiresAuth) {
                this.authModal.showLoginModal();
            } else {
                alert(`Failed to post comment: ${errorInfo.message}`);
            }
        }
    }

    /**
     * Handle CHILD reply submission to a PARENT comment
     * @param {HTMLElement} form - The form element
     * @param {string} content - Reply content
     * @param {string} parentCommentId - Parent comment ID
     */
    async handleReplySubmit(form, content, parentCommentId) {
        console.log(`💬 Submitting CHILD reply to PARENT comment ${parentCommentId}:`, content);

        const replyData = {
            parent_comment_id: parseInt(parentCommentId),
            content: content
        };

        try {
            const result = await ApiUtils.post('/api/comment/reply/create', replyData, true);
            console.log(`✅ CHILD reply created successfully under PARENT ${parentCommentId}:`, result);

            // Find the post ID from the parent comment context
            const postCommentSection = form.closest('.post-comment');
            const postId = postCommentSection.getAttribute('data-id');

            // Close the specific reply form after successful submission
            const replyFormContainer = form.closest('.reply-form-container');
            if (replyFormContainer) {
                const commentId = replyFormContainer.getAttribute('data-comment-id');
                this.closeReplyForm(postId, commentId);
            }

            // Refresh comments to show the new CHILD reply under its PARENT
            console.log(`🔄 Refreshing comments to show new CHILD reply under PARENT ${parentCommentId}...`);
            await this.refreshPostComments(postId);

        } catch (error) {
            console.error(`❌ Error submitting CHILD reply to PARENT ${parentCommentId}:`, error);
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
            // Add a delay to ensure the backend has fully processed and committed the new comment/reply
            console.log(`⏳ Waiting for backend to process comment/reply...`);
            await new Promise(resolve => setTimeout(resolve, 800));

            console.log(`📡 FETCHING ALL COMMENTS AND REPLIES for post ${postId}...`);
            const comments = await ApiUtils.get(`/api/comments/get?post_id=${postId}`);

            console.log(`🔄 RECEIVED ALL COMMENTS DATA for post ${postId}:`, comments);

            if (!comments || !Array.isArray(comments)) {
                console.error('❌ Invalid comments data received:', comments);
                return;
            }

            // FORCE FETCH AGAIN if no replies found but we expect them
            let retryCount = 0;
            while (retryCount < 2) {
                const hasAnyReplies = comments.some(comment => {
                    const replies = comment.replies || comment.Replies;
                    return replies && Array.isArray(replies) && replies.length > 0;
                });

                if (!hasAnyReplies && retryCount < 1) {
                    console.log(`🔄 No replies found, retrying fetch... (attempt ${retryCount + 1})`);
                    await new Promise(resolve => setTimeout(resolve, 300));
                    const freshComments = await ApiUtils.get(`/api/comments/get?post_id=${postId}`);
                    if (freshComments && Array.isArray(freshComments)) {
                        comments.splice(0, comments.length, ...freshComments);
                    }
                    retryCount++;
                } else {
                    break;
                }
            }

            // ANALYZE AND COUNT ALL COMMENTS AND REPLIES - VERIFY EVERYTHING IS FETCHED
            let totalCommentCount = comments.length;
            let totalRepliesFound = 0;

            console.log(`🔍 ANALYZING ALL ${comments.length} COMMENTS FOR REPLIES...`);

            comments.forEach((comment, index) => {
                // Check ALL possible reply field names
                const replies = comment.replies || comment.Replies || comment.children || comment.Children || [];

                console.log(`📝 COMMENT ${index + 1}/${comments.length} (ID: ${comment.id}) ANALYSIS:`, {
                    content: comment.content.substring(0, 50) + '...',
                    username: comment.username || comment.UserName,
                    hasReplies: !!(replies && Array.isArray(replies) && replies.length > 0),
                    repliesCount: Array.isArray(replies) ? replies.length : 0,
                    repliesField: comment.replies,
                    RepliesField: comment.Replies,
                    childrenField: comment.children,
                    ChildrenField: comment.Children,
                    fullRepliesData: replies
                });

                if (Array.isArray(replies) && replies.length > 0) {
                    totalRepliesFound += replies.length;
                    totalCommentCount += replies.length;

                    // Log each individual reply
                    replies.forEach((reply, replyIndex) => {
                        console.log(`  📄 REPLY ${replyIndex + 1}/${replies.length} (ID: ${reply.id}):`, {
                            content: reply.content.substring(0, 30) + '...',
                            username: reply.username || reply.UserName,
                            parentId: reply.parent_comment_id || reply.ParentCommentID
                        });
                    });
                }
            });

            console.log(`📊 FINAL SUMMARY for post ${postId}:`, {
                totalParentComments: comments.length,
                totalChildReplies: totalRepliesFound,
                grandTotal: totalCommentCount,
                allCommentsHaveBeenAnalyzed: true
            });

            // VERIFY: If we expect replies but found none, log a warning
            if (totalRepliesFound === 0) {
                console.warn(`⚠️ WARNING: NO REPLIES FOUND for post ${postId}. This might be normal or indicate a data issue.`);
                console.log(`🔍 RAW API RESPONSE:`, comments);
            } else {
                console.log(`✅ SUCCESS: Found ${totalRepliesFound} replies across ${comments.length} parent comments`);
            }

            // Get the comments container
            const commentsContainer = PostCard.getCommentsContainer(postId);
            if (!commentsContainer) {
                console.error('❌ Comments container not found for post:', postId);
                return;
            }

            // Clear and rebuild the entire comments section
            commentsContainer.innerHTML = '<h4>Comments</h4>';

            // RENDER EVERY SINGLE PARENT COMMENT WITH ALL ITS CHILD REPLIES
            for (let i = 0; i < comments.length; i++) {
                const parentComment = comments[i];
                console.log(`🏗️ BUILDING PARENT COMMENT ${i + 1}/${comments.length} (ID: ${parentComment.id})`);

                // Create the PARENT comment element (this is the main comment)
                const parentCommentElement = this.createCommentElement(parentComment, false);

                // Add the PARENT comment to the container first
                commentsContainer.appendChild(parentCommentElement);

                // EXTRACT ALL POSSIBLE REPLY FIELDS - check every possible field name
                const replies = parentComment.replies || parentComment.Replies || parentComment.children || parentComment.Children || [];

                console.log(`🔍 PARENT comment ${parentComment.id} REPLY ANALYSIS:`, {
                    repliesField: parentComment.replies,
                    RepliesField: parentComment.Replies,
                    childrenField: parentComment.children,
                    ChildrenField: parentComment.Children,
                    finalReplies: replies,
                    repliesCount: Array.isArray(replies) ? replies.length : 0
                });

                if (Array.isArray(replies) && replies.length > 0) {
                    console.log(`✅ FOUND ${replies.length} CHILD REPLIES for PARENT comment ${parentComment.id}`);
                    console.log(`📋 ALL CHILD REPLIES DATA:`, replies);

                    // FORCE RENDER ALL CHILD REPLIES
                    this.renderChildRepliesUnderParent(parentCommentElement, replies);
                } else {
                    console.log(`⚠️ NO CHILD REPLIES found for PARENT comment ${parentComment.id}`);

                    // Double-check the parent comment object structure
                    console.log(`🔍 FULL PARENT COMMENT OBJECT:`, parentComment);
                }
            }

            console.log(`✅ COMPLETED RENDERING ALL COMMENTS AND REPLIES`);

            // FINAL VERIFICATION: Count what was actually rendered in the DOM
            const renderedComments = commentsContainer.querySelectorAll('.comment:not(.reply-comment)');
            const renderedReplies = commentsContainer.querySelectorAll('.comment.reply-comment');

            console.log(`🔍 FINAL DOM VERIFICATION:`, {
                expectedParentComments: comments.length,
                renderedParentComments: renderedComments.length,
                expectedReplies: totalRepliesFound,
                renderedReplies: renderedReplies.length,
                totalExpected: totalCommentCount,
                totalRendered: renderedComments.length + renderedReplies.length
            });

            // Log any discrepancies
            if (renderedComments.length !== comments.length) {
                console.warn(`⚠️ PARENT COMMENT MISMATCH: Expected ${comments.length}, Rendered ${renderedComments.length}`);
            }
            if (renderedReplies.length !== totalRepliesFound) {
                console.warn(`⚠️ REPLY MISMATCH: Expected ${totalRepliesFound}, Rendered ${renderedReplies.length}`);
            }

            if (renderedComments.length === comments.length && renderedReplies.length === totalRepliesFound) {
                console.log(`🎉 PERFECT MATCH: All comments and replies rendered successfully!`);
            }

            // Update comment count with total (comments + replies)
            PostCard.updateCommentCount(postId, totalCommentCount);

            // Refresh comment likes
            await this.reactionManager.loadCommentsLikes();

        } catch (error) {
            console.error('❌ Error refreshing comments:', error);
        }
    }

    /**
     * Setup reply button handlers - ensures entire button (icon + text) is clickable
     */
    setupReplyHandlers() {
        document.addEventListener('click', (e) => {
            // Check if clicked element or any parent is a reply button
            const replyButton = e.target.closest('.comment-reply-btn');
            if (replyButton) {
                e.preventDefault();
                e.stopPropagation();
                this.handleReplyClick(e);
            }
        });
    }

    /**
     * Handle reply button click - creates CHILD reply form under PARENT comment
     * @param {Event} e - Click event
     */
    handleReplyClick(e) {
        const replyBtn = e.target.closest('.comment-reply-btn');
        const commentID = replyBtn.getAttribute('data-id');
        const postComments = e.target.closest(`.post-card .post-comment`);
        const postID = postComments.getAttribute('data-id');

        console.log(`💬 Reply button clicked for PARENT comment: ${commentID}`);

        // HIDE THE PARENT COMMENT INPUT FORM when opening a reply form
        this.hideParentCommentForm(postID);

        // Find the specific PARENT comment element being replied to
        const parentCommentElement = document.querySelector(`.post-card .post-comment[data-id="${postID}"] .comment[comment-id="${commentID}"]`);

        if (!parentCommentElement) {
            console.error('PARENT comment element not found');
            return;
        }

        // Remove any existing reply forms from this post
        this.clearAllReplyForms(postID);

        // Get PARENT comment details
        const commenterAvatarSrc = parentCommentElement.querySelector('.comment-avatar img').getAttribute('src');
        const originalCommenterUsername = parentCommentElement.querySelector('.comment-details .comment-content span.comment-username').textContent;
        const originalCommenterText = parentCommentElement.querySelector('.comment-details .comment-content span.comment-text').textContent;
        const commentTimestamp = parentCommentElement.querySelector('.comment-details .comment-time').textContent;

        // Create CHILD reply form directly under this PARENT comment
        this.createReplyFormUnderParentComment(parentCommentElement, {
            commentID,
            postID,
            commenterAvatarSrc,
            originalCommenterUsername,
            originalCommenterText,
            commentTimestamp
        });
    }

    /**
     * Hide the PARENT comment input form when a reply form is opened
     * @param {string} postID - Post ID
     */
    hideParentCommentForm(postID) {
        const parentCommentForm = document.querySelector(`.post-card .post-comment[data-id="${postID}"] .write-comment-box`);
        if (parentCommentForm) {
            parentCommentForm.style.display = 'none';
            console.log(`🙈 Hidden PARENT comment form for post ${postID}`);
        }
    }

    /**
     * Show the PARENT comment input form when reply forms are closed
     * @param {string} postID - Post ID
     */
    showParentCommentForm(postID) {
        const parentCommentForm = document.querySelector(`.post-card .post-comment[data-id="${postID}"] .write-comment-box`);
        if (parentCommentForm) {
            parentCommentForm.style.display = 'block';
            console.log(`👁️ Shown PARENT comment form for post ${postID}`);
        }
    }

    /**
     * Clear all existing reply forms from a post and show parent form
     * @param {string} postID - Post ID
     */
    clearAllReplyForms(postID) {
        // Remove any existing reply forms
        const existingReplyForms = document.querySelectorAll(`.post-card .post-comment[data-id="${postID}"] .reply-form-container`);
        existingReplyForms.forEach(form => form.remove());

        // Show the parent comment form when reply forms are cleared
        this.showParentCommentForm(postID);

        console.log(`🧹 Cleared all reply forms for post ${postID} and restored parent form`);
    }

    /**
     * Create CHILD reply form directly under a PARENT comment
     * @param {HTMLElement} parentCommentElement - The PARENT comment element to reply to
     * @param {Object} replyData - Reply data
     */
    createReplyFormUnderParentComment(parentCommentElement, replyData) {
        console.log(`📝 Creating CHILD reply form under PARENT comment ${replyData.commentID}`);

        // Create reply form container
        const replyFormContainer = document.createElement('div');
        replyFormContainer.classList.add('reply-form-container');
        replyFormContainer.setAttribute('data-comment-id', replyData.commentID);

        replyFormContainer.innerHTML = `
            <div class="reply-comment-header">
                <div><p><em>💬 Replying to PARENT comment by ${replyData.originalCommenterUsername}</em></p></div>
                <button class="close-reply" data-post-id="${replyData.postID}" data-comment-id="${replyData.commentID}">❌ Cancel</button>
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
                <textarea placeholder="Write your CHILD reply to @${replyData.originalCommenterUsername}..." cols="30" rows="2" required autocomplete="off"></textarea>
                <button type="submit">💬 Reply</button>
            </form>
        `;

        // Insert the CHILD reply form directly under the PARENT comment
        const repliesContainer = parentCommentElement.querySelector('.replies-container');
        if (repliesContainer) {
            // Insert at the beginning of the replies container
            repliesContainer.insertBefore(replyFormContainer, repliesContainer.firstChild);
        } else {
            // Fallback: insert after the parent comment element
            parentCommentElement.parentNode.insertBefore(replyFormContainer, parentCommentElement.nextSibling);
        }

        // Attach the submit handler to the new form
        const form = replyFormContainer.querySelector('form');
        form.addEventListener('submit', (e) => this.handleCommentSubmit(e));

        // Focus on the textarea and scroll into view for mobile
        const textarea = replyFormContainer.querySelector('textarea');
        if (textarea) {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                textarea.focus();

                // Scroll the reply form into view on mobile devices
                if (window.innerWidth <= 768) {
                    replyFormContainer.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }, 100);
        }

        console.log(`✅ CHILD reply form created under PARENT comment ${replyData.commentID}`);
    }

    /**
     * Legacy method - keeping for compatibility
     * @param {HTMLElement} commentElement - The comment element to reply to
     * @param {Object} replyData - Reply data
     */
    createReplyFormUnderComment(commentElement, replyData) {
        // Use the new method
        this.createReplyFormUnderParentComment(commentElement, replyData);
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
     * Close specific CHILD reply form and restore PARENT comment form
     * @param {string} postId - Post ID
     * @param {string} commentId - Comment ID (optional)
     */
    closeReplyForm(postId, commentId = null) {
        if (commentId) {
            // Remove specific CHILD reply form
            const replyFormContainer = document.querySelector(`.post-card .post-comment[data-id="${postId}"] .reply-form-container[data-comment-id="${commentId}"]`);
            if (replyFormContainer) {
                replyFormContainer.remove();
                console.log(`🗑️ Removed CHILD reply form for comment ${commentId}`);
            }
        } else {
            // Remove all reply forms for this post
            this.clearAllReplyForms(postId);
        }

        // SHOW THE PARENT COMMENT FORM when reply form is closed
        this.showParentCommentForm(postId);
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

    /**
     * Check if device is mobile based on screen width
     * @returns {boolean} - True if mobile device
     */
    isMobileDevice() {
        return window.innerWidth <= 768;
    }

    /**
     * Adjust comment section for mobile devices
     */
    adjustForMobile() {
        if (this.isMobileDevice()) {
            // Add mobile-specific classes
            document.querySelectorAll('.comments-section').forEach(section => {
                section.classList.add('mobile-comments');
            });

            // Adjust textarea behavior for mobile
            document.querySelectorAll('.comment-box-form textarea, .reply-form textarea').forEach(textarea => {
                // Prevent zoom on iOS
                textarea.style.fontSize = '16px';

                // Add mobile-friendly attributes
                textarea.setAttribute('autocomplete', 'off');
                textarea.setAttribute('autocorrect', 'off');
                textarea.setAttribute('autocapitalize', 'sentences');
            });
        }
    }

    /**
     * Handle window resize for responsive behavior
     */
    handleResize() {
        this.adjustForMobile();
    }

    /**
     * Initialize responsive behavior
     */
    initializeResponsive() {
        this.adjustForMobile();

        // Listen for window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Listen for orientation change on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.adjustForMobile();
            }, 100);
        });
    }
}

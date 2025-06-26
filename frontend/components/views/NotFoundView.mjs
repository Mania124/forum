/**
 * 404 Not Found View - Shows when user visits an unregistered route
 */

import { BaseView } from './BaseView.mjs';

export class NotFoundView extends BaseView {
    constructor(app, params, query) {
        super(app, params, query);
        this.requestedPath = window.location.pathname;
    }

    /**
     * Render the 404 view
     * @param {HTMLElement} container - Container element
     */
    async render(container) {
        try {
            // Clear container
            container.innerHTML = '';

            // Create 404 view
            await this.render404Content(container);

        } catch (error) {
            console.error('Error rendering 404 view:', error);
            container.innerHTML = `
                <div class="error-message">
                    <h2>Error</h2>
                    <p>Something went wrong while loading the 404 page.</p>
                </div>
            `;
        }
    }

    /**
     * Render 404 content
     * @param {HTMLElement} container - Container element
     */
    async render404Content(container) {
        const notFoundContent = document.createElement('div');
        notFoundContent.className = 'not-found-view';
        notFoundContent.innerHTML = `
            <div class="not-found-container">
                <div class="not-found-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                
                <div class="not-found-content">
                    <h1 class="not-found-title">404</h1>
                    <h2 class="not-found-subtitle">Page Not Found</h2>
                    <p class="not-found-message">
                        Sorry, the page you're looking for doesn't exist or has been moved.
                    </p>
                    <p class="not-found-path">
                        <strong>Requested URL:</strong> <code>${this.requestedPath}</code>
                    </p>
                </div>

                <div class="not-found-actions">
                    <button class="btn-primary go-home-btn">
                        <i class="fas fa-home"></i>
                        Go to Home
                    </button>
                    <button class="btn-secondary go-back-btn">
                        <i class="fas fa-arrow-left"></i>
                        Go Back
                    </button>
                </div>

                <div class="not-found-suggestions">
                    <h3>You might be looking for:</h3>
                    <div class="suggestion-links">
                        <a href="/" class="suggestion-link">
                            <i class="fas fa-home"></i>
                            <span>Home Page</span>
                        </a>
                        <a href="/trending" class="suggestion-link">
                            <i class="fas fa-fire"></i>
                            <span>Trending Posts</span>
                        </a>
                        <a href="/profile" class="suggestion-link">
                            <i class="fas fa-user"></i>
                            <span>Your Profile</span>
                        </a>
                        <a href="/myposts" class="suggestion-link">
                            <i class="fa-regular fa-note-sticky"></i>
                            <span>My Posts</span>
                        </a>
                    </div>
                </div>

                <div class="not-found-help">
                    <p class="help-text">
                        If you believe this is an error, please check the URL or contact support.
                    </p>
                </div>
            </div>
        `;

        container.appendChild(notFoundContent);

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for 404 page interactions
     */
    setupEventListeners() {
        // Go home button
        const goHomeBtn = document.querySelector('.go-home-btn');
        if (goHomeBtn) {
            goHomeBtn.addEventListener('click', () => {
                this.app.router.navigate('/');
            });
        }

        // Go back button
        const goBackBtn = document.querySelector('.go-back-btn');
        if (goBackBtn) {
            goBackBtn.addEventListener('click', () => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    this.app.router.navigate('/');
                }
            });
        }

        // Suggestion links
        const suggestionLinks = document.querySelectorAll('.suggestion-link');
        suggestionLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                this.app.router.navigate(href);
            });
        });
    }

    /**
     * Cleanup when view is destroyed
     */
    destroy() {
        super.destroy();
    }
}

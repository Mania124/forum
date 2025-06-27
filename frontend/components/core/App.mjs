/**
 * Main Application Controller - Orchestrates all components
 */
import { setupRouter } from '../router/Router.mjs';
import { AuthManager } from '../auth/AuthManager.mjs';
import { AuthModal } from '../auth/AuthModal.mjs';
import { NavManager } from '../navigation/NavManager.mjs';
import { MobileNavManager } from '../navigation/MobileNavManager.mjs';
import { CategoryManager } from '../categories/CategoryManager.mjs';
import { ReactionManager } from '../reactions/ReactionManager.mjs';
import { PostManager } from '../posts/PostManager.mjs';
import { PostForm } from '../posts/PostForm.mjs';
import { CommentManager } from '../comments/CommentManager.mjs';

export class App {
    constructor() {
        this.authManager = null;
        this.authModal = null;
        this.navManager = null;
        this.mobileNavManager = null;
        this.categoryManager = null;
        this.reactionManager = null;
        this.postManager = null;
        this.postForm = null;
        this.commentManager = null;
        this.router = null;

        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Initialize core managers
            this.authManager = new AuthManager();
            this.authModal = new AuthModal(this.authManager, (user) => this.onAuthSuccess(user));
            
            // Initialize navigation
            this.navManager = new NavManager(this.authManager, this.authModal);

            // Initialize mobile navigation
            this.mobileNavManager = new MobileNavManager(this);

            // Initialize category manager with filter callback
            this.categoryManager = new CategoryManager((categoryId) => this.onCategoryFilter(categoryId));
            
            // Initialize reaction manager
            this.reactionManager = new ReactionManager(this.authModal);
            
            // Initialize comment manager
            this.commentManager = new CommentManager(this.authModal, this.reactionManager);
            
            // Initialize post manager
            this.postManager = new PostManager(this.reactionManager, this.commentManager);
            
            // Initialize post form
            this.postForm = new PostForm(
                this.categoryManager, 
                this.authModal, 
                () => this.onPostCreated()
            );

            // Setup router first
            console.log('App: Setting up router');
            this.router = setupRouter(this);
            console.log('App: Router created:', !!this.router);

            // Set router reference in navigation manager
            console.log('App: Setting router in navigation manager');
            this.navManager.setRouter(this.router);
            console.log('App: Router set in navigation manager');

            // Set router reference in category manager
            console.log('App: Setting router in category manager');
            this.categoryManager.setRouter(this.router);
            console.log('App: Router set in category manager');

            // Set router reference in post manager
            console.log('App: Setting router in post manager');
            this.postManager.setRouter(this.router);
            console.log('App: Router set in post manager');

            // Set app reference in post manager
            console.log('App: Setting app reference in post manager');
            this.postManager.setApp(this);
            console.log('App: App reference set in post manager');

            // Setup the application
            await this.setupApp();
            console.log('Forum application initialized successfully');
        } catch (error) {
            console.error('Error initializing application:', error);
        }
    }

    /**
     * Setup the application components
     */
    async setupApp() {
        // Render categories in sidebar
        await this.categoryManager.renderCategories();

        // Setup authentication UI
        await this.navManager.setupAuthButtons();

        // Note: Posts and main content will be rendered by the router based on the current route
    }

    /**
     * Handle successful authentication
     * @param {Object} user - Authenticated user data
     */
    onAuthSuccess(user) {
        console.log('User authenticated:', user.username);
        this.navManager.onAuthSuccess(user);
    }

    /**
     * Handle category filter changes
     * @param {number} categoryId - Selected category ID
     */
    async onCategoryFilter(categoryId) {
        // Navigate to home with category filter or category-specific route
        if (categoryId) {
            // Option 1: Navigate to category-specific route
            this.router.navigate(`/category/${categoryId}`);

            // Option 2: Navigate to home with category query parameter
            // this.router.navigate(`/?category=${categoryId}`);
        } else {
            // Navigate to home without filter
            this.router.navigate('/');
        }
    }

    /**
     * Handle post creation
     */
    async onPostCreated() {
        console.log('New post created, refreshing feed...');
        await this.postManager.refreshPosts();
    }

    /**
     * Get the auth manager instance
     * @returns {AuthManager} - Auth manager instance
     */
    getAuthManager() {
        return this.authManager;
    }

    /**
     * Get the post manager instance
     * @returns {PostManager} - Post manager instance
     */
    getPostManager() {
        return this.postManager;
    }

    /**
     * Get the category manager instance
     * @returns {CategoryManager} - Category manager instance
     */
    getCategoryManager() {
        return this.categoryManager;
    }

    /**
     * Get the comment manager instance
     * @returns {CommentManager} - Comment manager instance
     */
    getCommentManager() {
        return this.commentManager;
    }

    /**
     * Get the reaction manager instance
     * @returns {ReactionManager} - Reaction manager instance
     */
    getReactionManager() {
        return this.reactionManager;
    }

    /**
     * Refresh the entire application
     */
    async refresh() {
        await this.postManager.refreshPosts();
        await this.categoryManager.renderCategories();
        await this.navManager.setupAuthButtons();
    }

    /**
     * Handle application errors
     * @param {Error} error - Error to handle
     * @param {string} context - Context where error occurred
     */
    handleError(error, context = '') {
        console.error(`Application error in ${context}:`, error);
        
        // You can add global error handling logic here
        // For example, showing a toast notification or error modal
    }
}

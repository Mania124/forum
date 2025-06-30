/**
 * Client-Side Router - Handles URL routing and navigation
 */

export class Router {
    constructor(app) {
        this.app = app;
        this.routes = new Map();
        this.currentRoute = null;
        this.currentParams = {};
        this.currentQuery = {};
        
        this.init();
    }

    /**
     * Initialize the router
     */
    init() {
        // Setup route definitions
        this.setupRoutes();
        
        // Listen for browser navigation events
        window.addEventListener('popstate', (event) => {
            this.handlePopState(event);
        });
        
        // Handle initial page load
        this.handleInitialRoute();
    }

    /**
     * Setup route definitions
     */
    setupRoutes() {
        // Home route - both / and /home should serve the same content
        const homeRoute = {
            name: 'home',
            component: 'HomeView',
            title: 'Forum - Home',
            requiresAuth: false
        };

        this.routes.set('/', homeRoute);
        this.routes.set('/home', homeRoute);
        
        this.routes.set('/profile', {
            name: 'profile',
            component: 'ProfileView',
            title: 'Forum - Profile',
            requiresAuth: true
        });
        
        this.routes.set('/trending', {
            name: 'trending',
            component: 'TrendingView',
            title: 'Forum - Trending',
            requiresAuth: false
        });
        
        this.routes.set('/myposts', {
            name: 'myposts',
            component: 'MyPostsView',
            title: 'Forum - My Posts',
            requiresAuth: true
        });

        this.routes.set('/likedposts', {
            name: 'likedposts',
            component: 'LikedPostsView',
            title: 'Forum - Liked Posts',
            requiresAuth: true
        });
        
        this.routes.set('/post/:id', {
            name: 'post-detail',
            component: 'PostDetailView',
            title: 'Forum - Post',
            requiresAuth: false
        });
        
        this.routes.set('/category/:id', {
            name: 'category',
            component: 'CategoryView',
            title: 'Forum - Category',
            requiresAuth: false
        });
    }

    /**
     * Navigate to a specific route
     * @param {string} path - The path to navigate to
     * @param {boolean} replace - Whether to replace current history entry
     */
    navigate(path, replace = false) {
        const url = new URL(path, window.location.origin);

        // Validate the route pattern before navigating
        if (!this.isValidRoutePattern(url.pathname)) {
            console.warn('Router: Attempted to navigate to invalid route:', path);
            // Navigate to 404 instead
            if (replace) {
                window.history.replaceState(null, '', url.pathname);
            } else {
                window.history.pushState(null, '', url.pathname);
            }
            this.handle404();
            return;
        }

        if (replace) {
            window.history.replaceState({ path }, '', url);
        } else {
            window.history.pushState({ path }, '', url);
        }

        this.handleRoute(path);
    }

    /**
     * Handle browser back/forward navigation
     * @param {PopStateEvent} event - The popstate event
     */
    handlePopState(event) {
        const path = event.state?.path || window.location.pathname;

        // Check if we're navigating back from an expanded post
        if (event.state?.expandedInPlace) {
            // This was an in-place expansion, just collapse it
            this.collapseExpandedPost();
            return;
        }

        // Check if we're going back to home from a post detail and there's an expanded post
        if (path === '/' || path === '/home') {
            const expandedPost = document.querySelector('.post-card.post-expanded');
            if (expandedPost) {
                this.collapseExpandedPost();
                return;
            }
        }

        this.handleRoute(path);
    }

    /**
     * Collapse any expanded post on the page
     */
    collapseExpandedPost() {
        const expandedPost = document.querySelector('.post-card.post-expanded');
        if (expandedPost) {
            const expansion = expandedPost.querySelector('.post-detail-expansion');
            if (expansion) {
                expansion.remove();
            }
            expandedPost.classList.remove('post-expanded');
        }
    }

    /**
     * Handle initial route on page load
     */
    handleInitialRoute() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                const path = window.location.pathname + window.location.search;
                this.validateAndHandleRoute(path);
            });
        } else {
            const path = window.location.pathname + window.location.search;
            this.validateAndHandleRoute(path);
        }
    }

    /**
     * Validate route and handle appropriately
     * @param {string} path - The path to validate and handle
     */
    validateAndHandleRoute(path) {
        // Extract just the pathname for validation
        const url = new URL(path, window.location.origin);
        const pathname = url.pathname;

        // Check if this is a valid route pattern
        if (!this.isValidRoutePattern(pathname)) {
            console.log('Router: Invalid route pattern:', pathname);
            // Replace the current URL with a 404 indicator and show 404
            window.history.replaceState(null, '', pathname);
            this.handle404();
            return;
        }

        // If valid pattern, proceed with normal route handling
        this.handleRoute(path);
    }

    /**
     * Check if a route pattern is valid (before trying to match specific routes)
     * @param {string} pathname - The pathname to validate
     * @returns {boolean} - Whether the route pattern is valid
     */
    isValidRoutePattern(pathname) {
        // Define valid route patterns
        const validPatterns = [
            /^\/$/,                          // /
            /^\/home$/,                      // /home
            /^\/profile$/,                   // /profile
            /^\/trending$/,                  // /trending
            /^\/myposts$/,                   // /myposts
            /^\/likedposts$/,                // /likedposts
            /^\/post\/[^\/]+$/,             // /post/{id}
            /^\/category\/[^\/]+$/,         // /category/{id}
        ];

        // Check if pathname matches any valid pattern
        return validPatterns.some(pattern => pattern.test(pathname));
    }

    /**
     * Handle route changes
     * @param {string} path - The path to handle
     */
    async handleRoute(path) {
        try {
            console.log('Router: Handling route:', path);
            const { route, params, query } = this.matchRoute(path);

            if (!route) {
                console.log('Router: No route found for path:', path);
                await this.handle404();
                return;
            }

            console.log('Router: Found route:', route.name, 'Component:', route.component);

            // Check authentication requirements
            if (route.requiresAuth && !this.checkAuth()) {
                this.navigate('/', true);
                return;
            }

            // Update current route info
            this.currentRoute = route;
            this.currentParams = params;
            this.currentQuery = query;

            // Update page title
            document.title = route.title;

            // Clean up 404 meta tags for valid routes
            this.cleanupMetaTags();

            // Render the route component
            await this.renderRoute(route, params, query);

            // Update navigation state
            this.updateNavigationState(route.name);

        } catch (error) {
            console.error('Error handling route:', error);
            this.handle404();
        }
    }

    /**
     * Match a path against defined routes
     * @param {string} path - The path to match
     * @returns {Object} - Matched route info
     */
    matchRoute(path) {
        const url = new URL(path, window.location.origin);
        const pathname = url.pathname;
        const query = Object.fromEntries(url.searchParams);

        // Try exact match first
        if (this.routes.has(pathname)) {
            return {
                route: this.routes.get(pathname),
                params: {},
                query
            };
        }

        // Try pattern matching for dynamic routes
        for (const [pattern, route] of this.routes) {
            const params = this.matchPattern(pattern, pathname);
            if (params !== null) {
                return { route, params, query };
            }
        }

        return { route: null, params: {}, query };
    }

    /**
     * Match a URL pattern against a pathname
     * @param {string} pattern - The route pattern
     * @param {string} pathname - The pathname to match
     * @returns {Object|null} - Matched parameters or null
     */
    matchPattern(pattern, pathname) {
        const patternParts = pattern.split('/');
        const pathParts = pathname.split('/');

        if (patternParts.length !== pathParts.length) {
            return null;
        }

        const params = {};

        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            const pathPart = pathParts[i];

            if (patternPart.startsWith(':')) {
                // Dynamic parameter
                const paramName = patternPart.slice(1);
                params[paramName] = pathPart;
            } else if (patternPart !== pathPart) {
                // Static part doesn't match
                return null;
            }
        }

        return params;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} - Authentication status
     */
    async checkAuth() {
        try {
            return await this.app.getAuthManager().checkAuthStatus();
        } catch (error) {
            console.error('Error checking auth status:', error);
            return false;
        }
    }

    /**
     * Render the current route component
     * @param {Object} route - Route configuration
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     */
    async renderRoute(route, params, query) {
        const mainContent = document.getElementById('mainContent');
        
        if (!mainContent) {
            console.error('Main content container not found');
            return;
        }

        // Show loading state
        mainContent.innerHTML = '<div class="loading">Loading...</div>';

        try {
            // Import and render the appropriate view component
            console.log('Router: Importing view component:', route.component);
            const viewModule = await import(`../views/${route.component}.mjs`);
            console.log('Router: View module loaded:', viewModule);
            const ViewClass = viewModule[route.component];

            if (!ViewClass) {
                throw new Error(`View component ${route.component} not found in module`);
            }

            console.log('Router: Creating view instance');
            const view = new ViewClass(this.app, params, query);
            console.log('Router: Rendering view');
            await view.render(mainContent);
            console.log('Router: View rendered successfully');

        } catch (error) {
            console.error(`Error rendering route ${route.name}:`, error);
            mainContent.innerHTML = `
                <div class="error-message">
                    <h2>Error Loading Page</h2>
                    <p>Sorry, there was an error loading this page.</p>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <button onclick="window.location.reload()">Refresh Page</button>
                </div>
            `;
        }
    }

    /**
     * Handle 404 errors
     */
    async handle404() {
        const mainContent = document.getElementById('mainContent');

        if (!mainContent) {
            console.error('Main content container not found for 404 page');
            return;
        }

        try {
            // Update page title and meta tags for 404
            document.title = '404 - Page Not Found | Forum';

            // Add or update meta tags to prevent indexing of 404 pages
            this.updateMetaTags();

            // Show loading state briefly
            mainContent.innerHTML = '<div class="loading">Loading...</div>';

            // Import and render the 404 view
            const { NotFoundView } = await import('../views/NotFoundView.mjs');
            const notFoundView = new NotFoundView(this.app, {}, {});
            await notFoundView.render(mainContent);

            // Update navigation state (no active menu item for 404)
            this.updateNavigationState(null);

            // Log the 404 for analytics/debugging
            console.warn(`404 Error: Page not found - ${window.location.pathname}`);

        } catch (error) {
            console.error('Error rendering 404 page:', error);
            // Fallback to basic 404 message
            mainContent.innerHTML = `
                <div class="error-message">
                    <h2>404 - Page Not Found</h2>
                    <p>The page you're looking for doesn't exist.</p>
                    <button onclick="window.location.href='/'">Go Home</button>
                </div>
            `;
        }
    }

    /**
     * Update meta tags for 404 pages
     */
    updateMetaTags() {
        // Remove existing robots meta tag if present
        const existingRobots = document.querySelector('meta[name="robots"]');
        if (existingRobots) {
            existingRobots.remove();
        }

        // Add noindex, nofollow for 404 pages
        const robotsMeta = document.createElement('meta');
        robotsMeta.name = 'robots';
        robotsMeta.content = 'noindex, nofollow';
        document.head.appendChild(robotsMeta);

        // Add canonical URL pointing to home page
        const existingCanonical = document.querySelector('link[rel="canonical"]');
        if (existingCanonical) {
            existingCanonical.remove();
        }

        const canonical = document.createElement('link');
        canonical.rel = 'canonical';
        canonical.href = window.location.origin + '/';
        document.head.appendChild(canonical);
    }

    /**
     * Clean up 404-specific meta tags for valid routes
     */
    cleanupMetaTags() {
        // Remove noindex robots meta tag
        const robotsMeta = document.querySelector('meta[name="robots"][content*="noindex"]');
        if (robotsMeta) {
            robotsMeta.remove();
        }

        // Remove 404 canonical tag
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical && canonical.href === window.location.origin + '/') {
            canonical.remove();
        }
    }

    /**
     * Update navigation state to reflect current route
     * @param {string|null} routeName - Current route name (null for 404)
     */
    updateNavigationState(routeName) {
        const menuItems = document.querySelectorAll('.menu-item[data-view]');

        menuItems.forEach(item => {
            item.classList.remove('active');

            // Only set active state if we have a valid route name
            if (routeName) {
                const view = item.getAttribute('data-view');
                // Handle home route - both / and /home should activate the home menu item
                if (view === routeName || (routeName === 'home' && view === 'home')) {
                    item.classList.add('active');
                }
            }
        });
    }

    /**
     * Get current route information
     * @returns {Object} - Current route info
     */
    getCurrentRoute() {
        return {
            route: this.currentRoute,
            params: this.currentParams,
            query: this.currentQuery
        };
    }
}

/**
 * Setup router function to be called from App.mjs
 * @param {App} app - The main app instance
 */
export function setupRouter(app) {
    app.router = new Router(app);
    return app.router;
}

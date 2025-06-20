/**
 * Navigation Manager - Handles navigation bar functionality
 */

export class NavManager {
    constructor(authManager, authModal, router = null) {
        this.authManager = authManager;
        this.authModal = authModal;
        this.router = router;
        this.navAuth = document.getElementById("navAuth");

        this.init();
    }

    /**
     * Initialize navigation components
     */
    init() {
        this.renderNavLogo();
        this.setupMenuHandlers();
    }

    /**
     * Render navigation logo
     */
    renderNavLogo() {
        const navLogoContainer = document.getElementById("navLogoContainer");

        if (!navLogoContainer) {
            console.error("Missing #navLogoContainer in index.html");
            return;
        }

        navLogoContainer.innerHTML = `
            <img src="http://localhost:8080/static/pictures/forum-logo.png" alt="Forum" class="nav-logo clickable-logo" title="Go to Home">
        `;

        // Setup logo click handler for home navigation
        const logoImg = navLogoContainer.querySelector('.nav-logo');
        if (logoImg) {
            logoImg.addEventListener('click', () => this.navigateToHome());
        }
    }

    /**
     * Setup authentication buttons based on user status
     */
    async setupAuthButtons() {
        try {
            const isAuthenticated = await this.authManager.checkAuthStatus();
            
            if (isAuthenticated) {
                const user = this.authManager.getCurrentUser();
                this.renderAuthenticatedNav(user);
            } else {
                this.renderUnauthenticatedNav();
            }
        } catch (error) {
            console.error("Error checking authentication:", error);
            this.renderUnauthenticatedNav();
        }
    }

    /**
     * Render navigation for authenticated users
     * @param {Object} user - Current user data
     */
    renderAuthenticatedNav(user) {
        this.navAuth.innerHTML = `
            <div class="nav-user-info">
                <img src="http://localhost:8080${user.avatar_url || '/static/pictures/default-avatar.png'}"
                     alt="User Avatar"
                     class="nav-avatar clickable-avatar"
                     title="Go to Profile"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlNWU3ZWIiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSIjOWNhM2FmIi8+CjxwYXRoIGQ9Ik0xMiAxNEM5LjMzIDEzLjk5IDcuMDEgMTUuNjIgNiAxOEMxMC4wMSAyMCAxMy45OSAyMCAxOCAxOEMxNi45OSAxNS42MiAxNC42NyAxMy45OSAxMiAxNFoiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+Cjwvc3ZnPgo8L3N2Zz4K'">
                <span class="nav-username clickable-username" title="Go to Profile">${user.username}</span>
                <button class="logout-btn">Logout</button>
            </div>
        `;

        // Setup logout handler
        const logoutBtn = document.querySelector(".logout-btn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => this.handleLogout());
        }

        // Setup profile navigation handlers
        const avatarImg = document.querySelector(".clickable-avatar");
        if (avatarImg) {
            avatarImg.addEventListener("click", () => this.navigateToProfile());
        }

        const usernameSpan = document.querySelector(".clickable-username");
        if (usernameSpan) {
            usernameSpan.addEventListener("click", () => this.navigateToProfile());
        }
    }

    /**
     * Render navigation for unauthenticated users
     */
    renderUnauthenticatedNav() {
        this.navAuth.innerHTML = `
            <button class="login-btn">Login</button>
            <button class="signup-btn">Sign Up</button>
        `;
        
        // Setup auth button handlers
        const loginBtn = document.querySelector(".login-btn");
        const signupBtn = document.querySelector(".signup-btn");
        
        if (loginBtn) {
            loginBtn.addEventListener("click", () => {
                this.authModal.showLoginModal();
            });
        }
        
        if (signupBtn) {
            signupBtn.addEventListener("click", () => {
                this.authModal.showSignupModal();
            });
        }
    }

    /**
     * Handle user logout
     */
    async handleLogout() {
        const success = await this.authManager.logout();

        if (success) {
            this.renderUnauthenticatedNav();
        } else {
            console.error("Logout failed");
        }
    }

    /**
     * Navigate to home page
     */
    navigateToHome() {
        if (this.router) {
            this.router.navigate('/');
        } else {
            console.warn('Router not available for home navigation');
            // Fallback: reload the page to home
            window.location.href = '/';
        }
    }

    /**
     * Navigate to user profile
     */
    navigateToProfile() {
        if (this.router) {
            this.router.navigate('/profile');
        } else {
            console.warn('Router not available for profile navigation');
        }
    }

    /**
     * Setup menu handlers for sidebar navigation
     */
    setupMenuHandlers() {
        const menuItems = document.querySelectorAll('.menu-item[data-view]');

        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                // Handle view switching
                const view = item.getAttribute('data-view');
                this.handleViewChange(view);
            });
        });
    }

    /**
     * Handle view changes from sidebar menu
     * @param {string} view - View name to switch to
     */
    handleViewChange(view) {
        console.log(`NavManager: Switching to view: ${view}`);
        console.log(`NavManager: Router available:`, !!this.router);

        // Use router for navigation if available
        if (this.router) {
            switch (view) {
                case 'home':
                case '/':
                case '/home':
                    this.router.navigate('/');
                    break;
                case 'profile':
                    this.router.navigate('/profile');
                    break;
                case 'trending':
                    this.router.navigate('/trending');
                    break;
                case 'saved':
                    this.router.navigate('/saved');
                    break;
                default:
                    console.warn(`Unknown view: ${view}`);
            }
        } else {
            console.warn('Router not available for navigation');
        }
    }

    /**
     * Update navigation after successful authentication
     * @param {Object} user - User data
     */
    onAuthSuccess(user) {
        this.renderAuthenticatedNav(user);
    }

    /**
     * Set router reference for navigation
     * @param {Router} router - Router instance
     */
    setRouter(router) {
        this.router = router;
    }
}

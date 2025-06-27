/**
 * Mobile Navigation Manager - Handles hamburger menu and mobile category dropdown
 */

export class MobileNavManager {
    constructor(app) {
        this.app = app;
        this.isMenuOpen = false;
        this.isCategoryDropdownOpen = false;
        this.init();
    }

    /**
     * Initialize mobile navigation
     */
    init() {
        console.log('MobileNavManager: Initializing...');

        // Check if elements exist
        const hamburger = document.querySelector('.hamburger-menu');
        const sidebar = document.querySelector('.left-sidebar');
        const dropdown = document.querySelector('.mobile-category-dropdown');

        console.log('Elements found:');
        console.log('- Hamburger menu:', !!hamburger);
        console.log('- Left sidebar:', !!sidebar);
        console.log('- Category dropdown:', !!dropdown);

        if (sidebar) {
            const menuItems = sidebar.querySelectorAll('.menu-item');
            console.log('- Menu items in sidebar:', menuItems.length);
            menuItems.forEach((item, index) => {
                console.log(`  ${index + 1}. ${item.textContent.trim()}`);
            });
        }

        this.setupEventListeners();
        this.handleResize();
        this.loadCategories();

        // Listen for route changes to update category selection
        window.addEventListener('popstate', () => {
            setTimeout(() => {
                const currentCategory = this.getCurrentCategory();
                this.updateCategorySelection(currentCategory.id, currentCategory.name);
            }, 100);
        });

        // Listen for window resize
        window.addEventListener('resize', () => this.handleResize());

        // Add global test function for debugging
        window.testMobileSidebar = () => {
            console.log('Testing mobile sidebar...');
            this.openSidebar();
        };

        console.log('MobileNavManager: Initialization complete');
        console.log('You can test the sidebar manually by typing: testMobileSidebar() in console');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Hamburger menu click
        document.addEventListener('click', (e) => {
            const hamburgerElement = e.target.closest('.hamburger-menu');
            if (hamburgerElement) {
                console.log('MobileNavManager: Hamburger menu clicked');
                console.log('Clicked element:', hamburgerElement);

                // Visual feedback
                hamburgerElement.style.background = '#00ff00';
                setTimeout(() => {
                    hamburgerElement.style.background = '';
                }, 200);

                this.toggleSidebar();
            }
        });

        // Sidebar overlay click (close menu)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('sidebar-overlay')) {
                this.closeSidebar();
            }
        });

        // Category dropdown click
        document.addEventListener('click', (e) => {
            if (e.target.closest('.category-dropdown-btn')) {
                this.toggleCategoryDropdown();
            }
        });

        // Category item click
        document.addEventListener('click', (e) => {
            const categoryItem = e.target.closest('.category-item');
            if (categoryItem && categoryItem.closest('.mobile-category-dropdown')) {
                try {
                    this.selectCategory(categoryItem);
                } catch (error) {
                    console.error('MobileNavManager: Error selecting category:', error);
                }
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.mobile-category-dropdown')) {
                this.closeCategoryDropdown();
            }
        });

        // ESC key to close menus
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSidebar();
                this.closeCategoryDropdown();
            }
        });

        // Close sidebar when menu item is clicked
        document.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.left-sidebar .menu-item');
            if (menuItem) {
                console.log('MobileNavManager: Menu item clicked:', menuItem.textContent.trim());
                const view = menuItem.getAttribute('data-view');
                console.log('MobileNavManager: View to navigate to:', view);

                // Close sidebar first
                this.closeSidebar();

                // Navigate using the app's navigation manager
                if (this.app.navManager && view) {
                    console.log('MobileNavManager: Triggering navigation to:', view);
                    this.app.navManager.handleViewChange(view);
                }
            }
        });
    }

    /**
     * Toggle sidebar menu
     */
    toggleSidebar() {
        console.log('MobileNavManager: Toggle sidebar, current state:', this.isMenuOpen);
        if (this.isMenuOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    /**
     * Open sidebar menu
     */
    openSidebar() {
        const hamburger = document.querySelector('.hamburger-menu');
        const sidebar = document.querySelector('.left-sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        console.log('MobileNavManager: Opening sidebar');
        console.log('Hamburger element:', hamburger);
        console.log('Sidebar element:', sidebar);
        console.log('Overlay element:', overlay);

        if (hamburger) hamburger.classList.add('active');
        if (sidebar) {
            sidebar.classList.add('show');
            console.log('Sidebar content:', sidebar.innerHTML.substring(0, 200) + '...');

            // Check menu items specifically
            const menuItems = sidebar.querySelectorAll('.menu-item');
            console.log('Menu items found in sidebar:', menuItems.length);
            menuItems.forEach((item, index) => {
                console.log(`Menu item ${index + 1}:`, item.textContent.trim(), 'visible:', window.getComputedStyle(item).display !== 'none');
            });
        }
        if (overlay) overlay.classList.add('show');

        this.isMenuOpen = true;
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    /**
     * Close sidebar menu
     */
    closeSidebar() {
        const hamburger = document.querySelector('.hamburger-menu');
        const sidebar = document.querySelector('.left-sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (hamburger) hamburger.classList.remove('active');
        if (sidebar) sidebar.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
        
        this.isMenuOpen = false;
        document.body.style.overflow = ''; // Restore scrolling
    }

    /**
     * Toggle category dropdown
     */
    toggleCategoryDropdown() {
        if (this.isCategoryDropdownOpen) {
            this.closeCategoryDropdown();
        } else {
            this.openCategoryDropdown();
        }
    }

    /**
     * Open category dropdown
     */
    openCategoryDropdown() {
        const dropdown = document.querySelector('.category-dropdown-content');
        const btn = document.querySelector('.category-dropdown-btn');
        
        if (dropdown) dropdown.classList.add('show');
        if (btn) btn.classList.add('active');
        
        this.isCategoryDropdownOpen = true;
        this.loadCategories();
    }

    /**
     * Close category dropdown
     */
    closeCategoryDropdown() {
        const dropdown = document.querySelector('.category-dropdown-content');
        const btn = document.querySelector('.category-dropdown-btn');
        
        if (dropdown) dropdown.classList.remove('show');
        if (btn) btn.classList.remove('active');
        
        this.isCategoryDropdownOpen = false;
    }

    /**
     * Load categories into mobile dropdown
     */
    async loadCategories() {
        const dropdown = document.querySelector('.category-dropdown-content');
        if (!dropdown) return;

        try {
            // Get categories from the app's category manager
            if (!this.app.categoryManager) return;
            
            const categories = await this.app.categoryManager.getCategories();
            
            // Keep the "All Posts" item and add categories
            const allPostsItem = dropdown.querySelector('[data-category="all"]');
            const existingItems = dropdown.querySelectorAll('.category-item:not([data-category="all"])');
            
            // Remove existing category items (keep "All Posts")
            existingItems.forEach(item => item.remove());

            // Add category items
            if (categories && categories.length > 0) {
                categories.forEach(category => {
                    const categoryItem = document.createElement('div');
                    categoryItem.className = 'category-item';
                    categoryItem.setAttribute('data-category', category.id);
                    categoryItem.innerHTML = `
                        <i class="fas fa-tag"></i> ${category.name}
                    `;
                    dropdown.appendChild(categoryItem);
                });
            }

            // Set the current active category based on URL
            const currentCategory = this.getCurrentCategory();
            this.updateCategorySelection(currentCategory.id, currentCategory.name);

        } catch (error) {
            console.error('Error loading categories for mobile dropdown:', error);
        }
    }

    /**
     * Select category from dropdown
     */
    selectCategory(categoryItem) {
        const categoryId = categoryItem.getAttribute('data-category');
        const categoryName = categoryItem.textContent.trim();
        const catId = categoryId === 'all' ? 0 : parseInt(categoryId);

        console.log('MobileNavManager: selectCategory called');
        console.log('- categoryId:', categoryId);
        console.log('- categoryName:', categoryName);
        console.log('- catId:', catId);

        // Update active state
        document.querySelectorAll('.mobile-category-dropdown .category-item').forEach(item => {
            item.classList.remove('active');
        });
        categoryItem.classList.add('active');

        // Update button text
        const btn = document.querySelector('.category-dropdown-btn span');
        if (btn) {
            btn.textContent = categoryName;
        }

        // Close dropdown
        this.closeCategoryDropdown();

        // Update the desktop category manager's active state
        if (this.app.categoryManager && this.app.categoryManager.updateActiveCategory) {
            console.log('MobileNavManager: Updating desktop category manager active state');
            this.app.categoryManager.updateActiveCategory(catId);
        }

        // Check if we're on the homepage, if not navigate there first
        const currentPath = window.location.pathname;
        const isOnHomepage = currentPath === '/' || currentPath === '/home';

        if (!isOnHomepage) {
            // Navigate to homepage with category filter
            console.log('MobileNavManager: Not on homepage, navigating to home with category filter');
            if (this.app.router) {
                const newUrl = catId === 0 ? '/' : `/?category=${catId}`;
                console.log('MobileNavManager: Navigating to:', newUrl);
                this.app.router.navigate(newUrl);
            }
        } else {
            // We're already on homepage, just filter directly
            console.log('MobileNavManager: On homepage, applying direct filtering');
            if (this.app.postManager && this.app.postManager.filterPostsByCategory) {
                console.log('MobileNavManager: Calling postManager.filterPostsByCategory with:', catId);
                this.app.postManager.filterPostsByCategory(catId);
            }

            // Update URL for consistency
            if (this.app.router) {
                const newUrl = catId === 0 ? '/' : `/?category=${catId}`;
                console.log('MobileNavManager: Updating URL to:', newUrl);
                window.history.pushState({}, '', newUrl);
            }
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const isMobile = window.innerWidth <= 1024;

        if (!isMobile) {
            // Close mobile menus when switching to desktop
            this.closeSidebar();
            this.closeCategoryDropdown();
        }
    }

    /**
     * Update category selection (called from other parts of the app)
     */
    updateCategorySelection(categoryId, categoryName) {
        console.log('MobileNavManager: Updating category selection:', categoryId, categoryName);

        // Update mobile dropdown selection
        const categoryItems = document.querySelectorAll('.mobile-category-dropdown .category-item');
        categoryItems.forEach(item => {
            item.classList.remove('active');
            const itemCategoryId = item.getAttribute('data-category');
            if ((categoryId === 0 || categoryId === '0' || categoryId === 'all') && itemCategoryId === 'all') {
                item.classList.add('active');
            } else if (itemCategoryId === String(categoryId)) {
                item.classList.add('active');
            }
        });

        // Update button text
        const btn = document.querySelector('.category-dropdown-btn span');
        if (btn) {
            btn.textContent = categoryName || 'Categories';
        }
    }

    /**
     * Get current category from URL or state
     */
    getCurrentCategory() {
        const path = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');

        // Check for category query parameter (home page with category filter)
        if ((path === '/' || path === '/home') && categoryParam) {
            const categoryId = parseInt(categoryParam);
            if (!isNaN(categoryId)) {
                // Find category name from loaded categories
                if (this.app.categoryManager && this.app.categoryManager.categories) {
                    const category = this.app.categoryManager.categories.find(cat => cat.id === categoryId);
                    return { id: categoryId, name: category ? category.name : `Category ${categoryId}` };
                }
                return { id: categoryId, name: `Category ${categoryId}` };
            }
        }

        // Check for category route (separate category view)
        const categoryMatch = path.match(/\/category\/(\d+)/);
        if (categoryMatch) {
            const categoryId = parseInt(categoryMatch[1]);
            // Find category name from loaded categories
            if (this.app.categoryManager && this.app.categoryManager.categories) {
                const category = this.app.categoryManager.categories.find(cat => cat.id === categoryId);
                return { id: categoryId, name: category ? category.name : `Category ${categoryId}` };
            }
            return { id: categoryId, name: `Category ${categoryId}` };
        }

        // Default to "All Posts"
        return { id: 0, name: 'All Posts' };
    }

    /**
     * Cleanup mobile navigation
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        
        // Restore body overflow
        document.body.style.overflow = '';
    }
}

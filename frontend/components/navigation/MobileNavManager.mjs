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
        this.setupEventListeners();
        this.handleResize();
        this.loadCategories();

        // Listen for window resize
        window.addEventListener('resize', () => this.handleResize());
        console.log('MobileNavManager: Initialization complete');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Hamburger menu click
        document.addEventListener('click', (e) => {
            if (e.target.closest('.hamburger-menu')) {
                console.log('MobileNavManager: Hamburger menu clicked');
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
                this.selectCategory(categoryItem);
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
            if (e.target.closest('.left-sidebar .menu-item')) {
                this.closeSidebar();
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

        if (hamburger) hamburger.classList.add('active');
        if (sidebar) sidebar.classList.add('show');
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

        // Filter posts by category
        if (this.app.categoryManager) {
            if (categoryId === 'all') {
                this.app.categoryManager.clearFilter();
            } else {
                this.app.categoryManager.filterByCategory(categoryId);
            }
        }

        // Navigate to home if not already there
        if (window.location.pathname !== '/') {
            this.app.router.navigate('/');
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const isMobile = window.innerWidth <= 768;
        
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
        // Update mobile dropdown selection
        const categoryItems = document.querySelectorAll('.mobile-category-dropdown .category-item');
        categoryItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-category') === categoryId) {
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
     * Cleanup mobile navigation
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        
        // Restore body overflow
        document.body.style.overflow = '';
    }
}

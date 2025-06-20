/**
 * Frontend Input Validation Utilities
 * Provides client-side validation to complement backend security measures
 */

export class ValidationUtils {
    /**
     * Validate and sanitize string input
     * @param {string} input - Input string to validate
     * @param {number} maxLength - Maximum allowed length
     * @param {string} fieldName - Name of the field for error messages
     * @returns {Object} - {isValid: boolean, sanitized: string, error: string}
     */
    static validateAndSanitizeString(input, maxLength, fieldName) {
        // Check for null or undefined
        if (!input) {
            return {
                isValid: false,
                sanitized: '',
                error: `${fieldName} cannot be empty`
            };
        }

        // Convert to string and trim
        const trimmed = String(input).trim();

        // Check length
        if (trimmed.length === 0) {
            return {
                isValid: false,
                sanitized: '',
                error: `${fieldName} cannot be empty`
            };
        }

        if (trimmed.length > maxLength) {
            return {
                isValid: false,
                sanitized: trimmed,
                error: `${fieldName} exceeds maximum length of ${maxLength} characters`
            };
        }

        // Basic HTML escaping for XSS prevention
        const sanitized = this.escapeHtml(trimmed);

        return {
            isValid: true,
            sanitized: sanitized,
            error: null
        };
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {Object} - {isValid: boolean, error: string}
     */
    static validateEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        
        if (!emailRegex.test(email)) {
            return {
                isValid: false,
                error: 'Please enter a valid email address'
            };
        }

        return {
            isValid: true,
            error: null
        };
    }

    /**
     * Validate username format
     * @param {string} username - Username to validate
     * @returns {Object} - {isValid: boolean, error: string}
     */
    static validateUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        
        if (!usernameRegex.test(username)) {
            return {
                isValid: false,
                error: 'Username can only contain letters, numbers, underscores, and hyphens'
            };
        }

        if (username.length < 3 || username.length > 30) {
            return {
                isValid: false,
                error: 'Username must be between 3 and 30 characters'
            };
        }

        return {
            isValid: true,
            error: null
        };
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} - {isValid: boolean, error: string, strength: string}
     */
    static validatePassword(password) {
        if (password.length < 8) {
            return {
                isValid: false,
                error: 'Password must be at least 8 characters long',
                strength: 'weak'
            };
        }

        if (password.length > 128) {
            return {
                isValid: false,
                error: 'Password must be less than 128 characters',
                strength: 'invalid'
            };
        }

        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasLetter || !hasNumber) {
            return {
                isValid: false,
                error: 'Password must contain at least one letter and one number',
                strength: 'weak'
            };
        }

        // Determine strength
        let strength = 'medium';
        if (password.length >= 12 && hasSpecial) {
            strength = 'strong';
        } else if (password.length >= 10 && hasSpecial) {
            strength = 'good';
        }

        return {
            isValid: true,
            error: null,
            strength: strength
        };
    }

    /**
     * Validate post content
     * @param {string} title - Post title
     * @param {string} content - Post content
     * @returns {Object} - {isValid: boolean, errors: Array}
     */
    static validatePostContent(title, content) {
        const errors = [];

        const titleValidation = this.validateAndSanitizeString(title, 200, 'Title');
        if (!titleValidation.isValid) {
            errors.push(titleValidation.error);
        }

        const contentValidation = this.validateAndSanitizeString(content, 10000, 'Content');
        if (!contentValidation.isValid) {
            errors.push(contentValidation.error);
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            sanitizedTitle: titleValidation.sanitized,
            sanitizedContent: contentValidation.sanitized
        };
    }

    /**
     * Validate comment content
     * @param {string} content - Comment content
     * @returns {Object} - {isValid: boolean, error: string, sanitized: string}
     */
    static validateCommentContent(content) {
        return this.validateAndSanitizeString(content, 2000, 'Comment');
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Validate form data before submission
     * @param {FormData} formData - Form data to validate
     * @param {Object} rules - Validation rules
     * @returns {Object} - {isValid: boolean, errors: Object, sanitizedData: Object}
     */
    static validateForm(formData, rules) {
        const errors = {};
        const sanitizedData = {};
        let isValid = true;

        for (const [fieldName, rule] of Object.entries(rules)) {
            const value = formData.get(fieldName);
            
            if (rule.required && (!value || value.trim() === '')) {
                errors[fieldName] = `${rule.label || fieldName} is required`;
                isValid = false;
                continue;
            }

            if (value) {
                let validation;
                
                switch (rule.type) {
                    case 'email':
                        validation = this.validateEmail(value);
                        break;
                    case 'username':
                        validation = this.validateUsername(value);
                        break;
                    case 'password':
                        validation = this.validatePassword(value);
                        break;
                    case 'string':
                        validation = this.validateAndSanitizeString(value, rule.maxLength || 255, rule.label || fieldName);
                        break;
                    default:
                        validation = { isValid: true, sanitized: value };
                }

                if (!validation.isValid) {
                    errors[fieldName] = validation.error;
                    isValid = false;
                } else {
                    sanitizedData[fieldName] = validation.sanitized || value;
                }
            }
        }

        return {
            isValid,
            errors,
            sanitizedData
        };
    }

    /**
     * Display validation errors in the UI
     * @param {Object} errors - Errors object
     * @param {string} containerSelector - CSS selector for error container
     */
    static displayErrors(errors, containerSelector = '.error-container') {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        container.innerHTML = '';

        if (Object.keys(errors).length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        
        for (const [field, error] of Object.entries(errors)) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = error;
            container.appendChild(errorDiv);
        }
    }

    /**
     * Clear validation errors from the UI
     * @param {string} containerSelector - CSS selector for error container
     */
    static clearErrors(containerSelector = '.error-container') {
        const container = document.querySelector(containerSelector);
        if (container) {
            container.innerHTML = '';
            container.style.display = 'none';
        }
    }
}

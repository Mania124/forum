/**
 * API utility functions for the forum application
 */

export class ApiUtils {
    // Base URL for API calls - use relative URLs for Docker deployment
    // nginx will proxy API calls to the backend container
    // For local development, set FORUM_API_BASE_URL environment variable or use localhost:8080
    static BASE_URL = window.location.hostname === 'localhost' && window.location.port === '8000'
        ? 'http://localhost:8080'
        : '';

    /**
     * Makes a GET request to the API
     * @param {string} endpoint - API endpoint
     * @param {boolean} includeCredentials - Whether to include credentials
     * @returns {Promise<any>} - Response data
     */
    static async get(endpoint, includeCredentials = false) {
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (includeCredentials) {
            options.credentials = 'include';
        }

        const response = await fetch(`${this.BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Makes a POST request to the API
     * @param {string} endpoint - API endpoint
     * @param {any} data - Data to send
     * @param {boolean} includeCredentials - Whether to include credentials
     * @param {boolean} isFormData - Whether data is FormData
     * @returns {Promise<any>} - Response data
     */
    static async post(endpoint, data, includeCredentials = false, isFormData = false) {
        const options = {
            method: 'POST',
            body: isFormData ? data : JSON.stringify(data)
        };

        if (!isFormData) {
            options.headers = {
                'Content-Type': 'application/json',
            };
        }

        if (includeCredentials) {
            options.credentials = 'include';
        }

        const response = await fetch(`${this.BASE_URL}${endpoint}`, options);
        
        // Handle text responses for debugging
        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            if (!response.ok) {
                throw new Error(`Server error: ${responseText}`);
            }
            responseData = responseText;
        }

        if (!response.ok) {
            throw new Error(responseData.error || `HTTP error! Status: ${response.status}`);
        }

        return { response, data: responseData };
    }

    /**
     * Handles common error scenarios
     * @param {Error} error - The error to handle
     * @param {string} context - Context where error occurred
     */
    static handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        if (error.message.includes('401')) {
            return { requiresAuth: true, message: 'Please log in to continue.' };
        }
        
        return { requiresAuth: false, message: error.message };
    }
}

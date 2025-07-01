# Forum Frontend Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Components](#components)
4. [Configuration](#configuration)
5. [Authentication Flow](#authentication-flow)
6. [State Management](#state-management)
7. [API Interactions](#api-interactions)
8. [Running the Frontend](#running-the-frontend)
9. [Deployment](#deployment)

## Project Overview

This is a modern, single-page web application for a forum platform. The frontend is built using vanilla JavaScript and provides a responsive, interactive user experience for forum interactions.

## Project Structure

## Components

### Authentication Manager ([auth.js](./components/auth.js))

- Handles user authentication processes.
- Methods:
  - **[checkAuth()](./components/auth.js#L15)**: Verifies user authentication status by checking if a valid JWT token is stored in `localStorage`. If the token is present, it sends a request to the server to verify the token's validity and retrieves the current user's information.
  - **[handleLogin()](./components/auth.js#L36)**: Processes user login by sending the email and password to the server. If the login is successful, it stores the returned JWT token in `localStorage`, updates the current user state, and renders the authenticated UI. If it fails, it alerts the user with an error message.
  - **[handleRegister()](./components/auth.js#L63)**: Processes user registration by collecting user data (username, email, password, avatar) and sending it to the server. Upon successful registration, it stores the JWT token and user information, updates the UI, and reloads the page. If registration fails, it alerts the user.
  - **[logout()](./components/auth.js#L94)**: Logs out the current user by clearing the user state, removing the JWT token from `localStorage`, and deleting the user cookie. It then renders the authentication buttons for unauthenticated users and reloads the page.
  - **[renderAuthButtons()](./components/auth.js#L107)**: Dynamically renders the authentication buttons based on the current user's authentication state. If the user is logged in, it displays a welcome message and a logout button. If not, it shows the login and register buttons.
  - **[showLoginForm()](./components/auth.js#L124)**: Displays the login form in a modal.
  - **[showRegisterForm()](./components/auth.js#L136)**: Displays the registration form in a modal.

### Post Manager ([post.js](./components/post.js))

- Manages post-related operations.
- Key Functionalities:
  - **[fetchPosts()](./components/post.js#L10)**: Retrieves posts from the server.
  - **[createPost()](./components/post.js#L30)**: Sends a new post to the server for creation.
  - **[filterBySearch()](./components/post.js#L50)**: Filters posts based on a search query.
  - **[resetFilter()](./components/post.js#L70)**: Resets the post filter to show all posts.
  - **[handlePostInteraction()](./components/post.js#L90)**: Manages interactions such as liking or commenting on posts.

### Category Manager ([category.js](./components/category.js))

- Handles category-related operations.
- Responsibilities:
  - **[fetchCategories()](./components/category.js#L10)**: Retrieves categories from the server.
  - **[filterPostsByCategory()](./components/category.js#L30)**: Filters posts based on the selected category.

### Profile Manager ([profile.js](./components/profile.js))

- Manages user profile interactions.
- Features:
  - **[fetchUserProfile()](./components/profile.js#L10)**: Retrieves the current user's profile information.
  - **[updateProfile()](./components/profile.js#L30)**: Sends updated profile information to the server.
  - **[displayProfile()](./components/profile.js#L50)**: Renders the user's profile information in the UI.

### Trending Manager ([trending.js](./components/trending.js))

- Manages trending content.
- Responsibilities:
  - **[fetchTrendingPosts()](./components/trending.js#L10)**: Retrieves trending posts from the server.
  - **[displayTrendingPosts()](./components/trending.js#L30)**: Renders trending posts in the UI.

### Story Manager ([story.js](./components/story.js))

- Manages story-related features.
- Responsibilities:
  - **[fetchStories()](./components/story.js#L10)**: Retrieves stories from the server.
  - **[createStory()](./components/story.js#L30)**: Sends a new story to the server for creation.
  - **[displayStories()](./components/story.js#L50)**: Renders stories in the UI.

### Navigation Manager ([navigation.js](./components/navigation.js))

- Manages navigation and routing within the application.
- Responsibilities:
  - **[init()](./components/navigation.js#L10)**: Initializes navigation settings and event listeners.
  - **[loadPage()](./components/navigation.js#L30)**: Loads the appropriate page based on user interaction.

## Configuration

### API Configuration ([config.mjs](./config.mjs))

```javascript
export const API_BASE_URL = 'http://localhost:8080/api';
export const APP_CONFIG = {
    MAX_POST_LENGTH: 500,
    DEFAULT_AVATAR: '/assets/default-avatar.png',
    PAGINATION_LIMIT: 10
};

  ```

## Authentication Flow

The authentication flow is a critical part of the application, allowing users to securely log in, register, and manage their sessions. The flow involves the following steps:

1. **User Interaction**:
   - Users can click on the "Login" or "Register" buttons in the navigation bar. This triggers the display of the authentication modal.

2. **Form Submission**:
   - When a user submits the login or registration form, the corresponding handler method (`handleLogin` or `handleRegister`) is invoked.

3. **Server Communication**:
   - The application sends a request to the backend API:
     - **Login**: Sends the user's email and password to the `/auth/login` endpoint.
     - **Register**: Sends the user's details to the `/auth/register` endpoint.

4. **Response Handling**:
   - If the server responds with a successful authentication (HTTP 200), the application:
     - Stores the JWT token in `localStorage`.
     - Updates the current user state.
     - Renders the authenticated UI.
   - If authentication fails, an error message is displayed to the user.

5. **Session Management**:
   - The application checks the user's authentication status on page load using the `checkAuth` method, which verifies the token's validity by calling the `/auth/verify` endpoint.

## State Management

State management is essential for maintaining the application's responsiveness and user experience. The frontend uses the following strategies for state management:

- **Local Storage**:
  - The application stores the JWT token in `localStorage` to persist the user's authentication state across page reloads. This allows the user to remain logged in until they explicitly log out.

- **Cookies**:
  - User data (such as profile information) is stored in cookies with an expiration date, allowing for easy access and management of user sessions.

- **In-Memory State**:
  - The application maintains an in-memory state for the current user and other dynamic data (like posts and categories) to provide a seamless user experience without constant server requests.

## API Interactions

The frontend interacts with the backend API to perform various operations. Here are the key API interactions:

- **Authentication Endpoints**:
  - **POST `/auth/login`**: Authenticates the user and returns a JWT token.
  - **POST `/auth/register`**: Registers a new user and returns a JWT token.
  - **GET `/auth/verify`**: Verifies the JWT token's validity.

- **Post Management Endpoints**:
  - **GET `/posts`**: Retrieves a list of posts.
  - **POST `/posts/create`**: Creates a new post.
  - **GET `/posts/search`**: Searches for posts based on a query.

- **Category Management Endpoints**:
  - **GET `/categories`**: Retrieves a list of categories.
  - **GET `/categories/{id}`**: Fetches posts associated with a specific category.

- **Profile Management Endpoints**:
  - **GET `/profile`**: Retrieves the current user's profile information.
  - **PUT `/profile`**: Updates the user's profile information.

## Running the Frontend

To run the frontend of the forum application, ensure you are in the `frontend` directory. You can use one of the following methods:

1. **Using npx serve (Recommended)**:
   - First, ensure you have Node.js and npm installed on your machine.
   - Navigate to the `frontend` directory:

     ```bash
     cd /path/to/your/forum/frontend
     ```

   - Run the server using npx serve:

     ```bash
     npx serve -s . -l 8000
     ```

   - **Access the Application**: Open your web browser and go to `http://localhost:8000`.

2. **Using npm with a Development Script**:
   - First, ensure you have Node.js and npm installed on your machine.
   - Navigate to the `frontend` directory:

     ```bash
     cd /path/to/your/forum/frontend
     ```

   - Install the necessary npm packages defined in your `package.json`:

     ```bash
     npm install
     ```

   - If you have a development script defined in your `package.json`, you can start the development server by running:

     ```bash
     npm run dev
     ```

   - **Access the Application**: Open your web browser and go to the URL specified in your script (usually `http://localhost:8000` or similar).


## Deployment

Deployment involves making your application available to users on the internet. Here are the recommended steps:

1. **Build the Application**:
   - Ensure all assets are optimized for production. Use tools like Webpack or Parcel to bundle your JavaScript files, minify CSS, and optimize images. This reduces load times and improves performance.
   - Example command to build with Webpack:

     ```bash
     npx webpack --mode production
     ```

2. **Choose a Hosting Platform**:
   - Select a platform that suits your needs:
     - **Netlify**: Ideal for static sites with continuous deployment from Git repositories.
     - **Vercel**: Great for serverless applications and frontend frameworks.
     - **GitHub Pages**: Simple hosting for static sites directly from a GitHub repository.
     - **Firebase Hosting**: Fast and secure hosting for web apps with a simple deployment process.

3. **Configure Environment Variables**:
   - Set up any necessary environment variables for API endpoints or other configurations. This is especially important for sensitive information like API keys. Most hosting platforms provide a way to set environment variables through their dashboard or CLI.

4. **Deploy**:
   - Follow the hosting platform's instructions to deploy your application. This often involves pushing your code to a Git repository or using CLI tools provided by the platform.
   - Example commands for deploying to Netlify and Vercel:
     - **Netlify**:

       ```bash
       netlify deploy --prod
       ```

     - **Vercel**:

       ```bash
       vercel --prod
       ```

5. **Monitor and Maintain**:
   - After deployment, monitor the application for performance and errors. Use tools like Google Analytics for tracking user interactions and performance metrics.
   - Set up error logging to catch any issues that users may encounter. Services like Sentry or LogRocket can help with this.
   - Be prepared to make updates as needed, whether for bug fixes, performance improvements, or new features.

6. **Documentation and Support**:
   - Ensure that your application is well-documented, both for users and for future developers. This includes a clear README, inline code comments, and any necessary user guides.
   - Consider setting up a support channel (like a Discord server or a dedicated email) for users to report issues or ask questions.

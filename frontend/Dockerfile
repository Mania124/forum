# --- Stage 1: Build Stage ---
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files (if they exist)
# Note: This frontend uses vanilla JS/HTML/CSS, so no package.json needed
# But we'll prepare for future npm dependencies

# Copy frontend source code
COPY . .

# Create any necessary build directories
RUN mkdir -p /app/dist

# For vanilla JS/HTML/CSS, we just copy files
# In the future, this could include build steps like:
# RUN npm install && npm run build

# --- Stage 2: Production Stage with Nginx ---
FROM nginx:alpine

# Remove default nginx website and configuration
RUN rm -rf /usr/share/nginx/html/* && rm -f /etc/nginx/conf.d/default.conf

# Copy frontend files to nginx html directory
COPY --from=builder /app /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy custom mime.types that includes .mjs support
COPY mime.types /etc/nginx/mime.types

# Create log directories
RUN mkdir -p /var/log/nginx

# Expose port 80 for nginx
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

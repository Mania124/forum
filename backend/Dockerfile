# --- Stage 1: Build Stage ---
    FROM golang:1.23.0-alpine AS builder

    # Install required build tools for CGO
    RUN apk add --no-cache gcc musl-dev sqlite-dev

    # Set working directory inside container
    WORKDIR /app
    
    # Copy Go modules and dependencies
    COPY go.mod go.sum ./
    RUN go mod download
    
    # Copy application source code
    COPY . .

    # Ensure static assets exist in builder stage
    RUN ls -la static/pictures/ || echo "Static directory not found"
    
    # Set CGO enabled for sqlite
    ENV CGO_ENABLED=1

    # Build the Go binary
    RUN go build -o forum-server main.go

    # --- Stage 2: Final Minimal Image ---
    FROM alpine:latest
    
    # Install required dependencies (sqlite for database support)
    RUN apk --no-cache add sqlite
    
    # Create static directories with proper permissions
    RUN mkdir -p /app/static/pictures /app/static/profiles
    RUN chmod -R 755 /app/static

    # Set working directory inside container
    WORKDIR /app

    # Copy the built binary from the builder stage
    COPY --from=builder /app/forum-server /app/
    COPY --from=builder /app/schema.sql /app/

    # Copy essential static assets (forum logo and default avatar)
    COPY --from=builder /app/static/pictures/forum-logo.png /app/static/pictures/
    COPY --from=builder /app/static/pictures/icons8-avatar.gif /app/static/pictures/
    COPY --from=builder /app/static/profiles/default.png /app/static/profiles/

    # Ensure proper permissions for static files
    RUN chmod -R 755 /app/static

    # Create data directory for database
    RUN mkdir -p /app/data && chmod -R 755 /app/data

    # Expose port (match the port used in `main.go`)
    EXPOSE 8080

    # Start the server
    CMD ["/app/forum-server"]
     
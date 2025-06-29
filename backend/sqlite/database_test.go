package sqlite

import (
	"database/sql"
	"os"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func TestInitializeDatabase(t *testing.T) {
	// Create a temporary database file for testing
	tempDBPath := "test_forum.db"
	defer os.Remove(tempDBPath) // Clean up after test

	// Create a minimal schema file for testing
	schemaContent := `
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT DEFAULT '/static/default-avatar.png',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`

	// Create temporary schema file
	schemaFile := "test_schema.sql"
	err := os.WriteFile(schemaFile, []byte(schemaContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create test schema file: %v", err)
	}
	defer os.Remove(schemaFile)

	// Change to test schema temporarily
	originalSchema := "schema.sql"
	if _, err := os.Stat(originalSchema); os.IsNotExist(err) {
		// If original schema doesn't exist, create a copy of our test schema
		err = os.WriteFile(originalSchema, []byte(schemaContent), 0644)
		if err != nil {
			t.Fatalf("Failed to create original schema file: %v", err)
		}
		defer os.Remove(originalSchema)
	}

	t.Run("successful initialization", func(t *testing.T) {
		err := InitializeDatabase(tempDBPath)
		if err != nil {
			t.Fatalf("InitializeDatabase failed: %v", err)
		}

		// Verify database was created and is accessible
		if DB == nil {
			t.Fatal("Database connection should not be nil")
		}

		// Test that we can execute a simple query
		var count int
		err = DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
		if err != nil {
			t.Fatalf("Failed to query users table: %v", err)
		}

		// Test foreign key constraints are enabled
		var foreignKeys int
		err = DB.QueryRow("PRAGMA foreign_keys").Scan(&foreignKeys)
		if err != nil {
			t.Fatalf("Failed to check foreign key setting: %v", err)
		}
		if foreignKeys != 1 {
			t.Fatal("Foreign keys should be enabled")
		}
	})

	t.Run("invalid database path", func(t *testing.T) {
		// Try to initialize with an invalid path
		err := InitializeDatabase("/invalid/path/database.db")
		if err == nil {
			t.Fatal("Expected error for invalid database path")
		}
	})
}

func TestCloseDatabase(t *testing.T) {
	// Create a test database
	tempDBPath := "test_close_db.db"
	defer os.Remove(tempDBPath)

	// Create minimal schema
	schemaContent := `CREATE TABLE test (id INTEGER PRIMARY KEY);`
	schemaFile := "schema.sql"
	err := os.WriteFile(schemaFile, []byte(schemaContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create schema file: %v", err)
	}
	defer os.Remove(schemaFile)

	// Initialize database
	err = InitializeDatabase(tempDBPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}

	// Close database
	CloseDatabase()

	// Verify database is closed by trying to use it
	if DB != nil {
		var count int
		err = DB.QueryRow("SELECT COUNT(*) FROM test").Scan(&count)
		if err == nil {
			t.Fatal("Database should be closed and unavailable")
		}
	}
}

func TestDatabaseConnection(t *testing.T) {
	t.Run("database connection properties", func(t *testing.T) {
		// Create test database
		tempDBPath := "test_connection.db"
		defer os.Remove(tempDBPath)

		// Create minimal schema
		schemaContent := `CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT);`
		schemaFile := "schema.sql"
		err := os.WriteFile(schemaFile, []byte(schemaContent), 0644)
		if err != nil {
			t.Fatalf("Failed to create schema file: %v", err)
		}
		defer os.Remove(schemaFile)

		err = InitializeDatabase(tempDBPath)
		if err != nil {
			t.Fatalf("Failed to initialize database: %v", err)
		}
		defer CloseDatabase()

		// Test that we can ping the database
		err = DB.Ping()
		if err != nil {
			t.Fatalf("Database ping failed: %v", err)
		}

		// Test basic operations
		_, err = DB.Exec("INSERT INTO test_table (name) VALUES (?)", "test")
		if err != nil {
			t.Fatalf("Failed to insert test data: %v", err)
		}

		var name string
		err = DB.QueryRow("SELECT name FROM test_table WHERE id = 1").Scan(&name)
		if err != nil {
			t.Fatalf("Failed to query test data: %v", err)
		}

		if name != "test" {
			t.Fatalf("Expected name 'test', got '%s'", name)
		}
	})
}

func TestApplySchemaFromFile(t *testing.T) {
	t.Run("valid schema file", func(t *testing.T) {
		// Create a test database
		db, err := sql.Open("sqlite3", ":memory:")
		if err != nil {
			t.Fatalf("Failed to create test database: %v", err)
		}
		defer db.Close()

		// Create test schema file
		schemaContent := `
CREATE TABLE test_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE test_posts (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    title TEXT,
    FOREIGN KEY (user_id) REFERENCES test_users(id)
);
`
		schemaFile := "test_schema_apply.sql"
		err = os.WriteFile(schemaFile, []byte(schemaContent), 0644)
		if err != nil {
			t.Fatalf("Failed to create test schema file: %v", err)
		}
		defer os.Remove(schemaFile)

		// Set the global DB for testing
		originalDB := DB
		DB = db
		defer func() { DB = originalDB }()

		// Test applying schema
		err = applySchemaFromFile(schemaFile)
		if err != nil {
			t.Fatalf("applySchemaFromFile failed: %v", err)
		}

		// Verify tables were created
		var count int
		err = db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name LIKE 'test_%'").Scan(&count)
		if err != nil {
			t.Fatalf("Failed to count created tables: %v", err)
		}

		if count != 2 {
			t.Fatalf("Expected 2 tables to be created, got %d", count)
		}
	})

	t.Run("nonexistent schema file", func(t *testing.T) {
		err := applySchemaFromFile("nonexistent_schema.sql")
		if err == nil {
			t.Fatal("Expected error for nonexistent schema file")
		}
	})

	t.Run("invalid SQL in schema file", func(t *testing.T) {
		// Create invalid schema file
		invalidSchema := "CREATE TABLE invalid_table (id INTEGER; INVALID SYNTAX HERE"
		schemaFile := "invalid_schema.sql"
		err := os.WriteFile(schemaFile, []byte(invalidSchema), 0644)
		if err != nil {
			t.Fatalf("Failed to create invalid schema file: %v", err)
		}
		defer os.Remove(schemaFile)

		// Create test database
		db, err := sql.Open("sqlite3", ":memory:")
		if err != nil {
			t.Fatalf("Failed to create test database: %v", err)
		}
		defer db.Close()

		// Set global DB for testing
		originalDB := DB
		DB = db
		defer func() { DB = originalDB }()

		err = applySchemaFromFile(schemaFile)
		if err == nil {
			t.Fatal("Expected error for invalid SQL schema")
		}
	})
}

func TestDatabaseLifecycle(t *testing.T) {
	t.Run("full database lifecycle", func(t *testing.T) {
		tempDBPath := "test_lifecycle.db"
		defer os.Remove(tempDBPath)

		// Create comprehensive schema
		schemaContent := `
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT DEFAULT '/static/default-avatar.png',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`
		schemaFile := "schema.sql"
		err := os.WriteFile(schemaFile, []byte(schemaContent), 0644)
		if err != nil {
			t.Fatalf("Failed to create schema file: %v", err)
		}
		defer os.Remove(schemaFile)

		// Initialize database
		err = InitializeDatabase(tempDBPath)
		if err != nil {
			t.Fatalf("Failed to initialize database: %v", err)
		}

		// Test database operations
		// Insert test user
		userID := "test-user-123"
		_, err = DB.Exec(`
			INSERT INTO users (id, username, email, password_hash)
			VALUES (?, ?, ?, ?)
		`, userID, "testuser", "test@example.com", "hashedpassword")
		if err != nil {
			t.Fatalf("Failed to insert test user: %v", err)
		}

		// Insert test category
		_, err = DB.Exec(`
			INSERT INTO categories (name, description)
			VALUES (?, ?)
		`, "Technology", "Tech related posts")
		if err != nil {
			t.Fatalf("Failed to insert test category: %v", err)
		}

		// Insert test post
		_, err = DB.Exec(`
			INSERT INTO posts (user_id, title, content)
			VALUES (?, ?, ?)
		`, userID, "Test Post", "This is a test post content")
		if err != nil {
			t.Fatalf("Failed to insert test post: %v", err)
		}

		// Verify data integrity
		var username string
		err = DB.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&username)
		if err != nil {
			t.Fatalf("Failed to query user: %v", err)
		}
		if username != "testuser" {
			t.Fatalf("Expected username 'testuser', got '%s'", username)
		}

		// Close database
		CloseDatabase()
	})
}

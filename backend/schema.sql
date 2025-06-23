-- schema.sql: SQLite Database Schema

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster session lookup
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Updated Posts Table (remove category_id)
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Post-Categories Join Table
CREATE TABLE IF NOT EXISTS post_categories (
    post_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, category_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);



-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    post_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    -- FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
);
-- ReplyComments Table
CREATE TABLE IF NOT EXISTS replycomments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    parent_comment_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
);


-- Likes Table (Supports both post and comment likes and allows dislikes)
CREATE TABLE IF NOT EXISTS likes (
    user_id TEXT NOT NULL,
    post_id INTEGER,
    comment_id INTEGER,
    type TEXT NOT NULL CHECK(type IN ('like', 'dislike')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id, comment_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Ensure the old trigger is removed before creating a new one
DROP TRIGGER IF EXISTS update_user_timestamp;
DROP TRIGGER IF EXISTS update_post_timestamp;
DROP TRIGGER IF EXISTS update_comment_timestamp;

-- Auto-update `updated_at` column in `users`
CREATE TRIGGER update_user_timestamp
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Auto-update `updated_at` column in `posts`
CREATE TRIGGER update_post_timestamp
AFTER UPDATE ON posts
FOR EACH ROW
BEGIN
    UPDATE posts SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Auto-update `updated_at` column in `comments`
CREATE TRIGGER update_comment_timestamp
AFTER UPDATE ON comments
FOR EACH ROW
BEGIN
    UPDATE comments SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);


BEGIN TRANSACTION;

-- -- Insert sample users (with UUIDs)
-- INSERT INTO users (id, username, email, password_hash, avatar_url) VALUES
-- ('014b3423-b8a2-4129-ba20-85efea98e119', 'john_dev', 'john@dev.com', '$2a$10$hashedpass1', '/static/pictures/icon1.png'),
-- ('3a094c34-a8bd-4514-82dc-48b306c987eb', 'jane_tech', 'jane@tech.com', '$2a$10$hashedpass2', '/static/pictures/icon3.png'),
-- ('5f38b9c6-0dec-4075-a145-6716d85ca219', 'alice_data', 'alice@data.com', '$2a$10$hashedpass3', '/static/pictures/icon5.png'),
-- ('eddca3a0-45a0-4559-a55d-63480eccaeb0', 'bob_security', 'bob@security.com', '$2a$10$hashedpass4', '/static/pictures/icon7.png'),
-- ('0bbdb9ae-5955-4269-aff1-dcf1a57a03fc', 'emma_cloud', 'emma@cloud.com', '$2a$10$hashedpass5', '/static/pictures/icon9.png'),
-- ('5fc3bda1-8832-46fc-a26f-367954b3de36', 'mike_game', 'mike@game.com', '$2a$10$hashedpass6', '/static/pictures/icon2.png'),
-- ('16dbbb7c-46fe-4036-9cec-6d978d3d02bd', 'sarah_ai', 'sarah@ai.com', '$2a$10$hashedpass7', '/static/pictures/icon4.png'),
-- ('8cab6c13-6f8f-4a30-90db-d34c37e90457', 'james_arch', 'james@arch.com', '$2a$10$hashedpass8', '/static/pictures/icon6.png'),
-- ('7426e07d-577f-48fe-b968-636dcfab6307', 'lisa_mobile', 'lisa@mobile.com', '$2a$10$hashedpass9', '/static/pictures/icon8.png'),
-- ('71caaa69-9ae5-46e7-b77c-335bf371c6a9', 'david_block', 'david@block.com', '$2a$10$hashedpass10', '/static/pictures/icon10.png');

-- -- Insert sample posts
-- INSERT INTO posts (user_id, title, content, image_url) VALUES
-- ('014b3423-b8a2-4129-ba20-85efea98e119', 'iOS App Security', 'Mobile security guidelines...', '/static/pictures/post1.png'),
-- ('3a094c34-a8bd-4514-82dc-48b306c987eb', 'Python Data Visualization', 'Using matplotlib and seaborn...', '/static/pictures/post2.png'),
-- ('5f38b9c6-0dec-4075-a145-6716d85ca219', 'Docker Optimization', 'Container performance tips...', '/static/pictures/post3.png'),
-- ('eddca3a0-45a0-4559-a55d-63480eccaeb0', 'Ethical Hacking Guide', 'Penetration testing basics...', '/static/pictures/post4.png'),
-- ('0bbdb9ae-5955-4269-aff1-dcf1a57a03fc', 'Neural Networks Explained', 'Deep learning fundamentals...', '/static/pictures/post5.png'),
-- ('5fc3bda1-8832-46fc-a26f-367954b3de36', 'API Design Patterns', 'REST and GraphQL best practices...', '/static/pictures/post6.png'),
-- ('16dbbb7c-46fe-4036-9cec-6d978d3d02bd', 'Unreal Engine Tips', 'Game optimization techniques...', '/static/pictures/post7.png'),
-- ('8cab6c13-6f8f-4a30-90db-d34c37e90457', 'Serverless Architecture', 'Building scalable functions...', '/static/pictures/post8.png'),
-- ('7426e07d-577f-48fe-b968-636dcfab6307', 'Smart Contract Security', 'Blockchain security patterns...', '/static/pictures/post9.png'),
-- ('71caaa69-9ae5-46e7-b77c-335bf371c6a9', 'TypeScript Advanced Types', 'Type system deep dive...', '/static/pictures/post10.png');

-- -- -- Insert sample comments
-- INSERT INTO comments (user_id, post_id, content) VALUES
-- ('014b3423-b8a2-4129-ba20-85efea98e119', 8, 'Great insights on mobile security!'),
-- ('3a094c34-a8bd-4514-82dc-48b306c987eb', 10, 'This visualization guide is very helpful.'),
-- ('5f38b9c6-0dec-4075-a145-6716d85ca219', 9, 'Docker optimization tips are spot on.'),
-- ('eddca3a0-45a0-4559-a55d-63480eccaeb0', 7, 'Ethical hacking is an essential skill.'),
-- ('0bbdb9ae-5955-4269-aff1-dcf1a57a03fc', 6, 'Neural networks explained clearly.'),
-- ('5fc3bda1-8832-46fc-a26f-367954b3de36', 5, 'API design patterns are well covered.The issue is most likely due to the attribute value not being quoted. In CSS selectors, if an attribute value is purely numeric or contains special characters, it should be quoted.'),
-- ('16dbbb7c-46fe-4036-9cec-6d978d3d02bd', 6, 'Unreal Engine tips are very practical.'),
-- ('8cab6c13-6f8f-4a30-90db-d34c37e90457', 3, 'Serverless architecture is the future.'),
-- ('7426e07d-577f-48fe-b968-636dcfab6307', 7, 'Smart contract security is crucial.'),
-- ('71caaa69-9ae5-46e7-b77c-335bf371c6a9', 3, 'Advanced TypeScriptThe issue is most likely due to the attribute value not being quoted. In CSS selectors, if an attribute value is purely numeric or contains special characters, it should be quoted. types are fascinating.');

-- -- Insert sample sessions
-- INSERT INTO sessions (id, user_id) VALUES
-- ('sess-1', '014b3423-b8a2-4129-ba20-85efea98e119'),
-- ('sess-2', '3a094c34-a8bd-4514-82dc-48b306c987eb'),
-- ('sess-3', '5f38b9c6-0dec-4075-a145-6716d85ca219'),
-- ('sess-4', 'eddca3a0-45a0-4559-a55d-63480eccaeb0'),
-- ('sess-5', '0bbdb9ae-5955-4269-aff1-dcf1a57a03fc'),
-- ('sess-6', '5fc3bda1-8832-46fc-a26f-367954b3de36'),
-- ('sess-7', '16dbbb7c-46fe-4036-9cec-6d978d3d02bd'),
-- ('sess-8', '8cab6c13-6f8f-4a30-90db-d34c37e90457'),
-- ('sess-9', '7426e07d-577f-48fe-b968-636dcfab6307'),
-- ('sess-10', '71caaa69-9ae5-46e7-b77c-335bf371c6a9');

-- -- Insert extended likes (likes and dislikes on posts and comments)
-- INSERT INTO likes (user_id, post_id, comment_id, type) VALUES
-- -- Post Likes
-- ('014b3423-b8a2-4129-ba20-85efea98e119', 1, NULL, 'like'),
-- ('3a094c34-a8bd-4514-82dc-48b306c987eb', 2, NULL, 'like'),
-- ('5f38b9c6-0dec-4075-a145-6716d85ca219', 3, NULL, 'like'),
-- ('eddca3a0-45a0-4559-a55d-63480eccaeb0', 4, NULL, 'dislike'),
-- ('0bbdb9ae-5955-4269-aff1-dcf1a57a03fc', 5, NULL, 'like'),
-- ('5fc3bda1-8832-46fc-a26f-367954b3de36', 6, NULL, 'like'),
-- ('16dbbb7c-46fe-4036-9cec-6d978d3d02bd', 7, NULL, 'dislike'),
-- ('8cab6c13-6f8f-4a30-90db-d34c37e90457', 8, NULL, 'like'),
-- ('7426e07d-577f-48fe-b968-636dcfab6307', 9, NULL, 'dislike'),
-- ('71caaa69-9ae5-46e7-b77c-335bf371c6a9', 10, NULL, 'like'),

-- -- Comment Likes/Dislikes
-- ('3a094c34-a8bd-4514-82dc-48b306c987eb', NULL, 1, 'like'),
-- ('5f38b9c6-0dec-4075-a145-6716d85ca219', NULL, 2, 'dislike'),
-- ('eddca3a0-45a0-4559-a55d-63480eccaeb0', NULL, 3, 'like'),
-- ('0bbdb9ae-5955-4269-aff1-dcf1a57a03fc', NULL, 4, 'like'),
-- ('5fc3bda1-8832-46fc-a26f-367954b3de36', NULL, 5, 'dislike'),
-- ('16dbbb7c-46fe-4036-9cec-6d978d3d02bd', NULL, 6, 'like'),
-- ('8cab6c13-6f8f-4a30-90db-d34c37e90457', NULL, 7, 'dislike'),
-- ('7426e07d-577f-48fe-b968-636dcfab6307', NULL, 8, 'like'),
-- ('71caaa69-9ae5-46e7-b77c-335bf371c6a9', NULL, 9, 'dislike'),
-- ('014b3423-b8a2-4129-ba20-85efea98e119', NULL, 10, 'like');

-- Insert sample categories

INSERT OR IGNORE INTO categories (name) VALUES
('Web Development'),
('Mobile Development'),
('Data Science'),
('DevOps'),
('Cybersecurity'),
('Artificial Intelligence'),
('Software Architecture'),
('Game Development'),
('Cloud Computing'),
('Blockchain');

-- -- Insert post-category associations
-- INSERT INTO post_categories (post_id, category_id) VALUES
-- (1, 2), (1, 5),
-- (2, 3),
-- (3, 4), (3, 1),
-- (4, 5), (4, 10),
-- (5, 6), (5, 3),
-- (6, 1), (6, 7),
-- (7, 8),
-- (8, 9), (8, 4),
-- (9, 10), (9, 5),
-- (10, 1), (10, 6), (10, 2);

-- -- Insert sample replies to comments
-- INSERT INTO replycomments (user_id, parent_comment_id, content) VALUES
-- ('3a094c34-a8bd-4514-82dc-48b306c987eb', 1, 'Thanks! I found the security checklist very useful too.'),
-- ('5f38b9c6-0dec-4075-a145-6716d85ca219', 2, 'Glad you liked the guide! Any thoughts on Plotly?'),
-- ('eddca3a0-45a0-4559-a55d-63480eccaeb0', 3, 'Yes, especially tip #3 was a game-changer for me.'),
-- ('0bbdb9ae-5955-4269-aff1-dcf1a57a03fc', 4, 'Completely agree. Red teaming is underrated.'),
-- ('5fc3bda1-8832-46fc-a26f-367954b3de36', 5, 'Exactly! That visual helped a lot.'),
-- ('16dbbb7c-46fe-4036-9cec-6d978d3d02bd', 6, 'That bit about quoting attribute values was enlightening.'),
-- ('8cab6c13-6f8f-4a30-90db-d34c37e90457', 7, 'Yes! It’s amazing how lightweight they can be.'),
-- ('7426e07d-577f-48fe-b968-636dcfab6307', 8, 'Absolutely. This is where cloud-native shines.'),
-- ('71caaa69-9ae5-46e7-b77c-335bf371c6a9', 9, 'Security is often overlooked in smart contracts.'),
-- ('014b3423-b8a2-4129-ba20-85efea98e119', 10, 'Good point about quoting. CSS selectors can be picky.');

COMMIT;


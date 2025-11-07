-- Updated schema.sql for WagerVS Platform
-- Removed redundant pool columns from events table
-- Run as root: mysql -u root -p < schema.sql

-- 1. Create database
CREATE DATABASE IF NOT EXISTS predictionsdb 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE predictionsdb;

-- 2. Enable UUID support
DELIMITER $$
CREATE FUNCTION IF NOT EXISTS uuid_to_bin(uuid CHAR(36)) 
RETURNS BINARY(16)
DETERMINISTIC
BEGIN
  RETURN UNHEX(REPLACE(uuid, '-', ''));
END$$
DELIMITER ;

-- 3. Create tables

-- admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin','admin','finance','moderator') NOT NULL DEFAULT 'moderator',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  admin_id BINARY(16),
  action_type VARCHAR(100) NOT NULL,
  target_table VARCHAR(50),
  target_id BINARY(16),
  old_value JSON,
  new_value JSON,
  description TEXT,
  ip_address VARCHAR(45),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin (admin_id),
  INDEX idx_action (action_type),
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- users
CREATE TABLE IF NOT EXISTS users (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE,
  avatar_url VARCHAR(500),
  level_badge_url VARCHAR(500),
  level INT NOT NULL DEFAULT 1,
  xp BIGINT NOT NULL DEFAULT 0,
  is_whitelisted BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  events_submitted INT NOT NULL DEFAULT 0,
  events_approved INT NOT NULL DEFAULT 0,
  total_commission_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  anon_badge_id VARCHAR(100) UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login DATETIME,
  INDEX idx_email (email),
  INDEX idx_username (username)
);

-- user_auth
CREATE TABLE IF NOT EXISTS user_auth (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  user_id BINARY(16) NOT NULL,
  auth_type ENUM('google','solana','ethereum','password','telegram','anon') NOT NULL,
  auth_identifier VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_type (user_id, auth_type),
  INDEX idx_identifier (auth_identifier),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- user_wallets
CREATE TABLE IF NOT EXISTS user_wallets (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  user_id BINARY(16) NOT NULL,
  chain ENUM('solana','ethereum') NOT NULL,
  wallet_address VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_chain (user_id, chain),
  INDEX idx_address (wallet_address),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- user_points
CREATE TABLE IF NOT EXISTS user_points (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  user_id BINARY(16) NOT NULL,
  source ENUM('betting','event_creation','referral','early_bet','against_ai') NOT NULL,
  point_type ENUM('lifetime','prize_pool') NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_source_type (user_id, source, point_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ledger
CREATE TABLE IF NOT EXISTS ledger (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  user_id BINARY(16) NOT NULL,
  currency ENUM('chips','usd','usdc','sol','eth') NOT NULL,
  amount DECIMAL(18,8) NOT NULL,
  balance_before DECIMAL(18,8) NOT NULL,
  balance_after DECIMAL(18,8) NOT NULL,
  transaction_type ENUM(
    'deposit','chips_buy','event_create','event_create_ai','private_event',
    'bet_placed','bet_won','ai_insight_buy','referral_reward','prize_won','cashout'
  ) NOT NULL,
  reference_type VARCHAR(50),
  reference_id BINARY(16),
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_currency (user_id, currency),
  INDEX idx_type (transaction_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- categories
CREATE TABLE IF NOT EXISTS categories (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon_url VARCHAR(500),
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- events (REMOVED total_pool_a/b/c/d columns)
CREATE TABLE IF NOT EXISTS events (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  creator_user_id BINARY(16),
  created_by_admin_id BINARY(16),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id BINARY(16) NOT NULL,
  image_url VARCHAR(500),
  ai_prediction JSON,
  status ENUM('draft','pending','active','locked','completed','paid_out','cancelled') NOT NULL DEFAULT 'draft',
  winning_side CHAR(1),
  lock_time DATETIME,
  payout_time DATETIME,
  event_source VARCHAR(50) NOT NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ai_model_version VARCHAR(20),
  creator_commission DECIMAL(5,2) DEFAULT 1.00,
  approval_status ENUM('pending','approved','rejected'),
  approved_by_admin_id BINARY(16),
  approved_at DATETIME,
  rejection_reason TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_lock (lock_time),
  INDEX idx_category (category_id),
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (approved_by_admin_id) REFERENCES admin_users(id)
);

-- event_choices
CREATE TABLE IF NOT EXISTS event_choices (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  event_id BINARY(16) NOT NULL,
  choice_letter CHAR(1) NOT NULL CHECK (choice_letter REGEXP '^[A-H]$'),
  choice_name VARCHAR(100) NOT NULL,
  total_pool DECIMAL(18,8) NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_event_letter (event_id, choice_letter),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- event_bets (REMOVED UNIQUE constraint to allow multiple bets)
CREATE TABLE IF NOT EXISTS event_bets (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  event_id BINARY(16) NOT NULL,
  user_id BINARY(16) NOT NULL,
  choice_letter CHAR(1) NOT NULL,
  amount DECIMAL(18,8) NOT NULL,
  status ENUM('active','won','lost','refunded') NOT NULL DEFAULT 'active',
  placed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at DATETIME,
  INDEX idx_user (user_id),
  INDEX idx_event_user (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- event_payouts
CREATE TABLE IF NOT EXISTS event_payouts (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  event_id BINARY(16) NOT NULL,
  user_id BINARY(16) NOT NULL,
  payout_amount DECIMAL(18,8) NOT NULL,
  status ENUM('pending','completed','rejected') NOT NULL DEFAULT 'pending',
  processed_at DATETIME,
  admin_id BINARY(16),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id)
);

-- prize_cycles
CREATE TABLE IF NOT EXISTS prize_cycles (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  name VARCHAR(100) NOT NULL,
  prize_pool_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  status ENUM('upcoming','active','completed') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- prize_results
CREATE TABLE IF NOT EXISTS prize_results (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  cycle_id BINARY(16) NOT NULL,
  user_id BINARY(16) NOT NULL,
  tier INT NOT NULL,
  share_percent DECIMAL(5,2) NOT NULL,
  amount_usd DECIMAL(12,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cycle_id) REFERENCES prize_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- point_ledger
CREATE TABLE IF NOT EXISTS point_ledger (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  user_id BINARY(16) NOT NULL,
  points_change BIGINT NOT NULL,
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50),
  reference_id BINARY(16),
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- cash_out_requests
CREATE TABLE IF NOT EXISTS cash_out_requests (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  user_id BINARY(16) NOT NULL,
  amount DECIMAL(18,8) NOT NULL,
  currency ENUM('chips','usd','usdc','sol','eth') NOT NULL,
  method VARCHAR(50) NOT NULL,
  status ENUM('pending','completed','rejected') NOT NULL DEFAULT 'pending',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- referrals
CREATE TABLE IF NOT EXISTS referrals (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  referrer_id BINARY(16) NOT NULL,
  referred_id BINARY(16) NOT NULL,
  status ENUM('pending','completed') NOT NULL DEFAULT 'pending',
  reward_amount DECIMAL(12,2),
  reward_granted_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_referral (referrer_id, referred_id),
  FOREIGN KEY (referrer_id) REFERENCES users(id),
  FOREIGN KEY (referred_id) REFERENCES users(id)
);

-- creator_revenue
CREATE TABLE IF NOT EXISTS creator_revenue (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  user_id BINARY(16) NOT NULL,
  event_id BINARY(16) NOT NULL,
  rake_percent DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  revenue_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('pending','paid') NOT NULL DEFAULT 'pending',
  paid_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- event_submissions
CREATE TABLE IF NOT EXISTS event_submissions (
  id BINARY(16) PRIMARY KEY DEFAULT (uuid_to_bin(uuid())),
  user_id BINARY(16) NOT NULL,
  event_id BINARY(16),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id BINARY(16) NOT NULL,
  side_a_name VARCHAR(100) NOT NULL,
  side_b_name VARCHAR(100) NOT NULL,
  lock_at DATETIME,
  image_url VARCHAR(500),
  status ENUM('pending','approved','rejected','requires_changes') NOT NULL DEFAULT 'pending',
  priority INT DEFAULT 0,
  reviewed_by_admin_id BINARY(16),
  reviewed_at DATETIME,
  rejection_reason TEXT,
  admin_notes TEXT,
  ai_flag JSON,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (reviewed_by_admin_id) REFERENCES admin_users(id)
);

-- 4. Create user preduser
CREATE USER IF NOT EXISTS 'preduser'@'%' IDENTIFIED BY 'H2lloW0rld';
GRANT ALL PRIVILEGES ON predictionsdb.* TO 'preduser'@'%';
FLUSH PRIVILEGES;

-- 5. Seed initial data
SET FOREIGN_KEY_CHECKS = 0;

-- Seed categories
INSERT IGNORE INTO categories (id, name, slug, display_order) VALUES
(uuid_to_bin('c0000000-0000-0000-0000-000000000001'), 'NFL', 'nfl', 1),
(uuid_to_bin('c0000000-0000-0000-0000-000000000002'), 'NBA', 'nba', 2),
(uuid_to_bin('c0000000-0000-0000-0000-000000000003'), 'World Events', 'world-events', 3),
(uuid_to_bin('c0000000-0000-0000-0000-000000000004'), 'Culture', 'culture', 4);

-- Seed admin users (password: Admin123! for all)
INSERT IGNORE INTO admin_users (id, username, password_hash, role) VALUES
(uuid_to_bin('a0000000-0000-0000-0000-000000000001'), 'superadmin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztP3yd7V7ZTe', 'super_admin'),
(uuid_to_bin('a0000000-0000-0000-0000-000000000002'), 'moderator', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztP3yd7V7ZTe', 'moderator');

-- Seed test users
INSERT IGNORE INTO users (id, username, email, level, xp, is_whitelisted) VALUES
(uuid_to_bin('u0000000-0000-0000-0000-000000000001'), 'testuser', 'test@example.com', 3, 2500, TRUE),
(uuid_to_bin('u0000000-0000-0000-0000-000000000002'), 'creator1', 'creator@example.com', 2, 750, FALSE);

SET FOREIGN_KEY_CHECKS = 1;


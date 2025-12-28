-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
-- This table stores all notifications for users

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL COMMENT 'booking, payment, reminder, admin, success, error, warning, info',
  message VARCHAR(255) NOT NULL,
  title VARCHAR(100),
  description TEXT,
  related_id INT COMMENT 'ID of related entity (booking_id, payment_id, etc)',
  related_type VARCHAR(50) COMMENT 'Type of related entity (booking, payment, review, etc)',
  is_read TINYINT(1) DEFAULT 0 COMMENT '0 = unread, 1 = read',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL COMMENT 'Soft delete timestamp',
  
  -- Indexes for faster queries
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  INDEX idx_user_read (user_id, is_read),
  
  -- Foreign key to users table
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Real-time notification storage for users';

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- Insert sample notification if needed
-- INSERT INTO notifications (user_id, type, message, title, description)
-- VALUES (1, 'info', '✅ Welcome to LivoRent!', 'Welcome', 'Thank you for joining our platform');

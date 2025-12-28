-- ============================================
-- PROPERTIES TABLE - COMPLETE SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  title VARCHAR(255) NOT NULL COMMENT 'Property title/name',
  description LONGTEXT COMMENT 'Detailed property description',
  property_type ENUM('rent', 'sale') NOT NULL DEFAULT 'rent' COMMENT 'rent or sale',
  price DECIMAL(15, 2) NOT NULL COMMENT 'Price in USD or local currency',
  area DECIMAL(10, 2) NOT NULL COMMENT 'Area in sq ft or ropani',
  rooms INT NOT NULL DEFAULT 0 COMMENT 'Number of bedrooms',
  bathrooms INT NOT NULL DEFAULT 0 COMMENT 'Number of bathrooms',
  contact_phone VARCHAR(20) COMMENT 'Contact phone number',
  
  -- Location Details
  location_name VARCHAR(255) COMMENT 'Location description/address',
  latitude DECIMAL(10, 8) NOT NULL COMMENT 'GPS latitude',
  longitude DECIMAL(11, 8) NOT NULL COMMENT 'GPS longitude',
  
  -- Property Images (JSON array of URLs)
  images JSON COMMENT 'Array of image URLs',
  featured_image VARCHAR(500) COMMENT 'Primary featured image URL',
  
  -- Status Management
  status TINYINT(1) DEFAULT 0 COMMENT '0=draft/inactive, 1=published/active',
  is_sold TINYINT(1) DEFAULT 0 COMMENT '0=available, 1=sold/rented',
  
  -- Soft Delete
  deleted_at TIMESTAMP NULL COMMENT 'Soft delete timestamp',
  deleted_by INT COMMENT 'User ID who deleted',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_owner_id (owner_id),
  INDEX idx_status (status),
  INDEX idx_property_type (property_type),
  INDEX idx_price (price),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted_at (deleted_at),
  INDEX idx_location (latitude, longitude),
  INDEX idx_active (status, deleted_at),
  
  -- Foreign Keys
  CONSTRAINT fk_properties_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_properties_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Complete property listings with location, images, and soft delete';

-- ============================================
-- PROPERTY AMENITIES TABLE (Optional)
-- ============================================

CREATE TABLE IF NOT EXISTS property_amenities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  amenity VARCHAR(100) COMMENT 'e.g., WiFi, Parking, Garden, Kitchen, etc',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_amenities_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PROPERTY VIEWS/CLICKS TRACKING (Optional)
-- ============================================

CREATE TABLE IF NOT EXISTS property_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  user_id INT,
  view_count INT DEFAULT 1,
  last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_views_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SAMPLE DATA (For Testing)
-- ============================================

-- Uncomment to insert sample properties
-- INSERT INTO properties (
--   owner_id, title, description, property_type, price, area, rooms, bathrooms,
--   contact_phone, location_name, latitude, longitude, featured_image, status
-- ) VALUES (
--   1, 'Beautiful House in Kathmandu', 'A spacious 2-bedroom house in the heart of Kathmandu',
--   'rent', 50000.00, 2000.00, 2, 1, '9841234567', 'Thamel, Kathmandu',
--   27.7172, 85.3240, 'https://via.placeholder.com/500x300', 1
-- );

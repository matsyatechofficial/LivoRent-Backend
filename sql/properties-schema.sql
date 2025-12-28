-- ============================================
-- COMPLETE REAL ESTATE DATABASE SCHEMA
-- ============================================

-- ============================================
-- 1. PROPERTIES TABLE (Main Table)
-- ============================================
CREATE TABLE IF NOT EXISTS properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Basic Information
  title VARCHAR(255) NOT NULL COMMENT 'Property title/name',
  description LONGTEXT COMMENT 'Detailed property description',
  property_type ENUM('sale', 'rent') NOT NULL DEFAULT 'rent' COMMENT 'Type: sale or rent',
  
  -- Pricing
  price DECIMAL(15, 2) NOT NULL COMMENT 'Price (sale: total, rent: monthly)',
  currency VARCHAR(10) DEFAULT 'NPR' COMMENT 'Currency code',
  
  -- Physical Details
  total_area DECIMAL(10, 2) NOT NULL COMMENT 'Total area in sq ft or ropani',
  area_unit ENUM('sqft', 'ropani') DEFAULT 'sqft' COMMENT 'Unit of area measurement',
  number_of_rooms INT NOT NULL COMMENT 'Number of bedrooms',
  number_of_bathrooms INT NOT NULL COMMENT 'Number of bathrooms',
  
  -- Location (Text + Coordinates)
  location_description VARCHAR(255) COMMENT 'Location text description',
  latitude DECIMAL(10, 8) NOT NULL COMMENT 'Latitude coordinate',
  longitude DECIMAL(11, 8) NOT NULL COMMENT 'Longitude coordinate',
  
  -- Contact Information
  contact_phone VARCHAR(20) NOT NULL COMMENT 'Contact phone number',
  contact_email VARCHAR(255) COMMENT 'Contact email address',
  
  -- Status & Management
  status TINYINT(1) DEFAULT 0 COMMENT '0=draft/inactive, 1=active/published',
  is_featured TINYINT(1) DEFAULT 0 COMMENT '0=normal, 1=featured property',
  
  -- Admin Management
  admin_id INT NOT NULL COMMENT 'Admin who created this property',
  created_by INT COMMENT 'User ID who created',
  updated_by INT COMMENT 'User ID who last updated',
  deleted_by INT COMMENT 'User ID who deleted (soft delete)',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL COMMENT 'Soft delete timestamp',
  
  -- Indexes for Performance
  INDEX idx_status (status),
  INDEX idx_property_type (property_type),
  INDEX idx_price (price),
  INDEX idx_location (latitude, longitude),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted_at (deleted_at),
  INDEX idx_admin_id (admin_id),
  FULLTEXT INDEX ft_search (title, description),
  
  -- Foreign Key
  CONSTRAINT fk_property_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Properties table for real estate listings';

-- ============================================
-- 2. PROPERTY IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS property_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL COMMENT 'Cloudinary image URL',
  image_public_id VARCHAR(255) COMMENT 'Cloudinary public ID for deletion',
  is_primary TINYINT(1) DEFAULT 0 COMMENT '0=secondary, 1=primary/thumbnail',
  display_order INT DEFAULT 0 COMMENT 'Order of display',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_property_id (property_id),
  INDEX idx_is_primary (is_primary),
  
  CONSTRAINT fk_image_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Property images table with Cloudinary integration';

-- ============================================
-- 3. PROPERTY AMENITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS property_amenities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  amenity_name VARCHAR(100) NOT NULL COMMENT 'e.g., WiFi, Parking, Garden',
  
  UNIQUE KEY unique_property_amenity (property_id, amenity_name),
  CONSTRAINT fk_amenity_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Property amenities (WiFi, Parking, etc)';

-- ============================================
-- 4. PROPERTY REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS property_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT NOT NULL COMMENT '1-5 stars',
  comment TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_property_id (property_id),
  INDEX idx_user_id (user_id),
  INDEX idx_rating (rating),
  
  CONSTRAINT fk_review_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Property reviews and ratings';

-- ============================================
-- 5. PROPERTY INQUIRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS property_inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  user_id INT COMMENT 'NULL if anonymous inquiry',
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  message TEXT,
  status ENUM('new', 'contacted', 'resolved') DEFAULT 'new',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_property_id (property_id),
  INDEX idx_status (status),
  
  CONSTRAINT fk_inquiry_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_inquiry_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Property inquiries and messages';

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Active Properties View
CREATE OR REPLACE VIEW v_active_properties AS
SELECT 
  p.*,
  COUNT(DISTINCT pi.id) as image_count,
  AVG(pr.rating) as avg_rating,
  COUNT(DISTINCT pr.id) as review_count
FROM properties p
LEFT JOIN property_images pi ON p.id = pi.property_id
LEFT JOIN property_reviews pr ON p.id = pr.property_id
WHERE p.status = 1 AND p.deleted_at IS NULL
GROUP BY p.id;

-- Admin Dashboard Stats View
CREATE OR REPLACE VIEW v_admin_stats AS
SELECT 
  COUNT(DISTINCT CASE WHEN status = 1 AND deleted_at IS NULL THEN id END) as active_properties,
  COUNT(DISTINCT CASE WHEN status = 0 AND deleted_at IS NULL THEN id END) as draft_properties,
  COUNT(DISTINCT CASE WHEN deleted_at IS NOT NULL THEN id END) as deleted_properties,
  COUNT(DISTINCT CASE WHEN property_type = 'sale' AND deleted_at IS NULL THEN id END) as for_sale,
  COUNT(DISTINCT CASE WHEN property_type = 'rent' AND deleted_at IS NULL THEN id END) as for_rent,
  AVG(CASE WHEN deleted_at IS NULL THEN price END) as avg_price,
  SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) as total_active
FROM properties;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Note: Uncomment to insert sample data
/*
INSERT INTO properties 
(title, description, property_type, price, total_area, number_of_rooms, number_of_bathrooms, 
 location_description, latitude, longitude, contact_phone, status, admin_id) 
VALUES 
('Modern Apartment in Kathmandu', 'Beautiful 3-bedroom apartment with great views', 'rent', 
 50000, 1500, 3, 2, 'Thamel, Kathmandu', 27.7172, 85.3240, '9841234567', 1, 1),
('House for Sale in Bhaktapur', 'Spacious house with garden and parking', 'sale', 
 5000000, 2000, 4, 3, 'Bhaktapur City', 27.6721, 85.4292, '9851234567', 1, 1);
*/

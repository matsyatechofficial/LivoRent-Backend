-- ========================================
-- Users Table
-- ========================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('tenant','owner','admin') DEFAULT 'tenant',
    phone VARCHAR(20),
    profile_image VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    refresh_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

--password Admin@admin123
INSERT INTO users 
(id, name, email, password, role, phone, profile_image, is_active, is_verified, refresh_token, created_at, updated_at)
VALUES
(
  1,
  'Basant',
  'basant2003@gmail.com',
  '$2a$10$AiaOiTTCDD6SLOujFdyKCu60p8cSxv4d3hqwdpF', -- bcrypt hash of basant123
  'admin',
  '9800000000',
  NULL,
  1,
  1,
  NULL,
  NOW(),
  NOW()
);
-- ========================================
-- Properties Table
-- ========================================
CREATE TABLE properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    property_type ENUM('room','flat','house','apartment') DEFAULT 'room',
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    price DECIMAL(10,2),
    bedrooms INT DEFAULT 0,
    bathrooms INT DEFAULT 0,
    area_sqft DECIMAL(10,2),
    furnishing ENUM('furnished','semi-furnished','unfurnished') DEFAULT 'unfurnished',
    amenities JSON,
    nearby_places JSON,
    primary_image VARCHAR(255),
    images JSON,
    video_url VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    instant_booking BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ========================================
-- Bookings Table
-- ========================================
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    tenant_id INT NOT NULL,
    owner_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    message TEXT,
    status ENUM('pending','accepted','completed','rejected','cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ========================================
-- Availability Calendar Table
-- ========================================
CREATE TABLE availability_calendar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    date DATE NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    booking_id INT,
    UNIQUE(property_id, date),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- ========================================
-- Wishlist Table
-- ========================================
CREATE TABLE wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    property_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, property_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- ========================================
-- Reviews Table
-- ========================================
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    user_id INT NOT NULL,
    booking_id INT,
    rating DECIMAL(3,2) NOT NULL,
    comment TEXT,
    cleanliness DECIMAL(3,2),
    communication DECIMAL(3,2),
    value_for_money DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

// backend/models/bookingModel.js
const db = require('../config/db');

const Booking = {
  // Create booking
  create: async (bookingData) => {
    const [result] = await db.query(
      `INSERT INTO bookings (
        property_id, tenant_id, owner_id, start_date, end_date, 
        total_price, message
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingData.property_id,
        bookingData.tenant_id,
        bookingData.owner_id,
        bookingData.start_date,
        bookingData.end_date,
        bookingData.total_price,
        bookingData.message
      ]
    );
    return result.insertId;
  },

  findById: async (id) => {
  const [rows] = await db.query(
    `SELECT b.*, 
      p.title as property_title, p.address as property_address,
      p.primary_image, p.price as property_price,
      t.name as tenant_name, t.email as tenant_email, t.phone as tenant_phone,
      o.name as owner_name, o.email as owner_email, o.phone as owner_phone
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    JOIN users t ON b.tenant_id = t.id
    JOIN users o ON b.owner_id = o.id
    WHERE b.id = ?`,
    [id]
  );
  return rows[0];
},

  // Get bookings by tenant
  findByTenant: async (tenantId) => {
    const [rows] = await db.query(
      `SELECT b.*, 
        p.title as property_title, p.address, p.primary_image,
        o.name as owner_name, o.phone as owner_phone
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN users o ON b.owner_id = o.id
      WHERE b.tenant_id = ?
      ORDER BY b.created_at DESC`,
      [tenantId]
    );
    return rows;
  },

  // Get bookings by owner
  findByOwner: async (ownerId) => {
    const [rows] = await db.query(
      `SELECT b.*, 
        p.title as property_title, p.address, p.primary_image,
        t.name as tenant_name, t.email as tenant_email, t.phone as tenant_phone
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN users t ON b.tenant_id = t.id
      WHERE b.owner_id = ?
      ORDER BY b.created_at DESC`,
      [ownerId]
    );
    return rows;
  },

  // Get bookings by property
  findByProperty: async (propertyId) => {
    const [rows] = await db.query(
      `SELECT b.*, 
        t.name as tenant_name, t.email as tenant_email
      FROM bookings b
      JOIN users t ON b.tenant_id = t.id
      WHERE b.property_id = ?
      ORDER BY b.start_date ASC`,
      [propertyId]
    );
    return rows;
  },

  // Update booking status
  updateStatus: async (id, status, adminNotes = null) => {
    await db.query(
      'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    
    // If accepted, block calendar dates
    if (status === 'accepted') {
      const booking = await Booking.findById(id);
      await Booking.blockCalendarDates(booking.property_id, booking.start_date, booking.end_date, id);
    }
    
    return true;
  },

  // Check availability
  checkAvailability: async (propertyId, startDate, endDate, excludeBookingId = null) => {
    let query = `
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE property_id = ? 
      AND status = 'accepted'
      AND NOT (end_date <= ? OR start_date >= ?)
    `;
    
    const params = [propertyId, startDate, endDate];
    
    if (excludeBookingId) {
      query += ' AND id != ?';
      params.push(excludeBookingId);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0].count === 0;
  },

  // Block calendar dates
  blockCalendarDates: async (propertyId, startDate, endDate, bookingId) => {
    const dates = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
      dates.push([
        propertyId,
        currentDate.toISOString().split('T')[0],
        false,
        bookingId
      ]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (dates.length > 0) {
      await db.query(
        `INSERT INTO availability_calendar 
        (property_id, date, is_available, booking_id) 
        VALUES ? 
        ON DUPLICATE KEY UPDATE 
        is_available = VALUES(is_available), 
        booking_id = VALUES(booking_id)`,
        [dates]
      );
    }
  },

  // Get calendar availability
  getCalendar: async (propertyId, startDate, endDate) => {
    const [rows] = await db.query(
      `SELECT date, is_available, booking_id 
      FROM availability_calendar 
      WHERE property_id = ? 
      AND date BETWEEN ? AND ?
      ORDER BY date ASC`,
      [propertyId, startDate, endDate]
    );
    return rows;
  }
};

// backend/models/wishlistModel.js
const Wishlist = {
  // Add to wishlist
  add: async (userId, propertyId) => {
    try {
      await db.query(
        'INSERT INTO wishlist (user_id, property_id) VALUES (?, ?)',
        [userId, propertyId]
      );
      return true;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Property already in wishlist');
      }
      throw error;
    }
  },

  // Remove from wishlist
  remove: async (userId, propertyId) => {
    await db.query(
      'DELETE FROM wishlist WHERE user_id = ? AND property_id = ?',
      [userId, propertyId]
    );
    return true;
  },

  // Get user wishlist
  getUserWishlist: async (userId) => {
    const [rows] = await db.query(
      `SELECT p.*, w.created_at as added_at,
        u.name as owner_name,
        COUNT(DISTINCT r.id) as total_reviews,
        AVG(r.rating) as avg_rating,
        TRUE as inWishlist
      FROM wishlist w
      JOIN properties p ON w.property_id = p.id
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN reviews r ON p.id = r.property_id
      WHERE w.user_id = ?
      GROUP BY p.id
      ORDER BY w.created_at DESC`,
      [userId]
    );
    
    rows.forEach(row => {
      row.amenities = JSON.parse(row.amenities || '[]');
      row.images = JSON.parse(row.images || '[]');
    });
    
    return rows;
  },

  // Check if property in wishlist
  isInWishlist: async (userId, propertyId) => {
    const [rows] = await db.query(
      'SELECT id FROM wishlist WHERE user_id = ? AND property_id = ?',
      [userId, propertyId]
    );
    return rows.length > 0;
  }
};

module.exports = { Booking, Wishlist };
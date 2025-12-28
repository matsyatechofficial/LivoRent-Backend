// backend/models/paymentModel.js
const db = require('../config/db');
const QRCode = require('qrcode');
const crypto = require('crypto');

const Payment = {
  // Create payment record
  create: async (paymentData) => {
    const paymentId = `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const [result] = await db.query(
      `INSERT INTO payments (
        payment_id, booking_id, amount, payment_method,
        payment_status, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        paymentData.booking_id,
        paymentData.amount,
        paymentData.payment_method || 'esewa',
        'pending',
        expiryTime
      ]
    );
    
    return { id: result.insertId, payment_id: paymentId, expires_at: expiryTime };
  },

  // Generate QR code
  generateQR: async (paymentData) => {
    const qrData = {
      payment_id: paymentData.payment_id,
      booking_id: paymentData.booking_id,
      amount: paymentData.amount,
      platform_account: process.env.PLATFORM_ACCOUNT || '9841234567',
      merchant_name: 'RentEase Platform',
      expires_at: paymentData.expires_at
    };
    
    const qrString = JSON.stringify(qrData);
    const qrCodeUrl = await QRCode.toDataURL(qrString);
    
    // Save QR in database
    await db.query(
      'UPDATE payments SET qr_code = ? WHERE payment_id = ?',
      [qrCodeUrl, paymentData.payment_id]
    );
    
    return qrCodeUrl;
  },

  // Find by booking ID
  findByBooking: async (bookingId) => {
    const [rows] = await db.query(
      `SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1`,
      [bookingId]
    );
    return rows[0];
  },

  // Find by payment ID
  findByPaymentId: async (paymentId) => {
    const [rows] = await db.query(
      'SELECT * FROM payments WHERE payment_id = ?',
      [paymentId]
    );
    return rows[0];
  },

  // Update payment status
  updateStatus: async (paymentId, status, transactionId = null) => {
    const updateData = {
      payment_status: status,
      updated_at: new Date()
    };
    
    if (transactionId) {
      updateData.transaction_id = transactionId;
    }
    
    if (status === 'verified') {
      updateData.verified_at = new Date();
    }
    
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updateData), paymentId];
    
    await db.query(
      `UPDATE payments SET ${fields} WHERE payment_id = ?`,
      values
    );
    
    // If verified, update booking payment status
    if (status === 'verified') {
      const payment = await Payment.findByPaymentId(paymentId);
      await db.query(
        'UPDATE bookings SET payment_status = ? WHERE id = ?',
        ['paid', payment.booking_id]
      );
    }
    
    return true;
  },

  // Get all payments (admin)
  getAllPayments: async (filters = {}) => {
    let query = `
      SELECT p.*, 
        b.property_id, b.tenant_id, b.owner_id,
        pr.title as property_title,
        t.name as tenant_name, t.email as tenant_email,
        o.name as owner_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN properties pr ON b.property_id = pr.id
      JOIN users t ON b.tenant_id = t.id
      JOIN users o ON b.owner_id = o.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.status) {
      query += ' AND p.payment_status = ?';
      params.push(filters.status);
    }
    
    if (filters.payment_method) {
      query += ' AND p.payment_method = ?';
      params.push(filters.payment_method);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    const [rows] = await db.query(query, params);
    return rows;
  },

  // Check expiry
  checkExpiry: async (paymentId) => {
    const payment = await Payment.findByPaymentId(paymentId);
    
    if (!payment) return false;
    
    const now = new Date();
    const expiryTime = new Date(payment.expires_at);
    
    if (now > expiryTime && payment.payment_status === 'pending') {
      await Payment.updateStatus(paymentId, 'expired');
      return false;
    }
    
    return true;
  }
};
module.exports = Payment;
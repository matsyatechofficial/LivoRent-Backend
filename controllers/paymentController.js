// backend/controllers/paymentController.js

const Payment = require('../models/paymentModel');
const { Booking } = require('../models/propertyModel');

const paymentController = {
  // Create payment & generate QR
  createPayment: async (req, res) => {
    try {
      const { booking_id, payment_method } = req.body;
      
      // Validate booking
      const booking = await Booking.findById(booking_id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Check if user owns this booking
      if (booking.tenant_id !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      // Check if already paid
      if (booking.payment_status === 'paid') {
        return res.status(400).json({ message: 'Booking already paid' });
      }
      
      // Create payment
      const payment = await Payment.create({
        booking_id,
        amount: booking.total_amount,
        payment_method: payment_method || 'esewa'
      });
      
      // Generate QR code
      const qrCode = await Payment.generateQR({
        payment_id: payment.payment_id,
        booking_id,
        amount: booking.total_amount,
        expires_at: payment.expires_at
      });
      
      res.json({
        success: true,
        payment: {
          payment_id: payment.payment_id,
          amount: booking.total_amount,
          qr_code: qrCode,
          expires_at: payment.expires_at,
          platform_account: process.env.PLATFORM_ACCOUNT || '9841234567'
        }
      });
    } catch (error) {
      console.error('Payment creation error:', error);
      res.status(500).json({ message: 'Failed to create payment' });
    }
  },

  // Get payment by booking ID
  getByBooking: async (req, res) => {
    try {
      const { bookingId } = req.params;
      
      const payment = await Payment.findByBooking(bookingId);
      
      if (!payment) {
        return res.json({ success: true, payment: null });
      }
      
      res.json({ success: true, payment });
    } catch (error) {
      console.error('Get payment error:', error);
      res.status(500).json({ message: 'Failed to get payment' });
    }
  },

  // Get payment status
  getPaymentStatus: async (req, res) => {
    try {
      const { payment_id } = req.params;
      
      const payment = await Payment.findByPaymentId(payment_id);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      
      // Check expiry
      await Payment.checkExpiry(payment_id);
      
      // Get updated payment
      const updatedPayment = await Payment.findByPaymentId(payment_id);
      
      res.json({
        success: true,
        payment: {
          payment_id: updatedPayment.payment_id,
          status: updatedPayment.payment_status,
          amount: updatedPayment.amount,
          expires_at: updatedPayment.expires_at,
          verified_at: updatedPayment.verified_at
        }
      });
    } catch (error) {
      console.error('Payment status error:', error);
      res.status(500).json({ message: 'Failed to get payment status' });
    }
  },

  // Submit payment proof
  submitProof: async (req, res) => {
    try {
      const { payment_id, transaction_id, screenshot } = req.body;
      const db = require('../config/db');
      
      const payment = await Payment.findByPaymentId(payment_id);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      
      // Check expiry
      const isValid = await Payment.checkExpiry(payment_id);
      if (!isValid) {
        return res.status(400).json({ message: 'Payment expired' });
      }
      
      // Update with proof
      await db.query(
        'UPDATE payments SET transaction_id = ?, payment_proof = ?, payment_status = ? WHERE payment_id = ?',
        [transaction_id, screenshot, 'pending_verification', payment_id]
      );
      
      res.json({
        success: true,
        message: 'Payment proof submitted. Awaiting admin verification.'
      });
    } catch (error) {
      console.error('Submit proof error:', error);
      res.status(500).json({ message: 'Failed to submit proof' });
    }
  },

  // Get all payments (admin)
  getAllPayments: async (req, res) => {
    try {
      const { status, payment_method } = req.query;
      
      const payments = await Payment.getAllPayments({
        status,
        payment_method
      });
      
      res.json({
        success: true,
        payments
      });
    } catch (error) {
      console.error('Get payments error:', error);
      res.status(500).json({ message: 'Failed to get payments' });
    }
  },

  // Verify payment (admin)
  verifyPayment: async (req, res) => {
    try {
      const { payment_id } = req.params;
      const { status, admin_notes } = req.body;
      const db = require('../config/db');
      
      await Payment.updateStatus(payment_id, status);
      
      if (admin_notes) {
        await db.query(
          'UPDATE payments SET admin_notes = ? WHERE payment_id = ?',
          [admin_notes, payment_id]
        );
      }
      
      res.json({
        success: true,
        message: `Payment ${status} successfully`
      });
    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({ message: 'Failed to verify payment' });
    }
  }
};

module.exports = { paymentController };
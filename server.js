// backend/server.js
// UPDATE YOUR EXISTING FILE - ADD THE HIGHLIGHTED LINES

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const userRoutes = require('./routes/userRoutes');
const mapsRoutes = require('./routes/mapsRoutes');
const paymentRouter = require('./routes/paymentRoutes');
const routingRouter = require('./routes/routingRoutes'); // ← ADD THIS LINE

const { PORT } = require('./config/env');

const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/users', userRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/api/payments', paymentRouter);
app.use('/api/routing', routingRouter); // ← ADD THIS LINE

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      properties: '/api/properties',
      bookings: '/api/bookings',
      wishlist: '/api/wishlist',
      users: '/api/users',
      maps: '/api/maps',
      payments: '/api/payments',
      routing: '/api/routing' // ← ADD THIS LINE
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   🏠 Room Rental API Server Running      ║
╠══════════════════════════════════════════╣
║   Port: ${PORT}                             ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   Health Check: http://localhost:${PORT}/api/health
╚══════════════════════════════════════════╝

📋 Available Endpoints:
   • Auth:       /api/auth
   • Properties: /api/properties
   • Bookings:   /api/bookings
   • Wishlist:   /api/wishlist
   • Users:      /api/users
   • Maps:       /api/maps
   • Payments:   /api/payments
   • Routing:    /api/routing  ← NEW
  `);
});
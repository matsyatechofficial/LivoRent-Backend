// ========================================
// routes/mapsRoutes.js
// ========================================
const express = require('express');
const router = express.Router();
const geocodingService = require('../services/geocodingService');

/**
 * GET /api/maps/geocode
 * Convert address to coordinates
 * Query params: address
 */
router.get('/geocode', async (req, res) => {
  const { address } = req.query;
  
  console.log('\n' + '='.repeat(60));
  console.log('🌍 GEOCODING REQUEST');
  console.log('='.repeat(60));
  console.log('📍 Address:', address);
  console.log('🕐 Timestamp:', new Date().toISOString());
  
  try {
    if (!address || address.trim().length === 0) {
      console.warn('⚠️ Empty address provided');
      return res.status(400).json({ 
        success: false,
        message: 'Address is required' 
      });
    }

    console.log('⏳ Processing geocoding request...');
    const result = await geocodingService.geocodeAddress(address);
    
    console.log('✅ Geocoding successful!');
    console.log('📊 Result:', {
      provider: result.provider,
      coordinates: { lat: result.lat, lng: result.lng },
      city: result.city || 'Not available'
    });
    console.log('='.repeat(60) + '\n');

    res.json({
      success: true,
      location: {
        lat: result.lat,
        lng: result.lng
      },
      formatted_address: result.formatted_address,
      postal_code: result.postal_code,
      city: result.city,
      state: result.state,
      country: result.country,
      provider: result.provider
    });
  } catch (error) {
    console.error('❌ Geocoding failed!');
    console.error('💥 Error:', error.message);
    console.log('='.repeat(60) + '\n');
    
    res.status(400).json({
      success: false,
      message: 'Failed to geocode address',
      error: error.message
    });
  }
});

/**
 * POST /api/maps/reverse-geocode
 * Convert coordinates to address
 * Body: { latitude, longitude }
 */
router.post('/reverse-geocode', async (req, res) => {
  const { latitude, longitude } = req.body;
  
  console.log('\n' + '='.repeat(60));
  console.log('🌍 REVERSE GEOCODING REQUEST');
  console.log('='.repeat(60));
  console.log('📍 Coordinates:', { latitude, longitude });
  
  try {
    if (!latitude || !longitude) {
      console.warn('⚠️ Missing coordinates');
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    console.log('⏳ Processing reverse geocoding...');
    const address = await geocodingService.reverseGeocode(
      parseFloat(latitude),
      parseFloat(longitude)
    );
    
    console.log('✅ Reverse geocoding successful!');
    console.log('📊 Result:', address);
    console.log('='.repeat(60) + '\n');
    
    res.json({
      success: true,
      ...address
    });
  } catch (error) {
    console.error('❌ Reverse geocoding failed!');
    console.error('💥 Error:', error.message);
    console.log('='.repeat(60) + '\n');
    
    res.status(400).json({
      success: false,
      message: 'Failed to reverse geocode',
      error: error.message
    });
  }
});

/**
 * GET /api/maps/distance
 * Calculate distance between two coordinates
 */
router.get('/distance', (req, res) => {
  const { lat1, lon1, lat2, lon2 } = req.query;
  
  console.log('\n' + '='.repeat(60));
  console.log('🌍 DISTANCE CALCULATION REQUEST');
  console.log('='.repeat(60));
  console.log('📍 From:', { lat: lat1, lon: lon1 });
  console.log('📍 To:', { lat: lat2, lon: lon2 });
  
  try {
    if (!lat1 || !lon1 || !lat2 || !lon2) {
      console.warn('⚠️ Missing coordinates');
      return res.status(400).json({
        success: false,
        message: 'All coordinates are required (lat1, lon1, lat2, lon2)'
      });
    }

    const distance = geocodingService.calculateDistance(
      parseFloat(lat1),
      parseFloat(lon1),
      parseFloat(lat2),
      parseFloat(lon2)
    );
    
    console.log('✅ Distance calculated successfully!');
    console.log('📊 Distance:', distance.toFixed(2), 'km');
    console.log('='.repeat(60) + '\n');
    
    res.json({
      success: true,
      distance_km: parseFloat(distance.toFixed(2)),
      distance_miles: parseFloat((distance * 0.621371).toFixed(2))
    });
  } catch (error) {
    console.error('❌ Distance calculation failed!');
    console.error('💥 Error:', error.message);
    console.log('='.repeat(60) + '\n');
    
    res.status(400).json({
      success: false,
      message: 'Failed to calculate distance',
      error: error.message
    });
  }
});

/**
 * GET /api/maps/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Maps API is working',
    timestamp: new Date().toISOString(),
    service: 'Nominatim Geocoding',
    country: 'Nepal'
  });
});

/**
 * GET /api/maps/test
 * Test endpoint with sample addresses
 */
router.get('/test', async (req, res) => {
  const testAddresses = [
    'Butwal, Nepal',
    'Kathmandu, Nepal',
    'Pokhara, Nepal',
    'Biratnagar, Nepal'
  ];
  
  const results = [];
  
  for (const address of testAddresses) {
    try {
      const result = await geocodingService.geocodeAddress(address);
      results.push({
        address,
        success: true,
        coordinates: { lat: result.lat, lng: result.lng },
        city: result.city
      });
    } catch (error) {
      results.push({
        address,
        success: false,
        error: error.message
      });
    }
  }
  
  res.json({
    success: true,
    test_results: results,
    message: 'Test completed for Nepali cities'
  });
});

module.exports = router;
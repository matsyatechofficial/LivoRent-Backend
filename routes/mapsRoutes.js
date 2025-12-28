// backend/routes/mapsRoutes.js
// Updated to use OpenStreetMap Nominatim instead of Google Maps

const express = require('express');
const router = express.Router();
const geocodingService = require('../services/geocodingService');

/**
 * GET /api/maps/geocode
 * Forward geocoding: address → coordinates
 */
router.get('/geocode', async (req, res) => {
  const { address } = req.query;

  console.log('\n' + '='.repeat(60));
  console.log('🗺️ GEOCODE REQUEST (OpenStreetMap Nominatim)');
  console.log('='.repeat(60));
  console.log('Address:', address);

  try {
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address parameter is required'
      });
    }

    const result = await geocodingService.geocodeAddress(address);

    console.log('✅ Geocoding successful');
    console.log('Location:', result.lat, result.lng);
    console.log('='.repeat(60) + '\n');

    res.json({
      success: true,
      location: {
        lat: result.lat,
        lng: result.lng
      },
      formatted_address: result.formatted_address,
      city: result.city,
      state: result.state,
      country: result.country,
      provider: 'OpenStreetMap Nominatim'
    });
  } catch (error) {
    console.error('❌ Geocoding failed:', error.message);
    console.log('='.repeat(60) + '\n');

    res.status(400).json({
      success: false,
      message: error.message || 'Geocoding failed',
      provider: 'OpenStreetMap Nominatim'
    });
  }
});

/**
 * GET /api/maps/reverse-geocode
 * Reverse geocoding: coordinates → address
 */
router.get('/reverse-geocode', async (req, res) => {
  const { lat, lng } = req.query;

  console.log('\n' + '='.repeat(60));
  console.log('🗺️ REVERSE GEOCODE REQUEST');
  console.log('='.repeat(60));
  console.log('Coordinates:', lat, lng);

  try {
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng parameters are required'
      });
    }

    const coords = geocodingService.validateCoordinates(lat, lng);
    const result = await geocodingService.reverseGeocode(coords.lat, coords.lng);

    console.log('✅ Reverse geocoding successful');
    console.log('Address:', result.formatted_address);
    console.log('='.repeat(60) + '\n');

    res.json({
      success: true,
      address: result.formatted_address,
      street: result.street,
      city: result.city,
      state: result.state,
      country: result.country,
      postal_code: result.postal_code,
      provider: 'OpenStreetMap Nominatim'
    });
  } catch (error) {
    console.error('❌ Reverse geocoding failed:', error.message);
    console.log('='.repeat(60) + '\n');

    res.status(400).json({
      success: false,
      message: error.message || 'Reverse geocoding failed',
      provider: 'OpenStreetMap Nominatim'
    });
  }
});

/**
 * GET /api/maps/health
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Maps API is working',
    provider: 'OpenStreetMap Nominatim',
    features: {
      geocoding: 'Convert address to coordinates',
      reverse_geocoding: 'Convert coordinates to address',
      no_api_key: 'Free service, no API key required'
    }
  });
});

module.exports = router;
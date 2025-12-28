// backend/routes/routingRoutes.js
// COMPLETE FILE - CREATE THIS NEW FILE

const express = require('express');
const router = express.Router();
const routingService = require('../services/routingService');

/**
 * POST /api/routing/route
 * Get route between two points
 * Body: { startLat, startLng, endLat, endLng, profile }
 */
router.post('/route', async (req, res) => {
  const { startLat, startLng, endLat, endLng, profile } = req.body;

  console.log('\n' + '='.repeat(60));
  console.log('🗺️ ROUTING REQUEST');
  console.log('='.repeat(60));
  console.log('From:', startLat, startLng);
  console.log('To:', endLat, endLng);
  console.log('Mode:', profile || 'driving');

  try {
    // Validate input
    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({
        success: false,
        message: 'All coordinates required: startLat, startLng, endLat, endLng'
      });
    }

    // Validate coordinates
    const start = routingService.validateCoordinates(startLat, startLng);
    const end = routingService.validateCoordinates(endLat, endLng);

    // Get route
    const route = await routingService.getRoute(
      start.lat,
      start.lng,
      end.lat,
      end.lng,
      profile || 'driving'
    );

    console.log('✅ Route calculated successfully');
    console.log('Distance:', route.distance_km, 'km');
    console.log('Duration:', route.duration_minutes, 'min');
    console.log('='.repeat(60) + '\n');

    res.json({
      success: true,
      route
    });
  } catch (error) {
    console.error('❌ Routing failed:', error.message);
    console.log('='.repeat(60) + '\n');

    res.status(400).json({
      success: false,
      message: 'Failed to calculate route',
      error: error.message
    });
  }
});

/**
 * POST /api/routing/multi-waypoint
 * Get route with multiple waypoints
 * Body: { waypoints: [{lat, lng}, ...], profile }
 */
router.post('/multi-waypoint', async (req, res) => {
  const { waypoints, profile } = req.body;

  console.log('\n' + '='.repeat(60));
  console.log('🗺️ MULTI-WAYPOINT ROUTING REQUEST');
  console.log('='.repeat(60));
  console.log('Waypoints:', waypoints?.length || 0);

  try {
    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 waypoints required'
      });
    }

    // Validate all waypoints
    const validatedWaypoints = waypoints.map((wp, index) => {
      if (!wp.lat || !wp.lng) {
        throw new Error(`Waypoint ${index + 1} missing lat or lng`);
      }
      return routingService.validateCoordinates(wp.lat, wp.lng);
    });

    const route = await routingService.getRouteWithWaypoints(
      validatedWaypoints,
      profile || 'driving'
    );

    console.log('✅ Multi-waypoint route calculated');
    console.log('='.repeat(60) + '\n');

    res.json({
      success: true,
      route
    });
  } catch (error) {
    console.error('❌ Multi-waypoint routing failed:', error.message);
    console.log('='.repeat(60) + '\n');

    res.status(400).json({
      success: false,
      message: 'Failed to calculate multi-point route',
      error: error.message
    });
  }
});

/**
 * POST /api/routing/matrix
 * Calculate travel time matrix
 * Body: { sources: [{lat, lng}], destinations: [{lat, lng}], profile }
 */
router.post('/matrix', async (req, res) => {
  const { sources, destinations, profile } = req.body;

  console.log('\n' + '='.repeat(60));
  console.log('🗺️ TRAVEL TIME MATRIX REQUEST');
  console.log('='.repeat(60));
  console.log('Sources:', sources?.length || 0);
  console.log('Destinations:', destinations?.length || 0);

  try {
    if (!sources || !destinations) {
      return res.status(400).json({
        success: false,
        message: 'Sources and destinations required'
      });
    }

    if (!Array.isArray(sources) || !Array.isArray(destinations)) {
      return res.status(400).json({
        success: false,
        message: 'Sources and destinations must be arrays'
      });
    }

    // Validate all points
    const validatedSources = sources.map(s => 
      routingService.validateCoordinates(s.lat, s.lng)
    );
    const validatedDestinations = destinations.map(d => 
      routingService.validateCoordinates(d.lat, d.lng)
    );

    const matrix = await routingService.getTravelMatrix(
      validatedSources,
      validatedDestinations,
      profile || 'driving'
    );

    console.log('✅ Travel time matrix calculated');
    console.log('='.repeat(60) + '\n');

    res.json({
      success: true,
      matrix
    });
  } catch (error) {
    console.error('❌ Matrix calculation failed:', error.message);
    console.log('='.repeat(60) + '\n');

    res.status(400).json({
      success: false,
      message: 'Failed to calculate travel matrix',
      error: error.message
    });
  }
});

/**
 * POST /api/routing/nearest-road
 * Find nearest road to coordinates (snap to road)
 * Body: { lat, lng }
 */
router.post('/nearest-road', async (req, res) => {
  const { lat, lng } = req.body;

  console.log('\n' + '='.repeat(60));
  console.log('🗺️ NEAREST ROAD REQUEST');
  console.log('='.repeat(60));
  console.log('Location:', lat, lng);

  try {
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude required'
      });
    }

    const coords = routingService.validateCoordinates(lat, lng);
    const roadData = await routingService.getNearestRoad(coords.lat, coords.lng);

    console.log('✅ Nearest road found:', roadData.name);
    console.log('='.repeat(60) + '\n');

    res.json({
      success: true,
      road: roadData
    });
  } catch (error) {
    console.error('❌ Nearest road lookup failed:', error.message);
    console.log('='.repeat(60) + '\n');

    res.status(400).json({
      success: false,
      message: 'Failed to find nearest road',
      error: error.message
    });
  }
});

/**
 * GET /api/routing/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Routing API is working',
    timestamp: new Date().toISOString(),
    service: 'OSRM (Open Source Routing Machine)',
    profiles: {
      driving: '🚗 Car routes',
      walking: '🚶 Pedestrian paths',
      cycling: '🚴 Bike routes'
    },
    endpoints: {
      '/route': 'Get route between two points',
      '/multi-waypoint': 'Get route with multiple stops',
      '/matrix': 'Calculate travel time matrix',
      '/nearest-road': 'Find nearest road to coordinates'
    }
  });
});

/**
 * GET /api/routing/test
 * Test endpoint with sample data
 */
router.get('/test', async (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 ROUTING TEST');
  console.log('='.repeat(60));

  const testCases = [
    {
      name: 'Kathmandu to Patan',
      from: { lat: 27.7172, lng: 85.3240 },
      to: { lat: 27.6710, lng: 85.3260 }
    },
    {
      name: 'Bhaktapur to Kathmandu',
      from: { lat: 27.6710, lng: 85.4298 },
      to: { lat: 27.7172, lng: 85.3240 }
    }
  ];

  const results = [];

  for (const test of testCases) {
    try {
      const route = await routingService.getRoute(
        test.from.lat,
        test.from.lng,
        test.to.lat,
        test.to.lng,
        'driving'
      );

      results.push({
        test: test.name,
        success: true,
        distance: route.distance_km + ' km',
        duration: route.duration_minutes + ' min'
      });
    } catch (error) {
      results.push({
        test: test.name,
        success: false,
        error: error.message
      });
    }
  }

  console.log('✅ Test completed');
  console.log('='.repeat(60) + '\n');

  res.json({
    success: true,
    message: 'Routing test completed',
    results
  });
});

module.exports = router;
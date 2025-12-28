// backend/services/routingService.js
// COMPLETE FILE - CREATE THIS NEW FILE

const axios = require('axios');

const routingService = {
  /**
   * Get route between two points
   * @param {number} startLat - Start latitude
   * @param {number} startLng - Start longitude
   * @param {number} endLat - End latitude
   * @param {number} endLng - End longitude
   * @param {string} profile - 'driving', 'walking', or 'cycling'
   * @returns {Promise<Object>} Route information
   */
  getRoute: async (startLat, startLng, endLat, endLng, profile = 'driving') => {
    console.log('🗺️ [ROUTING] Getting route:', {
      from: `${startLat}, ${startLng}`,
      to: `${endLat}, ${endLng}`,
      mode: profile
    });

    try {
      // OSRM API URL - lng,lat format (not lat,lng!)
      const url = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}`;
      
      const response = await axios.get(url, {
        params: {
          overview: 'full',
          geometries: 'geojson',
          steps: true,
          alternatives: true
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'RoomRentalNepal/1.0'
        }
      });

      if (response.data.code !== 'Ok') {
        throw new Error(`OSRM Error: ${response.data.code}`);
      }

      const route = response.data.routes[0];
      
      const routeData = {
        distance_km: (route.distance / 1000).toFixed(2),
        distance_miles: ((route.distance / 1000) * 0.621371).toFixed(2),
        duration_minutes: Math.round(route.duration / 60),
        duration_hours: (route.duration / 3600).toFixed(1),
        duration_seconds: Math.round(route.duration),
        geometry: route.geometry,
        steps: route.legs[0].steps.map(step => ({
          instruction: step.maneuver.instruction || 'Continue',
          distance_meters: Math.round(step.distance),
          distance_km: (step.distance / 1000).toFixed(2),
          duration_seconds: Math.round(step.duration),
          duration_minutes: Math.round(step.duration / 60),
          type: step.maneuver.type,
          modifier: step.maneuver.modifier || null
        })),
        waypoints: response.data.waypoints.map(wp => ({
          name: wp.name || 'Waypoint',
          location: wp.location
        }))
      };

      console.log('✅ [ROUTING] Route calculated successfully:', {
        distance: routeData.distance_km + ' km',
        duration: routeData.duration_minutes + ' min',
        steps: routeData.steps.length
      });

      return routeData;
    } catch (error) {
      console.error('❌ [ROUTING] Error:', error.message);
      
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      
      throw new Error(`Routing failed: ${error.message}`);
    }
  },

  /**
   * Get route with multiple waypoints
   * @param {Array} waypoints - Array of {lat, lng} objects
   * @param {string} profile - 'driving', 'walking', or 'cycling'
   * @returns {Promise<Object>} Route information
   */
  getRouteWithWaypoints: async (waypoints, profile = 'driving') => {
    console.log('🗺️ [ROUTING] Getting multi-waypoint route:', {
      waypoints: waypoints.length,
      mode: profile
    });

    try {
      if (!waypoints || waypoints.length < 2) {
        throw new Error('At least 2 waypoints required');
      }

      // Convert to OSRM format: lng,lat;lng,lat;...
      const coordinates = waypoints
        .map(wp => `${wp.lng},${wp.lat}`)
        .join(';');
      
      const url = `https://router.project-osrm.org/route/v1/${profile}/${coordinates}`;
      
      const response = await axios.get(url, {
        params: {
          overview: 'full',
          geometries: 'geojson',
          steps: true
        },
        timeout: 15000,
        headers: {
          'User-Agent': 'RoomRentalNepal/1.0'
        }
      });

      if (response.data.code !== 'Ok') {
        throw new Error(`OSRM Error: ${response.data.code}`);
      }

      const route = response.data.routes[0];
      
      const routeData = {
        distance_km: (route.distance / 1000).toFixed(2),
        duration_minutes: Math.round(route.duration / 60),
        geometry: route.geometry,
        waypoints_count: waypoints.length,
        total_steps: route.legs.reduce((sum, leg) => sum + leg.steps.length, 0)
      };

      console.log('✅ [ROUTING] Multi-waypoint route calculated:', routeData);

      return routeData;
    } catch (error) {
      console.error('❌ [ROUTING] Multi-waypoint error:', error.message);
      throw new Error(`Multi-point routing failed: ${error.message}`);
    }
  },

  /**
   * Calculate travel time matrix
   * @param {Array} sources - Array of {lat, lng} source points
   * @param {Array} destinations - Array of {lat, lng} destination points
   * @param {string} profile - 'driving', 'walking', or 'cycling'
   * @returns {Promise<Object>} Travel time matrix
   */
  getTravelMatrix: async (sources, destinations, profile = 'driving') => {
    console.log('🗺️ [ROUTING] Calculating travel time matrix:', {
      sources: sources.length,
      destinations: destinations.length,
      mode: profile
    });

    try {
      // Combine all coordinates
      const allPoints = [...sources, ...destinations];
      const coordinates = allPoints
        .map(p => `${p.lng},${p.lat}`)
        .join(';');
      
      const url = `https://router.project-osrm.org/table/v1/${profile}/${coordinates}`;
      
      // Source indices
      const sourceIndices = Array.from({ length: sources.length }, (_, i) => i).join(';');
      
      // Destination indices (offset by sources length)
      const destIndices = Array.from(
        { length: destinations.length }, 
        (_, i) => sources.length + i
      ).join(';');
      
      const response = await axios.get(url, {
        params: {
          sources: sourceIndices,
          destinations: destIndices
        },
        timeout: 15000,
        headers: {
          'User-Agent': 'RoomRentalNepal/1.0'
        }
      });

      if (response.data.code !== 'Ok') {
        throw new Error(`OSRM Error: ${response.data.code}`);
      }

      const matrixData = {
        durations: response.data.durations, // seconds
        distances: response.data.distances, // meters
        sources_count: sources.length,
        destinations_count: destinations.length,
        formatted_durations: response.data.durations.map(row =>
          row.map(dur => dur ? Math.round(dur / 60) + ' min' : 'N/A')
        ),
        formatted_distances: response.data.distances.map(row =>
          row.map(dist => dist ? (dist / 1000).toFixed(2) + ' km' : 'N/A')
        )
      };

      console.log('✅ [ROUTING] Matrix calculated successfully');

      return matrixData;
    } catch (error) {
      console.error('❌ [ROUTING] Matrix error:', error.message);
      throw new Error(`Travel matrix failed: ${error.message}`);
    }
  },

  /**
   * Get nearest road point (snap to road)
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<Object>} Nearest road point
   */
  getNearestRoad: async (lat, lng) => {
    console.log('🗺️ [ROUTING] Finding nearest road to:', { lat, lng });

    try {
      const url = `https://router.project-osrm.org/nearest/v1/driving/${lng},${lat}`;
      
      const response = await axios.get(url, {
        params: {
          number: 1
        },
        timeout: 5000,
        headers: {
          'User-Agent': 'RoomRentalNepal/1.0'
        }
      });

      if (response.data.code !== 'Ok') {
        throw new Error('No nearby road found');
      }

      const waypoint = response.data.waypoints[0];
      
      const roadData = {
        location: {
          lat: waypoint.location[1],
          lng: waypoint.location[0]
        },
        name: waypoint.name || 'Unnamed road',
        distance_to_road: waypoint.distance || 0
      };

      console.log('✅ [ROUTING] Nearest road found:', roadData.name);

      return roadData;
    } catch (error) {
      console.error('❌ [ROUTING] Nearest road error:', error.message);
      throw new Error(`Nearest road lookup failed: ${error.message}`);
    }
  },

  /**
   * Validate coordinates
   */
  validateCoordinates: (lat, lng) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Invalid coordinates: must be numbers');
    }

    if (latitude < -90 || latitude > 90) {
      throw new Error('Invalid latitude: must be between -90 and 90');
    }

    if (longitude < -180 || longitude > 180) {
      throw new Error('Invalid longitude: must be between -180 and 180');
    }

    return { lat: latitude, lng: longitude };
  }
};

module.exports = routingService;
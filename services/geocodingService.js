// backend/services/geocodingService.js
// Replace Google Maps with Nominatim (OpenStreetMap)

const axios = require('axios');

const geocodingService = {
  /**
   * Forward geocoding: Address → Coordinates
   * Uses OpenStreetMap Nominatim API (Free, no API key needed)
   */
  geocodeAddress: async (address) => {
    console.log('🗺️ [GEOCODING] Forward geocoding:', address);

    try {
      const url = 'https://nominatim.openstreetmap.org/search';
      
      const response = await axios.get(url, {
        params: {
          q: address,
          format: 'json',
          limit: 1,
          countrycodes: 'np', // Nepal only
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'RoomRentalNepal/1.0'
        },
        timeout: 10000
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('Location not found');
      }

      const result = response.data[0];
      
      const geocodeData = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        formatted_address: result.display_name,
        city: result.address.city || result.address.town || result.address.village || '',
        state: result.address.state || '',
        country: result.address.country || 'Nepal',
        postal_code: result.address.postcode || '',
        address_components: result.address
      };

      console.log('✅ [GEOCODING] Forward geocoding successful:', geocodeData);

      return geocodeData;
    } catch (error) {
      console.error('❌ [GEOCODING] Forward geocoding error:', error.message);
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  },

  /**
   * Reverse geocoding: Coordinates → Address
   */
  reverseGeocode: async (lat, lng) => {
    console.log('🗺️ [GEOCODING] Reverse geocoding:', { lat, lng });

    try {
      const url = 'https://nominatim.openstreetmap.org/reverse';
      
      const response = await axios.get(url, {
        params: {
          lat: lat,
          lon: lng,
          format: 'json',
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'RoomRentalNepal/1.0'
        },
        timeout: 10000
      });

      if (!response.data) {
        throw new Error('Address not found');
      }

      const result = response.data;
      
      const addressData = {
        formatted_address: result.display_name,
        street: result.address.road || '',
        city: result.address.city || result.address.town || result.address.village || '',
        state: result.address.state || '',
        country: result.address.country || 'Nepal',
        postal_code: result.address.postcode || '',
        address_components: result.address
      };

      console.log('✅ [GEOCODING] Reverse geocoding successful');

      return addressData;
    } catch (error) {
      console.error('❌ [GEOCODING] Reverse geocoding error:', error.message);
      throw new Error(`Reverse geocoding failed: ${error.message}`);
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

module.exports = geocodingService;
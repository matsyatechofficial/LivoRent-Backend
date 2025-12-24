// ========================================
// services/geocodingService.js
// ========================================
const axios = require('axios');

const geocodingService = {
  /**
   * Convert address to coordinates (latitude, longitude)
   * @param {string} address - Full address string
   * @returns {Promise<{lat: number, lng: number, formatted_address: string, postal_code: string}>}
   */
  geocodeAddress: async (address) => {
    console.log('🔍 [GEOCODING] Starting geocoding for address:', address);
    
    try {
      // Clean address
      const cleanAddress = address.trim();
      
      // Always use Nominatim for Nepal addresses
      console.log('✅ [GEOCODING] Using Nominatim (OpenStreetMap) for Nepal');
      return await geocodingService.geocodeWithNominatim(cleanAddress);
      
    } catch (error) {
      console.error('❌ [GEOCODING] Error:', error.message);
      
      // Return default Kathmandu location as fallback
      console.warn('⚠️ [GEOCODING] Returning default Kathmandu location');
      return {
        lat: 27.7172,
        lng: 85.3240,
        formatted_address: address || 'Kathmandu, Nepal',
        postal_code: '44600',
        city: 'Kathmandu',
        state: 'Bagmati Province',
        country: 'Nepal',
        provider: 'default_fallback'
      };
    }
  },

  /**
   * Geocode using OpenStreetMap Nominatim API (free) - Optimized for Nepal
   */
  geocodeWithNominatim: async (address) => {
    console.log('📡 [NOMINATIM] Sending request to Nominatim API...');
    
    try {
      // Ensure address ends with Nepal for better results
      let searchAddress = address;
      if (!address.toLowerCase().includes('nepal')) {
        searchAddress = address + ', Nepal';
      }
      
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: searchAddress,
          format: 'json',
          limit: 1,
          addressdetails: 1,
          countrycodes: 'np',  // Focus on Nepal only
          'accept-language': 'en'  // English response
        },
        headers: {
          'User-Agent': 'RoomRentalNepal/1.0 (nepalroomrental.com)'
        },
        timeout: 10000  // 10 seconds timeout
      });

      console.log('📥 [NOMINATIM] Response received:', {
        results_count: response.data.length,
        status: response.status
      });

      if (!response.data || response.data.length === 0) {
        console.warn('⚠️ [NOMINATIM] No results found for address');
        
        // Try with just city name if full address fails
        const cityMatch = address.match(/([^,]+),/);
        if (cityMatch) {
          const cityName = cityMatch[1].trim();
          console.log(`🔄 [NOMINATIM] Trying with city only: ${cityName}`);
          return await geocodingService.geocodeWithNominatim(cityName);
        }
        
        throw new Error('Address not found in Nepal');
      }

      const result = response.data[0];
      const addressDetails = result.address || {};

      const locationData = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        formatted_address: result.display_name || address,
        postal_code: addressDetails.postcode || '',
        city: addressDetails.city || addressDetails.town || addressDetails.village || '',
        state: addressDetails.state || addressDetails.county || '',
        country: addressDetails.country || 'Nepal',
        provider: 'nominatim'
      };

      console.log('✅ [NOMINATIM] Successfully geocoded:', {
        lat: locationData.lat,
        lng: locationData.lng,
        city: locationData.city,
        country: locationData.country
      });

      return locationData;
    } catch (error) {
      console.error('❌ [NOMINATIM] Error:', error.message);
      throw new Error(`Nominatim geocoding failed: ${error.message}`);
    }
  },

  /**
   * Reverse geocode: Convert coordinates to address
   */
  reverseGeocode: async (latitude, longitude) => {
    console.log('🔍 [REVERSE GEOCODING] Starting for coordinates:', { latitude, longitude });
    
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          'accept-language': 'en'
        },
        headers: {
          'User-Agent': 'RoomRentalNepal/1.0 (nepalroomrental.com)'
        },
        timeout: 10000
      });

      console.log('📥 [NOMINATIM REVERSE] Response received');

      const address = response.data.address || {};
      
      const addressData = {
        address: response.data.display_name || '',
        city: address.city || address.town || address.village || '',
        state: address.state || '',
        country: address.country || '',
        postal_code: address.postcode || ''
      };

      console.log('✅ [NOMINATIM REVERSE] Successfully reverse geocoded:', addressData);
      
      return addressData;
    } catch (error) {
      console.error('❌ [REVERSE GEOCODING] Error:', error.message);
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  },

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    console.log('📏 [DISTANCE] Calculating distance between coordinates');
    
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    console.log('✅ [DISTANCE] Calculated distance:', distance.toFixed(2), 'km');
    
    return distance;
  }
};

module.exports = geocodingService;
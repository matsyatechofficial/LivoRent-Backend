const axios = require('axios');

class GooglePlacesService {
    constructor() {
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
        this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
    }

    async getNearbyPlaces(latitude, longitude, radius = 2000, types = ['school', 'hospital']) {
        try {
            const places = [];
            
            for (const type of types) {
                const response = await axios.get(`${this.baseUrl}/nearbysearch/json`, {
                    params: {
                        location: `${latitude},${longitude}`,
                        radius: radius,
                        type: type,
                        key: this.apiKey
                    }
                });

                if (response.data.results) {
                    places.push(...response.data.results.map(place => ({
                        name: place.name,
                        type: type,
                        address: place.vicinity,
                        rating: place.rating,
                        location: place.geometry.location,
                        distance: this.calculateDistance(
                            latitude,
                            longitude,
                            place.geometry.location.lat,
                            place.geometry.location.lng
                        )
                    })));
                }
            }

            // Sort by distance
            return places.sort((a, b) => a.distance - b.distance).slice(0, 10);
        } catch (error) {
            console.error('Google Places API Error:', error.message);
            throw new Error('Failed to fetch nearby places');
        }
    }

    async geocodeAddress(address) {
        try {
            const response = await axios.get(`${this.baseUrl}/geocode/json`, {
                params: {
                    address: address,
                    key: this.apiKey
                }
            });

            if (response.data.results && response.data.results.length > 0) {
                return {
                    latitude: response.data.results[0].geometry.location.lat,
                    longitude: response.data.results[0].geometry.location.lng,
                    formatted_address: response.data.results[0].formatted_address
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding Error:', error.message);
            throw new Error('Failed to geocode address');
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in km
    }

    toRad(degrees) {
        return degrees * (Math.PI/180);
    }

    async getPlaceDetails(placeId) {
        try {
            const response = await axios.get(`${this.baseUrl}/details/json`, {
                params: {
                    place_id: placeId,
                    fields: 'name,formatted_address,formatted_phone_number,opening_hours,website,rating,photos',
                    key: this.apiKey
                }
            });

            return response.data.result;
        } catch (error) {
            console.error('Place Details Error:', error.message);
            throw new Error('Failed to fetch place details');
        }
    }
}

module.exports = new GooglePlacesService();
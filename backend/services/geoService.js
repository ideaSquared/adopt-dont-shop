import axios from 'axios';

const getGeocodePoint = async (service, city, country) => {
	if (service === 'mapbox') {
		console.log(service);
		const searchQuery = `${city}, ${country}`;
		const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
			searchQuery
		)}.json?access_token=${process.env.MAPBOX_ACCESS_TOKEN}`;
		try {
			const response = await axios.get(url);
			if (
				response.data.features.length > 0 &&
				response.data.features[0].geometry
			) {
				const coordinates = response.data.features[0].geometry.coordinates;
				return `(${coordinates[0]}, ${coordinates[1]})`;
			} else {
				throw new Error('No valid coordinates found');
			}
		} catch (error) {
			console.error('Failed to fetch coordinates:', error);
			throw error;
		}
	} else if (service === 'google') {
		console.log(service);
		// Implement Google Maps API
	} else {
		throw new Error('No service selected for getGeocodePoint');
	}
};

const geoService = {
	getGeocodePoint,
};

export default geoService;

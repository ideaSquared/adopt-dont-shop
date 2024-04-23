import axios from 'axios';

/*

POSTGRESQL expects the data to be in a latitude/longitude order.

*/

export const geoService = {
	// Async function to fetch geocoded data for a given city and country to store in the database dependent on what service to use.
	async getGeocodePoint(city, country) {
		const service = process.env.GEOCODE_SOLUTION;

		if (service === 'mapbox') {
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
					console.log('No valid coordinates found for Mapbox');
					return null;
				}
			} catch (error) {
				console.error('Failed to fetch coordinates from Mapbox:', error);
				return null;
			}
		} else if (service === 'google') {
			const searchQuery = `${city}, ${country}`;
			const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
				searchQuery
			)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
			try {
				const response = await axios.get(url);
				if (response.data.status === 'OK') {
					const location = response.data.results[0].geometry.location;
					return `(${location.lng}, ${location.lat})`;
				} else {
					console.log('No valid coordinates found for Google');
					return null;
				}
			} catch (error) {
				console.error('Failed to fetch coordinates from Google:', error);
				return null;
			}
		} else {
			console.error('No geocode service selected');
			return null;
		}
	},

	// Parses a point string into latitude and longitude.
	parsePoint(point) {
		const coordinates = point.replace(/[()]/g, '').split(',');
		return {
			latitude: parseFloat(coordinates[0].trim()),
			longitude: parseFloat(coordinates[1].trim()),
		};
	},

	// Converts degrees to radians.
	degreesToRadians(degrees) {
		return (degrees * Math.PI) / 180;
	},

	// Converts distance from kilometers to the specified unit.
	convertDistance(distanceKm, unit) {
		if (unit === 'm') {
			return distanceKm * 1000; // Convert to meters
		} else if (unit === 'miles') {
			return distanceKm * 0.621371; // Convert to miles
		}
		return distanceKm; // Default to kilometers
	},

	// Formats the distance in the specified unit.
	formatDistance(distance, unit) {
		const roundedDistance = Math.round(distance);
		if (unit === 'm') {
			return `${roundedDistance} m`;
		} else if (unit === 'miles') {
			return `${roundedDistance} miles`;
		}
		return `${roundedDistance} km`; // Default to kilometers
	},

	// Calculate distance and automatically determine the unit based on distance
	calculateAndFormatDistance(distanceKm) {
		if (distanceKm < 0.1) {
			return `${(distanceKm * 1000).toFixed(0)} m`;
		} else if (distanceKm > 100) {
			return `${(distanceKm * 0.621371).toFixed(0)} miles`;
		}
		return `${distanceKm.toFixed(0)} km`;
	},

	// Haversine formula for calculating distance.
	calculateHaversineDistance(lat1, lon1, lat2, lon2) {
		const earthRadiusKm = 6371;
		const dLat = this.degreesToRadians(lat2 - lat1);
		const dLon = this.degreesToRadians(lon2 - lon1);
		lat1 = this.degreesToRadians(lat1);
		lat2 = this.degreesToRadians(lat2);
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return earthRadiusKm * c;
	},

	// Spherical Law of Cosines to calculate distance between two points.
	calculateDistanceSphericalLawOfCosines(lat1, lon1, lat2, lon2) {
		const earthRadiusKm = 6371;

		lat1 = this.degreesToRadians(lat1);
		lon1 = this.degreesToRadians(lon1);
		lat2 = this.degreesToRadians(lat2);
		lon2 = this.degreesToRadians(lon2);

		const distance =
			Math.acos(
				Math.sin(lat1) * Math.sin(lat2) +
					Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
			) * earthRadiusKm;

		return distance;
	},

	// Vincenty formula for calculating geodesic distances between two points on the Earth's surface.
	calculateDistanceVincenty(lat1, lon1, lat2, lon2) {
		const a = 6378137; // Semi-major axis
		const b = 6356752.3142; // Semi-minor axis
		const f = 1 / 298.257223563; // Flattening
		const L = this.degreesToRadians(lon2 - lon1);
		const U1 = Math.atan((1 - f) * Math.tan(this.degreesToRadians(lat1)));
		const U2 = Math.atan((1 - f) * Math.tan(this.degreesToRadians(lat2)));
		const sinU1 = Math.sin(U1),
			cosU1 = Math.cos(U1);
		const sinU2 = Math.sin(U2),
			cosU2 = Math.cos(U2);

		let lambda = L,
			lambdaP,
			iterLimit = 100;
		let cosSqAlpha, sinSigma, cos2SigmaM, cosSigma, sigma;

		do {
			const sinLambda = Math.sin(lambda),
				cosLambda = Math.cos(lambda);
			sinSigma = Math.sqrt(
				cosU2 * sinLambda * (cosU2 * sinLambda) +
					(cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) *
						(cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)
			);
			if (sinSigma === 0) return 0; // co-incident points

			cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
			sigma = Math.atan2(sinSigma, cosSigma);
			const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
			cosSqAlpha = 1 - sinAlpha * sinAlpha;
			cos2SigmaM = cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;

			const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
			lambdaP = lambda;
			lambda =
				L +
				(1 - C) *
					f *
					sinAlpha *
					(sigma +
						C *
							sinSigma *
							(cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
		} while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);

		if (iterLimit === 0) return NaN; // formula failed to converge

		const uSq = (cosSqAlpha * (a * a - b * b)) / (b * b);
		const A =
			1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
		const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
		const deltaSigma =
			B *
			sinSigma *
			(cos2SigmaM +
				(B / 4) *
					(cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
						(B / 6) *
							cos2SigmaM *
							(-3 + 4 * sinSigma * sinSigma) *
							(-3 + 4 * cos2SigmaM * cos2SigmaM)));

		const s = b * A * (sigma - deltaSigma);

		return s / 1000;
	},

	// Calculates the distance between two points using the specified method and unit.
	calculateDistanceBetweenTwoLatLng(
		origin,
		destination,
		unit = 'km',
		method = 'best'
	) {
		const originCoords = this.parsePoint(origin);
		const destinationCoords = this.parsePoint(destination);
		let distance = 0;
		if (method === 'best') {
			const latDiff = Math.abs(
				originCoords.latitude - destinationCoords.latitude
			);
			const lonDiff = Math.abs(
				originCoords.longitude - destinationCoords.longitude
			);
			method =
				latDiff > 10 || lonDiff > 10
					? 'Vincenty'
					: latDiff < 1 && lonDiff < 1
					? 'SphericalLawOfCosines'
					: 'Haversine';
		}
		switch (method) {
			case 'Haversine':
				distance = this.calculateHaversineDistance(
					originCoords.latitude,
					originCoords.longitude,
					destinationCoords.latitude,
					destinationCoords.longitude
				);
				break;
			case 'SphericalLawOfCosines':
				distance = this.calculateDistanceSphericalLawOfCosines(
					originCoords.latitude,
					originCoords.longitude,
					destinationCoords.latitude,
					destinationCoords.longitude
				);
				break;
			case 'Vincenty':
				distance = this.calculateDistanceVincenty(
					originCoords.latitude,
					originCoords.longitude,
					destinationCoords.latitude,
					destinationCoords.longitude
				);
				break;
			default:
				console.error('Invalid method specified');
				return null;
		}
		distance = this.convertDistance(distance, unit);

		return this.formatDistance(distance, unit);
	},
};

// Uncomment the following line if you need a default export
// export default geoService;

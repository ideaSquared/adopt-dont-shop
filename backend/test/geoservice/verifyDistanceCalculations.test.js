import { expect } from 'chai';
import { geoService } from '../../services/geoService.js'; // Adjust the path as necessary

describe('GeoService', function () {
	describe('parsePoint', () => {
		it('should correctly parse a point string to a latitude and longitude object', () => {
			const point = '(53.4808, -2.2426)'; // Assuming the format (latitude, longitude)
			const parsed = geoService.parsePoint(point);
			expect(parsed).to.deep.equal({ latitude: 53.4808, longitude: -2.2426 });
		});
	});

	describe('Haversine Distance Calculation', () => {
		it('should calculate the correct distance between two points in kilometers', () => {
			const distance = geoService.calculateHaversineDistance(
				53.4808,
				-2.2426,
				53.5228,
				-1.1312
			);
			expect(distance).to.be.closeTo(73.65, 1); // Distance in kilometers
		});

		it('should calculate the correct distance between two points using different units', () => {
			const km = geoService.calculateHaversineDistance(
				53.4808,
				-2.2426,
				53.5228,
				-1.1312
			);
			const meters = geoService.convertDistance(km, 'm');
			const miles = geoService.convertDistance(km, 'miles');
			expect(meters).to.be.closeTo(73650, 10); // Distance in meters
			expect(miles).to.be.closeTo(45.72, 0.1); // Distance in miles
		});

		it('should return zero when the same points are used for origin and destination', () => {
			const distance = geoService.calculateHaversineDistance(
				53.4808,
				-2.2426,
				53.4808,
				-2.2426
			);
			expect(distance).to.equal(0);
		});
	});

	describe('Spherical Law Of Cosines', () => {
		it('should calculate the correct distance between two points', () => {
			const distance = geoService.calculateDistanceSphericalLawOfCosines(
				53.4808,
				-2.2426,
				53.5228,
				-1.1312
			);
			expect(distance).to.be.closeTo(73.65, 1);
		});
	});

	describe("Vincenty's Formula", () => {
		it('should calculate the correct distance between two points', () => {
			const distance = geoService.calculateDistanceVincenty(
				53.4808,
				-2.2426,
				53.5228,
				-1.1312
			);
			expect(distance).to.be.closeTo(73.65, 1);
		});

		it("should return NaN for antipodal points where Vincenty's formula does not converge", () => {
			const distance = geoService.calculateDistanceVincenty(0, 0, 0, 180);
			expect(distance).to.be.NaN;
		});
	});

	describe('Dynamic Distance Calculation', () => {
		it('should correctly calculate the distance between two given point strings using the best method', () => {
			const origin = '(53.4808, -2.2426)'; // Manchester
			const destination = '(53.5228, -1.1312)'; // Doncaster

			const distance = geoService.calculateDistanceBetweenTwoLatLng(
				origin,
				destination
			);
			// console.log('Distance:', distance);
			expect(distance).to.include('74 km'); // Expected output should include the unit and distance

			// Additional assertions to verify the distance in other units
			const distanceInMiles = geoService.calculateDistanceBetweenTwoLatLng(
				origin,
				destination,
				'miles'
			);
			// console.log('Distance in Miles:', distanceInMiles);
			expect(distanceInMiles).to.include('46 miles'); // Approximate distance in miles

			const distanceInMeters = geoService.calculateDistanceBetweenTwoLatLng(
				origin,
				destination,
				'm'
			);
			// console.log('Distance in Meters:', distanceInMeters);
			expect(distanceInMeters).to.include('73654 m'); // Approximate distance in meters
		});
	});
});

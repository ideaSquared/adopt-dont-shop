import {
  calculateDistance,
  milesToKilometers,
  kilometersToMiles,
  isValidLatitude,
  isValidLongitude,
  isValidCoordinates,
  DISTANCE_PRESETS,
} from '../../utils/geolocation';

describe('Geolocation utilities', () => {
  describe('calculateDistance', () => {
    it('returns zero distance for the same point', () => {
      const distance = calculateDistance(51.5074, -0.1278, 51.5074, -0.1278);
      expect(distance).toBe(0);
    });

    it('calculates distance between London and Paris in miles', () => {
      // London: 51.5074, -0.1278 | Paris: 48.8566, 2.3522
      // Known distance: ~213 miles
      const distance = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522, 'miles');
      expect(distance).toBeGreaterThan(200);
      expect(distance).toBeLessThan(220);
    });

    it('calculates distance between London and Paris in kilometers', () => {
      const distance = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522, 'km');
      expect(distance).toBeGreaterThan(330);
      expect(distance).toBeLessThan(350);
    });

    it('calculates distance between New York and Los Angeles', () => {
      // NYC: 40.7128, -74.0060 | LA: 34.0522, -118.2437
      // Known distance: ~2,451 miles
      const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437, 'miles');
      expect(distance).toBeGreaterThan(2400);
      expect(distance).toBeLessThan(2500);
    });

    it('defaults to miles when unit is not specified', () => {
      const distanceMiles = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522, 'miles');
      const distanceDefault = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522);
      expect(distanceDefault).toBe(distanceMiles);
    });

    it('handles antipodal points', () => {
      // North Pole to South Pole
      const distance = calculateDistance(90, 0, -90, 0, 'miles');
      // Half circumference ~12,451 miles
      expect(distance).toBeGreaterThan(12000);
      expect(distance).toBeLessThan(13000);
    });

    it('handles crossing the date line', () => {
      // Points near the date line
      const distance = calculateDistance(0, 179, 0, -179, 'miles');
      // Should be a short distance (~138 miles at equator for 2 degrees)
      expect(distance).toBeLessThan(200);
    });
  });

  describe('unit conversions', () => {
    it('converts miles to kilometers', () => {
      expect(milesToKilometers(1)).toBeCloseTo(1.60934, 4);
      expect(milesToKilometers(10)).toBeCloseTo(16.0934, 3);
      expect(milesToKilometers(0)).toBe(0);
    });

    it('converts kilometers to miles', () => {
      expect(kilometersToMiles(1)).toBeCloseTo(0.621371, 4);
      expect(kilometersToMiles(10)).toBeCloseTo(6.21371, 3);
      expect(kilometersToMiles(0)).toBe(0);
    });

    it('round-trips between miles and kilometers', () => {
      const originalMiles = 25;
      const km = milesToKilometers(originalMiles);
      const backToMiles = kilometersToMiles(km);
      expect(backToMiles).toBeCloseTo(originalMiles, 3);
    });
  });

  describe('coordinate validation', () => {
    it('validates correct latitudes', () => {
      expect(isValidLatitude(0)).toBe(true);
      expect(isValidLatitude(45.5)).toBe(true);
      expect(isValidLatitude(-45.5)).toBe(true);
      expect(isValidLatitude(90)).toBe(true);
      expect(isValidLatitude(-90)).toBe(true);
    });

    it('rejects invalid latitudes', () => {
      expect(isValidLatitude(91)).toBe(false);
      expect(isValidLatitude(-91)).toBe(false);
      expect(isValidLatitude(NaN)).toBe(false);
    });

    it('validates correct longitudes', () => {
      expect(isValidLongitude(0)).toBe(true);
      expect(isValidLongitude(120.5)).toBe(true);
      expect(isValidLongitude(-120.5)).toBe(true);
      expect(isValidLongitude(180)).toBe(true);
      expect(isValidLongitude(-180)).toBe(true);
    });

    it('rejects invalid longitudes', () => {
      expect(isValidLongitude(181)).toBe(false);
      expect(isValidLongitude(-181)).toBe(false);
      expect(isValidLongitude(NaN)).toBe(false);
    });

    it('validates coordinate pairs', () => {
      expect(isValidCoordinates(51.5074, -0.1278)).toBe(true);
      expect(isValidCoordinates(0, 0)).toBe(true);
      expect(isValidCoordinates(91, 0)).toBe(false);
      expect(isValidCoordinates(0, 181)).toBe(false);
      expect(isValidCoordinates(91, 181)).toBe(false);
    });
  });

  describe('DISTANCE_PRESETS', () => {
    it('has expected preset values in miles', () => {
      expect(DISTANCE_PRESETS.NEARBY).toBe(10);
      expect(DISTANCE_PRESETS.LOCAL).toBe(25);
      expect(DISTANCE_PRESETS.REGIONAL).toBe(50);
      expect(DISTANCE_PRESETS.EXTENDED).toBe(100);
      expect(DISTANCE_PRESETS.NATIONWIDE).toBe(250);
    });
  });
});

import type { MigrationBuilder } from 'node-pg-migrate';

// Rescue coordinates, geocoded from the postcode on create/update. They feed
// the swipe card's distance badge (matching reads them via GetRescueLocations).
// Nullable: a rescue whose postcode could not be geocoded simply has no
// distance. Plain double precision (no PostGIS) — haversine is done in
// service.matching.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('rescues', {
    latitude: { type: 'double precision' },
    longitude: { type: 'double precision' },
  });
  pgm.addConstraint('rescues', 'rescues_coordinates_range_check', {
    check:
      '(latitude IS NULL OR latitude BETWEEN -90 AND 90) AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropConstraint('rescues', 'rescues_coordinates_range_check');
  pgm.dropColumns('rescues', ['latitude', 'longitude']);
};

// Real, currently-active UK postcodes for the synthetic dev rescues, spread
// from the north of Scotland to the south-west so swipe-card distances vary.
//
// Each postcode was checked against https://api.postcodes.io/postcodes/<pc>
// (HTTP 200, not terminated) and its coordinates are the ones that API
// returns. Storing them here means seeding needs no network call: SQL-seeded
// rescues skip the create RPC (which is what geocodes), so they get their
// coordinates directly. The first eight are deliberately the widest spread,
// because the default run seeds eight rescues.

export type SeedLocation = {
  city: string;
  postcode: string;
  latitude: number;
  longitude: number;
};

export const SEED_LOCATIONS: readonly SeedLocation[] = [
  { city: 'Edinburgh', postcode: 'EH1 1RE', latitude: 55.949575, longitude: -3.190897 },
  { city: 'London', postcode: 'SW1A 1AA', latitude: 51.50101, longitude: -0.141563 },
  { city: 'Cardiff', postcode: 'CF10 3AT', latitude: 51.489014, longitude: -3.179718 },
  { city: 'Newcastle upon Tyne', postcode: 'NE1 4ST', latitude: 54.975225, longitude: -1.622337 },
  { city: 'Birmingham', postcode: 'B1 1BB', latitude: 52.480144, longitude: -1.90289 },
  { city: 'Exeter', postcode: 'EX4 3LS', latitude: 50.724788, longitude: -3.531366 },
  { city: 'Belfast', postcode: 'BT1 5GS', latitude: 54.596633, longitude: -5.930077 },
  { city: 'Norwich', postcode: 'NR1 3JQ', latitude: 52.629114, longitude: 1.297338 },
  { city: 'Glasgow', postcode: 'G2 1DU', latitude: 55.868735, longitude: -4.243478 },
  { city: 'Leeds', postcode: 'LS1 4DY', latitude: 53.79515, longitude: -1.546669 },
  { city: 'Liverpool', postcode: 'L1 8JQ', latitude: 53.404567, longitude: -2.987154 },
  { city: 'Aberdeen', postcode: 'AB10 1AB', latitude: 57.14959, longitude: -2.096923 },
  { city: 'Cambridge', postcode: 'CB2 1TN', latitude: 52.205118, longitude: 0.116208 },
  { city: 'Nottingham', postcode: 'NG1 6DQ', latitude: 52.952374, longitude: -1.152021 },
  { city: 'Inverness', postcode: 'IV1 1EY', latitude: 57.48014, longitude: -4.228431 },
  { city: 'York', postcode: 'YO1 7HH', latitude: 53.961573, longitude: -1.08191 },
];

// Past the end of the table the locations repeat, like the rescue names do.
export const seedLocation = (index: number): SeedLocation =>
  SEED_LOCATIONS[index % SEED_LOCATIONS.length];

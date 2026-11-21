// Caps for mutation request bodies (ENG-1406), shared by the route schemas so
// an over-cap value gets a 400 from Fastify's validation before any handler
// runs. Same values as the pets bodies (see PET_FIELD_BOUNDS in pets.ts).
//
// Bodies stay open (no additionalProperties: false): some of them carry
// free-form JSON that the handler folds into the stored answers.
export const BODY_BOUNDS = {
  // ids, enum tokens, ISO timestamps
  token: { type: 'string', maxLength: 100 },
  // names, titles, subjects
  name: { type: 'string', maxLength: 200 },
  // long free text: notes, reasons, descriptions, message bodies
  longText: { type: 'string', maxLength: 10_000 },
  email: { type: 'string', maxLength: 254 },
  phone: { type: 'string', maxLength: 32 },
  // a JSON document carried as a string (answers patch, references)
  jsonBlob: { type: 'string', maxLength: 100_000 },
} as const;

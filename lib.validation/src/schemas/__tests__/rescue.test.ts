import {
  AdoptionPolicySchema,
  AddStaffMemberRequestSchema,
  CountryCodeSchema,
  RescueBulkUpdateRequestSchema,
  RescueCreateRequestSchema,
  RescueDeletionRequestSchema,
  RescueRejectionRequestSchema,
  RescueSearchQuerySchema,
  RescueStatusSchema,
  RescueUpdateRequestSchema,
  RescueVerificationRequestSchema,
  StaffInvitationRequestSchema,
  UkPhoneNumberSchema,
  UkPostcodeSchema,
} from '../rescue';

describe('Rescue schemas', () => {
  describe('UkPostcodeSchema', () => {
    it('uppercases and normalises whitespace', () => {
      expect(UkPostcodeSchema.parse('  sw1a 1aa  ')).toBe('SW1A 1AA');
    });

    it('accepts the no-space form', () => {
      expect(UkPostcodeSchema.parse('SW1A1AA')).toBe('SW1A1AA');
    });

    it('rejects garbage', () => {
      expect(() => UkPostcodeSchema.parse('not a postcode')).toThrow();
    });
  });

  describe('UkPhoneNumberSchema', () => {
    it('strips separators and accepts +44 numbers', () => {
      expect(UkPhoneNumberSchema.parse('+44 (20) 7946-0958')).toBe('+442079460958');
    });

    it('accepts a 0-prefixed UK number', () => {
      expect(UkPhoneNumberSchema.parse('020 7946 0958')).toBe('02079460958');
    });

    it('rejects too-short input', () => {
      expect(() => UkPhoneNumberSchema.parse('123')).toThrow();
    });
  });

  describe('CountryCodeSchema', () => {
    it('uppercases and accepts alpha-2 codes', () => {
      expect(CountryCodeSchema.parse('gb')).toBe('GB');
      expect(CountryCodeSchema.parse(' US ')).toBe('US');
    });

    it('rejects 3-letter codes and full names', () => {
      expect(() => CountryCodeSchema.parse('GBR')).toThrow();
      expect(() => CountryCodeSchema.parse('United Kingdom')).toThrow();
    });

    it('rejects digits / mixed input', () => {
      expect(() => CountryCodeSchema.parse('12')).toThrow();
      expect(() => CountryCodeSchema.parse('G1')).toThrow();
    });
  });

  describe('RescueStatusSchema', () => {
    it('accepts the canonical statuses', () => {
      expect(RescueStatusSchema.parse('verified')).toBe('verified');
    });

    it('rejects unknown statuses', () => {
      expect(() => RescueStatusSchema.parse('archived')).toThrow();
    });
  });

  describe('RescueCreateRequestSchema', () => {
    const valid = {
      name: 'Happy Tails Rescue',
      email: 'hello@happytails.org',
      address: '1 Lane',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'GB',
      contactPerson: 'Jane Doe',
    };

    it('accepts a minimal valid create payload', () => {
      const parsed = RescueCreateRequestSchema.parse(valid);
      expect(parsed.email).toBe('hello@happytails.org');
      expect(parsed.postcode).toBe('SW1A 1AA');
    });

    it('rejects names shorter than 2 chars after trim', () => {
      expect(() => RescueCreateRequestSchema.parse({ ...valid, name: ' x ' })).toThrow();
    });

    it('rejects an invalid postcode', () => {
      expect(() => RescueCreateRequestSchema.parse({ ...valid, postcode: '12345' })).toThrow();
    });

    it('rejects an EIN outside 9–10 chars', () => {
      expect(() => RescueCreateRequestSchema.parse({ ...valid, ein: '12345678' })).toThrow();
      expect(() => RescueCreateRequestSchema.parse({ ...valid, ein: '12345678901' })).toThrow();
      expect(() => RescueCreateRequestSchema.parse({ ...valid, ein: '123456789' })).not.toThrow();
    });

    it('rejects descriptions over 1000 chars', () => {
      expect(() =>
        RescueCreateRequestSchema.parse({ ...valid, description: 'x'.repeat(1001) })
      ).toThrow();
    });

    it('rejects an invalid contact email', () => {
      expect(() =>
        RescueCreateRequestSchema.parse({ ...valid, contactEmail: 'not-an-email' })
      ).toThrow();
    });
  });

  describe('RescueUpdateRequestSchema', () => {
    it('accepts an empty update', () => {
      const parsed = RescueUpdateRequestSchema.parse({});
      expect(parsed).toEqual({});
    });

    it('still rejects an invalid email when present', () => {
      expect(() => RescueUpdateRequestSchema.parse({ email: 'foo' })).toThrow();
    });
  });

  describe('AdoptionPolicySchema', () => {
    it('accepts a complete policy', () => {
      const parsed = AdoptionPolicySchema.parse({
        requireHomeVisit: true,
        requireReferences: true,
        minimumReferenceCount: 2,
        adoptionFeeRange: { min: 50, max: 200 },
        requirements: ['No children under 5'],
        returnPolicy: 'Returns accepted within 30 days',
      });
      expect(parsed.adoptionFeeRange?.max).toBe(200);
    });

    it('rejects an inverted fee range', () => {
      expect(() =>
        AdoptionPolicySchema.parse({ adoptionFeeRange: { min: 300, max: 100 } })
      ).toThrow();
    });

    it('rejects minimumReferenceCount outside 0–10', () => {
      expect(() => AdoptionPolicySchema.parse({ minimumReferenceCount: 11 })).toThrow();
    });
  });

  describe('RescueSearchQuerySchema', () => {
    it('coerces query-string ints', () => {
      const parsed = RescueSearchQuerySchema.parse({ page: '2', limit: '10' });
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(10);
    });

    it('clamps limit to 100', () => {
      expect(() => RescueSearchQuerySchema.parse({ limit: '200' })).toThrow();
    });

    it('rejects unknown sortBy values', () => {
      expect(() => RescueSearchQuerySchema.parse({ sortBy: 'mostPopular' })).toThrow();
    });
  });

  describe('Staff schemas', () => {
    it('StaffInvitationRequestSchema requires a valid email', () => {
      expect(() => StaffInvitationRequestSchema.parse({ email: 'foo' })).toThrow();
      expect(() => StaffInvitationRequestSchema.parse({ email: 'a@b.co' })).not.toThrow();
    });

    it('AddStaffMemberRequestSchema requires a userId', () => {
      expect(() => AddStaffMemberRequestSchema.parse({})).toThrow();
      expect(() => AddStaffMemberRequestSchema.parse({ userId: 'u1' })).not.toThrow();
    });
  });

  describe('Verification / rejection / deletion shapes', () => {
    it('cap notes / reason at 500 chars', () => {
      expect(() => RescueVerificationRequestSchema.parse({ notes: 'x'.repeat(501) })).toThrow();
      expect(() => RescueRejectionRequestSchema.parse({ reason: 'x'.repeat(501) })).toThrow();
      expect(() => RescueDeletionRequestSchema.parse({ reason: 'x'.repeat(501) })).toThrow();
    });
  });

  describe('RescueBulkUpdateRequestSchema', () => {
    it('accepts a valid bulk update', () => {
      const parsed = RescueBulkUpdateRequestSchema.parse({
        rescueIds: ['aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbb2'],
        action: 'verify',
      });
      expect(parsed.rescueIds).toHaveLength(2);
    });

    it('rejects a non-UUID id', () => {
      expect(() =>
        RescueBulkUpdateRequestSchema.parse({ rescueIds: ['nope'], action: 'verify' })
      ).toThrow();
    });

    it('rejects an empty rescueIds array', () => {
      expect(() =>
        RescueBulkUpdateRequestSchema.parse({ rescueIds: [], action: 'verify' })
      ).toThrow();
    });

    it('rejects an unknown action', () => {
      expect(() =>
        RescueBulkUpdateRequestSchema.parse({
          rescueIds: ['aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1'],
          action: 'destroy',
        })
      ).toThrow();
    });
  });
});

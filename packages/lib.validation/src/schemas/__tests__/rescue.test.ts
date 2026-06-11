import {
  AdoptionPolicySchema,
  AddStaffMemberRequestSchema,
  CountryCodeSchema,
  RescueBulkUpdateRequestSchema,
  RescueCreateRequestSchema,
  RescueDeletionRequestSchema,
  RescueProfileSchema,
  RescueRegistrationRequestSchema,
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

    it('rejects an invalid Companies House number', () => {
      expect(() =>
        RescueCreateRequestSchema.parse({ ...valid, companiesHouseNumber: '1234567' })
      ).toThrow(); // 7 chars — too short
      expect(() =>
        RescueCreateRequestSchema.parse({ ...valid, companiesHouseNumber: '123456789' })
      ).toThrow(); // 9 chars — too long
      expect(() =>
        RescueCreateRequestSchema.parse({ ...valid, companiesHouseNumber: '12345678' })
      ).not.toThrow(); // exactly 8
    });

    it('rejects an invalid charity registration number', () => {
      expect(() =>
        RescueCreateRequestSchema.parse({ ...valid, charityRegistrationNumber: '123456' })
      ).toThrow(); // 6 digits — too short
      expect(() =>
        RescueCreateRequestSchema.parse({ ...valid, charityRegistrationNumber: '12345678' })
      ).toThrow(); // 8 digits — too long
      expect(() =>
        RescueCreateRequestSchema.parse({ ...valid, charityRegistrationNumber: '1234567' })
      ).not.toThrow(); // exactly 7
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

    describe('settings payload caps (DoS protection)', () => {
      it('accepts an empty settings object', () => {
        expect(() => RescueUpdateRequestSchema.parse({ settings: {} })).not.toThrow();
      });

      it('accepts up to 100 keys', () => {
        const settings = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, 'v']));
        expect(() => RescueUpdateRequestSchema.parse({ settings })).not.toThrow();
      });

      it('rejects more than 100 keys', () => {
        const settings = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`k${i}`, 'v']));
        expect(() => RescueUpdateRequestSchema.parse({ settings })).toThrow();
      });

      it('rejects a string value longer than 5,000 chars', () => {
        expect(() =>
          RescueUpdateRequestSchema.parse({
            settings: { policy: 'x'.repeat(5_001) },
          })
        ).toThrow();
      });

      it('rejects a stringified payload over 100KB', () => {
        const settings = Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`k${i}`, 'x'.repeat(2_500)])
        );
        expect(() => RescueUpdateRequestSchema.parse({ settings })).toThrow();
      });
    });
  });

  describe('RescueProfileSchema.verificationFailureReason', () => {
    const baseProfile = {
      rescueId: 'rescue-1',
      name: 'Happy Tails Rescue',
      email: 'hello@happytails.org',
      address: '1 Lane',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'GB',
      contactPerson: 'Jane Doe',
      status: 'pending' as const,
    };

    it('accepts a reason at the 2,000 char cap', () => {
      expect(() =>
        RescueProfileSchema.parse({
          ...baseProfile,
          verificationFailureReason: 'x'.repeat(2_000),
        })
      ).not.toThrow();
    });

    it('rejects a reason longer than 2,000 chars', () => {
      expect(() =>
        RescueProfileSchema.parse({
          ...baseProfile,
          verificationFailureReason: 'x'.repeat(2_001),
        })
      ).toThrow();
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

  describe('RescueRegistrationRequestSchema', () => {
    const valid = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'Password1!',
      name: 'Happy Tails Rescue',
      rescueEmail: 'hello@happytails.org',
      address: '1 Lane',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'GB',
    };

    it('accepts a minimal valid registration payload', () => {
      const parsed = RescueRegistrationRequestSchema.parse(valid);
      expect(parsed.firstName).toBe('Jane');
      expect(parsed.name).toBe('Happy Tails Rescue');
    });

    it('accepts optional charity and company numbers', () => {
      const parsed = RescueRegistrationRequestSchema.parse({
        ...valid,
        companiesHouseNumber: '12345678',
        charityRegistrationNumber: '1234567',
      });
      expect(parsed.companiesHouseNumber).toBe('12345678');
    });

    it('rejects a weak password', () => {
      expect(() =>
        RescueRegistrationRequestSchema.parse({ ...valid, password: 'short' })
      ).toThrow();
    });

    it('rejects missing first name', () => {
      const { firstName: _, ...rest } = valid;
      expect(() => RescueRegistrationRequestSchema.parse(rest)).toThrow();
    });

    it('rejects missing rescue name', () => {
      const { name: _, ...rest } = valid;
      expect(() => RescueRegistrationRequestSchema.parse(rest)).toThrow();
    });

    it('rejects an invalid email', () => {
      expect(() => RescueRegistrationRequestSchema.parse({ ...valid, email: 'nope' })).toThrow();
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

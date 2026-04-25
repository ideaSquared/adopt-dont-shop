import {
  BulkPetOperationRequestSchema,
  PetCreateRequestSchema,
  PetSearchFiltersSchema,
  PetStatusSchema,
  PetStatusUpdateRequestSchema,
  PetTypeSchema,
  PetUpdateRequestSchema,
  ReportPetRequestSchema,
} from '../pet';

describe('Pet schemas', () => {
  describe('Enum schemas', () => {
    it('PetStatusSchema accepts the canonical states and rejects others', () => {
      expect(PetStatusSchema.parse('available')).toBe('available');
      expect(PetStatusSchema.parse('medical_hold')).toBe('medical_hold');
      expect(() => PetStatusSchema.parse('on_hold')).toThrow();
    });

    it('PetTypeSchema accepts the canonical species', () => {
      expect(PetTypeSchema.parse('dog')).toBe('dog');
      expect(() => PetTypeSchema.parse('hamster')).toThrow();
    });
  });

  describe('PetCreateRequestSchema', () => {
    const valid = {
      name: 'Buddy',
      type: 'dog',
      gender: 'male',
      size: 'large',
      ageGroup: 'adult',
    };

    it('accepts a minimal valid pet', () => {
      const parsed = PetCreateRequestSchema.parse(valid);
      expect(parsed.name).toBe('Buddy');
    });

    it('rejects when name is whitespace-only after trim', () => {
      expect(() => PetCreateRequestSchema.parse({ ...valid, name: '   ' })).toThrow();
    });

    it('clamps ageYears outside 0..30', () => {
      expect(() => PetCreateRequestSchema.parse({ ...valid, ageYears: -1 })).toThrow();
      expect(() => PetCreateRequestSchema.parse({ ...valid, ageYears: 31 })).toThrow();
      expect(() => PetCreateRequestSchema.parse({ ...valid, ageYears: 7 })).not.toThrow();
    });

    it('rejects ageMonths outside 0..11', () => {
      expect(() => PetCreateRequestSchema.parse({ ...valid, ageMonths: 12 })).toThrow();
    });

    it('rejects images without a valid URL', () => {
      expect(() =>
        PetCreateRequestSchema.parse({ ...valid, images: [{ url: 'not-a-url' }] })
      ).toThrow();
    });

    it('rejects descriptions over their bounds', () => {
      expect(() =>
        PetCreateRequestSchema.parse({ ...valid, shortDescription: 'x'.repeat(501) })
      ).toThrow();
      expect(() =>
        PetCreateRequestSchema.parse({ ...valid, longDescription: 'x'.repeat(5001) })
      ).toThrow();
    });
  });

  describe('PetUpdateRequestSchema', () => {
    it('accepts a partial update', () => {
      const parsed = PetUpdateRequestSchema.parse({ name: 'New Name' });
      expect(parsed.name).toBe('New Name');
    });

    it('still rejects invalid enum values on partial input', () => {
      expect(() => PetUpdateRequestSchema.parse({ size: 'huge' })).toThrow();
    });
  });

  describe('birthDate', () => {
    it('coerces ISO date strings to Date in PetCreateRequestSchema', () => {
      const parsed = PetCreateRequestSchema.parse({
        name: 'Buddy',
        type: 'dog',
        gender: 'male',
        size: 'large',
        ageGroup: 'adult',
        birthDate: '2024-04-15',
      });
      expect(parsed.birthDate).toBeInstanceOf(Date);
    });

    it('rejects a future birthDate', () => {
      const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
      expect(() =>
        PetCreateRequestSchema.parse({
          name: 'Buddy',
          type: 'dog',
          gender: 'male',
          size: 'large',
          ageGroup: 'adult',
          birthDate: future,
        })
      ).toThrow(/future/);
    });

    it('accepts isBirthDateEstimate as a boolean flag', () => {
      const parsed = PetCreateRequestSchema.parse({
        name: 'Buddy',
        type: 'dog',
        gender: 'male',
        size: 'large',
        ageGroup: 'adult',
        birthDate: '2024-01-01',
        isBirthDateEstimate: true,
      });
      expect(parsed.isBirthDateEstimate).toBe(true);
    });
  });

  describe('Money columns (adoptionFeeMinor + adoptionFeeCurrency)', () => {
    const valid = {
      name: 'Buddy',
      type: 'dog',
      gender: 'male',
      size: 'large',
      ageGroup: 'adult',
    };

    it('accepts integer minor units + 3-letter currency', () => {
      const parsed = PetCreateRequestSchema.parse({
        ...valid,
        adoptionFeeMinor: 12500,
        adoptionFeeCurrency: 'gbp',
      });
      expect(parsed.adoptionFeeMinor).toBe(12500);
      expect(parsed.adoptionFeeCurrency).toBe('GBP');
    });

    it('rejects non-integer minor units', () => {
      expect(() => PetCreateRequestSchema.parse({ ...valid, adoptionFeeMinor: 12.5 })).toThrow();
    });

    it('rejects negative minor units', () => {
      expect(() => PetCreateRequestSchema.parse({ ...valid, adoptionFeeMinor: -1 })).toThrow();
    });

    it('rejects a non-ISO currency code', () => {
      expect(() =>
        PetCreateRequestSchema.parse({ ...valid, adoptionFeeCurrency: 'pound' })
      ).toThrow();
    });
  });

  describe('PetStatusUpdateRequestSchema', () => {
    it('requires status; reason and notes are optional', () => {
      const parsed = PetStatusUpdateRequestSchema.parse({ status: 'pending' });
      expect(parsed.status).toBe('pending');
    });

    it('coerces effectiveDate strings to Date', () => {
      const parsed = PetStatusUpdateRequestSchema.parse({
        status: 'adopted',
        effectiveDate: '2026-04-15',
      });
      expect(parsed.effectiveDate).toBeInstanceOf(Date);
    });
  });

  describe('PetSearchFiltersSchema', () => {
    it('coerces query-string numerics', () => {
      const parsed = PetSearchFiltersSchema.parse({ ageMin: '2', adoptionFeeMax: '500' });
      expect(parsed.ageMin).toBe(2);
      expect(parsed.adoptionFeeMax).toBe(500);
    });

    it('rejects coordinates outside the valid range', () => {
      expect(() => PetSearchFiltersSchema.parse({ lat: 95 })).toThrow();
      expect(() => PetSearchFiltersSchema.parse({ lng: -181 })).toThrow();
    });

    it('rejects status values outside the canonical enum', () => {
      expect(() => PetSearchFiltersSchema.parse({ status: 'on_hold' })).toThrow();
    });
  });

  describe('ReportPetRequestSchema', () => {
    it('requires a non-empty reason', () => {
      expect(() => ReportPetRequestSchema.parse({ reason: '' })).toThrow();
      expect(() => ReportPetRequestSchema.parse({ reason: 'Mistreatment' })).not.toThrow();
    });

    it('rejects a description longer than 500 chars', () => {
      expect(() =>
        ReportPetRequestSchema.parse({ reason: 'x', description: 'x'.repeat(501) })
      ).toThrow();
    });
  });

  describe('BulkPetOperationRequestSchema', () => {
    it('accepts a valid bulk update', () => {
      const parsed = BulkPetOperationRequestSchema.parse({
        petIds: ['pet-1', 'pet-2'],
        operation: 'archive',
      });
      expect(parsed.petIds).toHaveLength(2);
    });

    it('rejects an empty petIds array', () => {
      expect(() =>
        BulkPetOperationRequestSchema.parse({ petIds: [], operation: 'archive' })
      ).toThrow();
    });

    it('rejects unknown operation values', () => {
      expect(() =>
        BulkPetOperationRequestSchema.parse({ petIds: ['x'], operation: 'destroy' })
      ).toThrow();
    });
  });
});

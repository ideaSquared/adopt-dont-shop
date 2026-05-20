import {
  ApplicationBulkUpdateRequestSchema,
  ApplicationDocumentTypeSchema,
  ApplicationDocumentUploadRequestSchema,
  ApplicationPrioritySchema,
  ApplicationSearchQuerySchema,
  ApplicationStatusSchema,
  ApplicationStatusUpdateRequestSchema,
  CreateApplicationRequestSchema,
  ReferenceStatusSchema,
  ReferenceUpdateRequestSchema,
  UpdateApplicationRequestSchema,
} from '../application';

describe('Application schemas', () => {
  describe('Enum schemas', () => {
    it('ApplicationStatusSchema accepts the canonical states', () => {
      expect(ApplicationStatusSchema.parse('approved')).toBe('approved');
      expect(() => ApplicationStatusSchema.parse('archived')).toThrow();
    });

    it('ApplicationPrioritySchema accepts canonical values', () => {
      expect(ApplicationPrioritySchema.parse('urgent')).toBe('urgent');
      expect(() => ApplicationPrioritySchema.parse('critical')).toThrow();
    });

    it('ReferenceStatusSchema accepts canonical values', () => {
      expect(ReferenceStatusSchema.parse('verified')).toBe('verified');
      expect(() => ReferenceStatusSchema.parse('approved')).toThrow();
    });

    it('ApplicationDocumentTypeSchema rejects unknown types', () => {
      expect(ApplicationDocumentTypeSchema.parse('REFERENCE')).toBe('REFERENCE');
      expect(() => ApplicationDocumentTypeSchema.parse('PASSPORT')).toThrow();
    });
  });

  describe('CreateApplicationRequestSchema', () => {
    const validReference = {
      name: 'Jane Doe',
      relationship: 'Friend',
      phone: '07700900123',
    };
    const valid = {
      petId: 'pet-1',
      answers: { livingSituation: 'house' },
      references: [validReference],
    };

    it('accepts a minimal valid create payload', () => {
      const parsed = CreateApplicationRequestSchema.parse(valid);
      expect(parsed.petId).toBe('pet-1');
      expect(parsed.references).toHaveLength(1);
    });

    it('rejects more than 5 references', () => {
      expect(() =>
        CreateApplicationRequestSchema.parse({
          ...valid,
          references: Array.from({ length: 6 }, () => validReference),
        })
      ).toThrow();
    });

    it('rejects a reference name shorter than 2 chars', () => {
      expect(() =>
        CreateApplicationRequestSchema.parse({
          ...valid,
          references: [{ ...validReference, name: 'X' }],
        })
      ).toThrow();
    });

    it('rejects an invalid reference phone', () => {
      expect(() =>
        CreateApplicationRequestSchema.parse({
          ...valid,
          references: [{ ...validReference, phone: '12' }],
        })
      ).toThrow();
    });

    it('strips whitespace and separators from reference phones', () => {
      const parsed = CreateApplicationRequestSchema.parse({
        ...valid,
        references: [{ ...validReference, phone: '+44 (20) 7946-0958' }],
      });
      expect(parsed.references?.[0].phone).toBe('+442079460958');
    });

    it('coerces priority and rejects unknown values', () => {
      expect(() =>
        CreateApplicationRequestSchema.parse({ ...valid, priority: 'urgent' })
      ).not.toThrow();
      expect(() =>
        CreateApplicationRequestSchema.parse({ ...valid, priority: 'critical' })
      ).toThrow();
    });
  });

  describe('UpdateApplicationRequestSchema', () => {
    it('accepts a partial update', () => {
      const parsed = UpdateApplicationRequestSchema.parse({ notes: 'Hi' });
      expect(parsed.notes).toBe('Hi');
    });

    it('rejects a score outside 0–100', () => {
      expect(() => UpdateApplicationRequestSchema.parse({ score: 101 })).toThrow();
      expect(() => UpdateApplicationRequestSchema.parse({ score: -1 })).toThrow();
    });
  });

  describe('ApplicationStatusUpdateRequestSchema', () => {
    it('requires status', () => {
      expect(() => ApplicationStatusUpdateRequestSchema.parse({})).toThrow();
      expect(() =>
        ApplicationStatusUpdateRequestSchema.parse({ status: 'approved' })
      ).not.toThrow();
    });

    it('rejects a too-short rejection reason', () => {
      expect(() =>
        ApplicationStatusUpdateRequestSchema.parse({
          status: 'rejected',
          rejectionReason: 'no',
        })
      ).toThrow();
      expect(() =>
        ApplicationStatusUpdateRequestSchema.parse({
          status: 'rejected',
          rejectionReason: 'Insufficient references provided',
        })
      ).not.toThrow();
    });

    it('coerces followUpDate strings to Date', () => {
      const parsed = ApplicationStatusUpdateRequestSchema.parse({
        status: 'approved',
        followUpDate: '2026-05-01',
      });
      expect(parsed.followUpDate).toBeInstanceOf(Date);
    });
  });

  describe('ReferenceUpdateRequestSchema', () => {
    it('accepts reference_index + status', () => {
      const parsed = ReferenceUpdateRequestSchema.parse({
        reference_index: 0,
        status: 'contacted',
      });
      expect(parsed.reference_index).toBe(0);
    });

    it('accepts referenceId + status', () => {
      const parsed = ReferenceUpdateRequestSchema.parse({
        referenceId: 'ref-2',
        status: 'verified',
      });
      expect(parsed.referenceId).toBe('ref-2');
    });

    it('rejects when neither identifier is present', () => {
      expect(() => ReferenceUpdateRequestSchema.parse({ status: 'pending' })).toThrow();
    });

    it('rejects a referenceId not in the ref-N form', () => {
      expect(() =>
        ReferenceUpdateRequestSchema.parse({ referenceId: 'reference-2', status: 'pending' })
      ).toThrow();
    });

    it('rejects a reference_index outside 0–4', () => {
      expect(() =>
        ReferenceUpdateRequestSchema.parse({ reference_index: 5, status: 'pending' })
      ).toThrow();
    });
  });

  describe('ApplicationDocumentUploadRequestSchema', () => {
    it('accepts a known document type', () => {
      const parsed = ApplicationDocumentUploadRequestSchema.parse({
        documentType: 'VETERINARY_RECORD',
      });
      expect(parsed.documentType).toBe('VETERINARY_RECORD');
    });

    it('accepts an empty body (documentType is optional)', () => {
      expect(() => ApplicationDocumentUploadRequestSchema.parse({})).not.toThrow();
    });

    it('rejects an unknown document type', () => {
      expect(() =>
        ApplicationDocumentUploadRequestSchema.parse({ documentType: 'CONTRACT' })
      ).toThrow();
    });
  });

  describe('ApplicationSearchQuerySchema', () => {
    it('coerces query-string ints', () => {
      const parsed = ApplicationSearchQuerySchema.parse({ page: '3', limit: '25' });
      expect(parsed.page).toBe(3);
      expect(parsed.limit).toBe(25);
    });

    it('rejects an unknown sortBy', () => {
      expect(() => ApplicationSearchQuerySchema.parse({ sortBy: 'random' })).toThrow();
    });

    it('rejects scores outside 0–100', () => {
      expect(() => ApplicationSearchQuerySchema.parse({ score_min: -1 })).toThrow();
      expect(() => ApplicationSearchQuerySchema.parse({ score_max: 101 })).toThrow();
    });

    // ADS-575: the rescue dashboard filters (pet type, pet breed, date
    // window) must round-trip through the canonical query schema or the
    // backend rejects them as unknown.
    it('accepts the new pet-type / pet-breed filters', () => {
      const parsed = ApplicationSearchQuerySchema.parse({
        petType: 'Dog',
        petBreed: 'Golden Retriever',
      });
      expect(parsed.petType).toBe('Dog');
      expect(parsed.petBreed).toBe('Golden Retriever');
    });

    it('coerces submittedFrom / submittedTo strings to Date', () => {
      const parsed = ApplicationSearchQuerySchema.parse({
        submittedFrom: '2026-05-01T00:00:00.000Z',
        submittedTo: '2026-05-08T00:00:00.000Z',
      });
      expect(parsed.submittedFrom).toBeInstanceOf(Date);
      expect(parsed.submittedTo).toBeInstanceOf(Date);
    });

    it('rejects an empty petType / petBreed string', () => {
      expect(() => ApplicationSearchQuerySchema.parse({ petType: '' })).toThrow();
      expect(() => ApplicationSearchQuerySchema.parse({ petBreed: '   ' })).toThrow();
    });
  });

  describe('ApplicationBulkUpdateRequestSchema', () => {
    const someUuid = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1';

    it('accepts a valid bulk update', () => {
      const parsed = ApplicationBulkUpdateRequestSchema.parse({
        applicationIds: [someUuid],
        updates: { priority: 'high' },
      });
      expect(parsed.applicationIds).toHaveLength(1);
    });

    it('rejects an empty applicationIds array', () => {
      expect(() =>
        ApplicationBulkUpdateRequestSchema.parse({
          applicationIds: [],
          updates: { priority: 'high' },
        })
      ).toThrow();
    });

    it('rejects a non-UUID application id', () => {
      expect(() =>
        ApplicationBulkUpdateRequestSchema.parse({
          applicationIds: ['not-a-uuid'],
          updates: { priority: 'high' },
        })
      ).toThrow();
    });

    it('rejects an empty updates object', () => {
      expect(() =>
        ApplicationBulkUpdateRequestSchema.parse({ applicationIds: [someUuid], updates: {} })
      ).toThrow();
    });
  });
});

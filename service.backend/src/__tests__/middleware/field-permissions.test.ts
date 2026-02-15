import { describe, it, expect } from 'vitest';
import { maskResponseFields } from '../../middleware/field-permissions';
describe('Field Permissions Middleware - maskResponseFields', () => {
  const adminAccessMap: Record<string, string> = {
    userId: 'read',
    firstName: 'write',
    lastName: 'write',
    email: 'write',
    status: 'write',
    password: 'none',
    resetToken: 'none',
    twoFactorSecret: 'none',
  };

  const adopterAccessMap: Record<string, string> = {
    userId: 'read',
    firstName: 'read',
    lastName: 'read',
    email: 'none',
    status: 'none',
    password: 'none',
    resetToken: 'none',
    twoFactorSecret: 'none',
  };

  describe('read masking', () => {
    it('should include readable and writable fields for admin', () => {
      const data = {
        userId: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        status: 'active',
        password: 'hashed123',
        resetToken: 'tok-123',
        twoFactorSecret: 'secret',
      };

      const masked = maskResponseFields(data, adminAccessMap, 'read');

      expect(masked).toEqual({
        userId: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        status: 'active',
      });
      expect(masked).not.toHaveProperty('password');
      expect(masked).not.toHaveProperty('resetToken');
      expect(masked).not.toHaveProperty('twoFactorSecret');
    });

    it('should restrict fields for adopter role', () => {
      const data = {
        userId: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        status: 'active',
        password: 'hashed123',
      };

      const masked = maskResponseFields(data, adopterAccessMap, 'read');

      expect(masked).toEqual({
        userId: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
      });
      expect(masked).not.toHaveProperty('email');
      expect(masked).not.toHaveProperty('status');
      expect(masked).not.toHaveProperty('password');
    });

    it('should exclude fields not in the access map (secure by default)', () => {
      const data = {
        userId: 'user-1',
        firstName: 'Jane',
        unknownField: 'should be removed',
      };

      const masked = maskResponseFields(data, adminAccessMap, 'read');

      expect(masked).toHaveProperty('userId');
      expect(masked).toHaveProperty('firstName');
      expect(masked).not.toHaveProperty('unknownField');
    });
  });

  describe('write masking', () => {
    it('should only include writable fields for admin', () => {
      const data = {
        userId: 'attempt-change',
        firstName: 'Updated',
        email: 'new@email.com',
        password: 'newpass',
      };

      const masked = maskResponseFields(data, adminAccessMap, 'write');

      expect(masked).toEqual({
        firstName: 'Updated',
        email: 'new@email.com',
      });
      expect(masked).not.toHaveProperty('userId');
      expect(masked).not.toHaveProperty('password');
    });

    it('should return empty object for adopter write attempt on user fields', () => {
      const data = {
        firstName: 'Changed',
        email: 'new@email.com',
      };

      const masked = maskResponseFields(data, adopterAccessMap, 'write');

      expect(Object.keys(masked)).toHaveLength(0);
    });
  });

  describe('application field masking scenarios', () => {
    const staffAccessMap: Record<string, string> = {
      applicationId: 'read',
      userId: 'read',
      status: 'write',
      answers: 'read',
      interviewNotes: 'write',
      homeVisitNotes: 'write',
      score: 'write',
    };

    const applicantAccessMap: Record<string, string> = {
      applicationId: 'read',
      userId: 'read',
      status: 'read',
      answers: 'read',
      interviewNotes: 'none',
      homeVisitNotes: 'none',
      score: 'none',
    };

    it('should show all application fields to rescue staff including internal notes', () => {
      const application = {
        applicationId: 'app-1',
        userId: 'user-1',
        status: 'reviewing',
        answers: { q1: 'yes' },
        interviewNotes: 'Seems like a great fit',
        homeVisitNotes: 'Clean home, large yard',
        score: 92,
      };

      const masked = maskResponseFields(application, staffAccessMap, 'read');

      expect(masked).toHaveProperty('interviewNotes');
      expect(masked).toHaveProperty('homeVisitNotes');
      expect(masked).toHaveProperty('score');
      expect(masked).toHaveProperty('applicationId');
      expect(masked).toHaveProperty('status');
    });

    it('should hide internal application notes from applicants', () => {
      const application = {
        applicationId: 'app-1',
        userId: 'user-1',
        status: 'reviewing',
        answers: { q1: 'yes' },
        interviewNotes: 'Seems like a great fit',
        homeVisitNotes: 'Clean home, large yard',
        score: 92,
      };

      const masked = maskResponseFields(application, applicantAccessMap, 'read');

      expect(masked).toHaveProperty('applicationId');
      expect(masked).toHaveProperty('status');
      expect(masked).toHaveProperty('answers');
      expect(masked).not.toHaveProperty('interviewNotes');
      expect(masked).not.toHaveProperty('homeVisitNotes');
      expect(masked).not.toHaveProperty('score');
    });

    it('should allow staff to write internal notes but not change applicationId', () => {
      const updateData = {
        applicationId: 'attempt-change',
        interviewNotes: 'Updated notes',
        score: 95,
      };

      const masked = maskResponseFields(updateData, staffAccessMap, 'write');

      expect(masked).not.toHaveProperty('applicationId');
      expect(masked).toHaveProperty('interviewNotes', 'Updated notes');
      expect(masked).toHaveProperty('score', 95);
    });
  });

  describe('pet field masking scenarios', () => {
    const publicPetMap: Record<string, string> = {
      petId: 'read',
      name: 'read',
      type: 'read',
      breed: 'read',
      description: 'read',
      medicalHistory: 'none',
      internalNotes: 'none',
    };

    it('should show basic pet info but hide medical details from public', () => {
      const pet = {
        petId: 'pet-1',
        name: 'Buddy',
        type: 'dog',
        breed: 'Labrador',
        description: 'Friendly and energetic',
        medicalHistory: 'Heart condition - requires medication',
        internalNotes: 'Previous owner reported aggression',
      };

      const masked = maskResponseFields(pet, publicPetMap, 'read');

      expect(masked).toHaveProperty('name', 'Buddy');
      expect(masked).toHaveProperty('description');
      expect(masked).not.toHaveProperty('medicalHistory');
      expect(masked).not.toHaveProperty('internalNotes');
    });
  });

  describe('edge cases', () => {
    it('should handle empty data objects', () => {
      const masked = maskResponseFields({}, adminAccessMap, 'read');
      expect(masked).toEqual({});
    });

    it('should handle data with only hidden fields', () => {
      const data = { password: 'secret', resetToken: 'tok' };
      const masked = maskResponseFields(data, adminAccessMap, 'read');
      expect(masked).toEqual({});
    });

    it('should handle empty access map', () => {
      const data = { userId: '1', firstName: 'Jane' };
      const masked = maskResponseFields(data, {}, 'read');
      expect(masked).toEqual({});
    });

    it('should preserve null and undefined values in accessible fields', () => {
      const data: Record<string, unknown> = {
        userId: 'user-1',
        firstName: null,
        lastName: undefined,
      };

      const masked = maskResponseFields(data, adminAccessMap, 'read');

      expect(masked).toHaveProperty('userId');
      expect(masked).toHaveProperty('firstName', null);
      expect(masked).toHaveProperty('lastName', undefined);
    });

    it('should preserve nested objects in accessible fields', () => {
      const accessMap = { settings: 'read' };
      const data = {
        settings: { theme: 'dark', notifications: true },
      };

      const masked = maskResponseFields(data, accessMap, 'read');

      expect(masked).toEqual({
        settings: { theme: 'dark', notifications: true },
      });
    });

    it('should handle arrays in field values correctly', () => {
      const accessMap = { tags: 'read', secret: 'none' };
      const data = {
        tags: ['friendly', 'trained'],
        secret: ['hidden'],
      };

      const masked = maskResponseFields(data, accessMap, 'read');

      expect(masked).toHaveProperty('tags');
      expect(masked).not.toHaveProperty('secret');
    });
  });
});

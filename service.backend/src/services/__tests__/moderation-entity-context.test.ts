import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import moderationService from '../moderation.service';
import Report, { ReportStatus, ReportCategory, ReportSeverity } from '../../models/Report';
import User from '../../models/User';
import Pet from '../../models/Pet';

describe('ModerationService - Entity Context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enrichReportsWithEntityContext', () => {
    it('should add user context to reports about users', async () => {
      // Arrange
      const mockReport = {
        reportId: 'report-1',
        reporterId: 'reporter-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-123',
        category: ReportCategory.HARASSMENT,
        severity: ReportSeverity.HIGH,
        status: ReportStatus.PENDING,
        title: 'Harassment Report',
        description: 'User is harassing others',
      };

      const mockUser = {
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        userType: 'adopter',
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const enriched = await moderationService.enrichReportsWithEntityContext([mockReport]);

      // Assert
      expect(User.findByPk).toHaveBeenCalledWith('user-123');
      expect(enriched[0]).toHaveProperty('entityContext');
      expect(enriched[0].entityContext).toEqual({
        type: 'user',
        id: 'user-123',
        displayName: 'John Doe',
        email: 'john@example.com',
        userType: 'adopter',
      });
    });

    it('should add pet context to reports about pets', async () => {
      // Arrange
      const mockReport = {
        reportId: 'report-2',
        reporterId: 'reporter-1',
        reportedEntityType: 'pet',
        reportedEntityId: 'pet-456',
        category: ReportCategory.ANIMAL_WELFARE,
        severity: ReportSeverity.CRITICAL,
        status: ReportStatus.PENDING,
        title: 'Animal Welfare Concern',
        description: 'Pet listing shows signs of abuse',
      };

      const mockPet = {
        petId: 'pet-456',
        name: 'Max',
        type: 'dog',
        breed: 'Golden Retriever',
        rescueId: 'rescue-1',
      };

      (Pet.findByPk as jest.Mock).mockResolvedValue(mockPet);

      // Act
      const enriched = await moderationService.enrichReportsWithEntityContext([mockReport]);

      // Assert
      expect(Pet.findByPk).toHaveBeenCalledWith('pet-456');
      expect(enriched[0].entityContext).toEqual({
        type: 'pet',
        id: 'pet-456',
        displayName: 'Max',
        petType: 'dog',
        breed: 'Golden Retriever',
        rescueId: 'rescue-1',
      });
    });

    it('should handle missing entities gracefully', async () => {
      // Arrange
      const mockReport = {
        reportId: 'report-3',
        reporterId: 'reporter-1',
        reportedEntityType: 'user',
        reportedEntityId: 'deleted-user-123',
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        status: ReportStatus.PENDING,
        title: 'Spam Report',
        description: 'User posting spam',
      };

      (User.findByPk as jest.Mock).mockResolvedValue(null);

      // Act
      const enriched = await moderationService.enrichReportsWithEntityContext([mockReport]);

      // Assert
      expect(enriched[0].entityContext).toEqual({
        type: 'user',
        id: 'deleted-user-123',
        displayName: '[Deleted User]',
        deleted: true,
      });
    });

    it('should enrich multiple reports efficiently', async () => {
      // Arrange
      const mockReports = [
        {
          reportId: 'report-1',
          reportedEntityType: 'user',
          reportedEntityId: 'user-1',
          category: ReportCategory.SPAM,
          severity: ReportSeverity.LOW,
          status: ReportStatus.PENDING,
        },
        {
          reportId: 'report-2',
          reportedEntityType: 'user',
          reportedEntityId: 'user-1', // Same user
          category: ReportCategory.HARASSMENT,
          severity: ReportSeverity.MEDIUM,
          status: ReportStatus.PENDING,
        },
        {
          reportId: 'report-3',
          reportedEntityType: 'pet',
          reportedEntityId: 'pet-1',
          category: ReportCategory.ANIMAL_WELFARE,
          severity: ReportSeverity.HIGH,
          status: ReportStatus.PENDING,
        },
      ];

      const mockUser = {
        userId: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      };

      const mockPet = {
        petId: 'pet-1',
        name: 'Fluffy',
        type: 'cat',
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (Pet.findByPk as jest.Mock).mockResolvedValue(mockPet);

      // Act
      const enriched = await moderationService.enrichReportsWithEntityContext(mockReports);

      // Assert
      // Should only fetch user-1 once (cached)
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      expect(Pet.findByPk).toHaveBeenCalledTimes(1);
      expect(enriched).toHaveLength(3);
      expect(enriched[0].entityContext.displayName).toBe('Test User');
      expect(enriched[1].entityContext.displayName).toBe('Test User');
      expect(enriched[2].entityContext.displayName).toBe('Fluffy');
    });
  });

  describe('getReportsWithContext', () => {
    it('should return reports enriched with entity context', async () => {
      // Arrange
      const mockReports = [
        {
          reportId: 'report-1',
          reportedEntityType: 'user',
          reportedEntityId: 'user-123',
          category: ReportCategory.SPAM,
          severity: ReportSeverity.LOW,
          status: ReportStatus.PENDING,
          title: 'Test Report',
          description: 'Test description',
        },
      ];

      const mockUser = {
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      // Mock the getReports method
      jest.spyOn(moderationService, 'getReports').mockResolvedValue({
        reports: mockReports,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await moderationService.getReportsWithContext({}, { page: 1, limit: 20 });

      // Assert
      expect(result.reports[0]).toHaveProperty('entityContext');
      expect(result.reports[0].entityContext.displayName).toBe('John Doe');
    });
  });
});

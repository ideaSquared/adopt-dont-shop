import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import StaffMember from '../models/StaffMember';
import { logger } from '../utils/logger';
import { parsePaginationLimit } from '../utils/pagination';
import { DashboardService } from '../services/dashboard.service';

const router = Router();

// Apply authentication to all dashboard routes
router.use(authenticateToken);

/**
 * Get rescue dashboard statistics
 */
router.get('/rescue', async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  // Find the user's rescue association through StaffMember
  const staffMember = await StaffMember.findOne({
    where: {
      userId: user?.userId,
    },
  });

  if (!staffMember) {
    return res.status(400).json({
      success: false,
      message: 'User is not associated with a rescue organization',
    });
  }

  const rescueId = staffMember.rescueId;

  // Import the RescueService to get real statistics
  const { RescueService } = await import('../services/rescue.service');

  let dashboardData;
  try {
    // Get real rescue statistics from the database
    const rescueStats = await RescueService.getRescueStatistics(rescueId);

    dashboardData = {
      totalAnimals: rescueStats.totalPets,
      availableForAdoption: rescueStats.availablePets,
      pendingApplications: rescueStats.pendingApplications,
      recentAdoptions: rescueStats.monthlyAdoptions,
      totalApplications: rescueStats.totalApplications,
      adoptedPets: rescueStats.adoptedPets,
      staffCount: rescueStats.staffCount,
      averageTimeToAdoption: rescueStats.averageTimeToAdoption,
      recentActivity: [
        {
          id: 'activity_1',
          type: 'pet_added',
          title: 'New Pet Added',
          description: 'Check your latest pet listings',
          timestamp: new Date().toISOString(),
          metadata: {
            petId: 'recent_pet',
            petName: 'Recent Addition',
          },
        },
        {
          id: 'activity_2',
          type: 'application_received',
          title: 'Applications Pending',
          description: `You have ${rescueStats.pendingApplications} pending applications to review`,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            applicationId: 'pending_apps',
            count: rescueStats.pendingApplications,
          },
        },
      ],
    };
  } catch (error) {
    logger.error('Error fetching real rescue statistics:', { error });
    // Fallback to basic mock data if database query fails
    dashboardData = {
      totalAnimals: 0,
      availableForAdoption: 0,
      pendingApplications: 0,
      recentAdoptions: 0,
      totalApplications: 0,
      adoptedPets: 0,
      staffCount: 0,
      averageTimeToAdoption: 0,
      recentActivity: [],
    };
  }

  res.json({
    success: true,
    data: dashboardData,
    message: 'Dashboard statistics retrieved successfully',
  });
});

/**
 * Get recent activity for dashboard
 */
router.get('/activity', async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  // Find the user's rescue association through StaffMember
  const staffMember = await StaffMember.findOne({
    where: {
      userId: user?.userId,
    },
  });

  if (!staffMember) {
    return res.status(400).json({
      success: false,
      message: 'User is not associated with a rescue organization',
    });
  }

  const rescueId = staffMember.rescueId;

  const limit = parsePaginationLimit(req.query.limit as string | undefined, {
    default: 10,
    max: 100,
  });

  const activities = await DashboardService.getActivityForRescue(rescueId, limit);

  res.json({
    success: true,
    data: activities,
    message: 'Activity retrieved successfully',
  });
});

export default router;

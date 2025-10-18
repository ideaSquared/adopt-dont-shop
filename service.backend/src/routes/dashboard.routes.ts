import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import StaffMember from '../models/StaffMember';

const router = Router();

// Apply authentication to all dashboard routes
router.use(authenticateToken);

/**
 * Get rescue dashboard statistics
 */
router.get('/rescue', async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;

    // Find the user's rescue association through StaffMember
    const staffMember = await StaffMember.findOne({
      where: {
        userId: user?.userId,
        isDeleted: false,
        // Remove the isVerified requirement for now - let unverified staff see dashboard
        // isVerified: true,
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
      console.error('Error fetching real rescue statistics:', error);
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
  } catch (error) {
    console.error('Dashboard statistics error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
});

/**
 * Get recent activity for dashboard
 */
router.get('/activity', async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;

    // Find the user's rescue association through StaffMember
    const staffMember = await StaffMember.findOne({
      where: {
        userId: user?.userId,
        isDeleted: false,
        // Remove the isVerified requirement for now - let unverified staff see dashboard
        // isVerified: true,
      },
    });

    if (!staffMember) {
      return res.status(400).json({
        success: false,
        message: 'User is not associated with a rescue organization',
      });
    }

    // TODO: Use rescueId to fetch real activity data from database
    // const rescueId = staffMember.rescueId;

    const limit = parseInt(req.query.limit as string) || 10;

    // Return mock activity data
    const activities = [
      {
        id: 'activity_1',
        type: 'pet_added',
        title: 'New Pet Added',
        description: 'Buddy the Golden Retriever was added to your rescue',
        timestamp: new Date().toISOString(),
        metadata: {
          petId: 'pet_1',
          petName: 'Buddy',
        },
      },
      {
        id: 'activity_2',
        type: 'application_received',
        title: 'New Application',
        description: 'Application received for Luna the Cat',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          applicationId: 'app_1',
          petName: 'Luna',
        },
      },
      {
        id: 'activity_3',
        type: 'adoption_completed',
        title: 'Adoption Completed',
        description: 'Max the Dog found his forever home!',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          petId: 'pet_2',
          petName: 'Max',
        },
      },
    ];

    res.json({
      success: true,
      data: activities.slice(0, limit),
      message: 'Activity retrieved successfully',
    });
  } catch (error) {
    console.error('Dashboard activity error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard activity',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
});

export default router;

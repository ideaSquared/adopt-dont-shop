import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// Apply authentication to all dashboard routes
router.use(authenticateToken);

/**
 * Get rescue dashboard statistics
 */
router.get('/rescue', async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;
    const rescueId = user?.rescueId;

    if (!rescueId) {
      return res.status(400).json({
        success: false,
        message: 'User is not associated with a rescue organization',
      });
    }

    // For now, return mock data until we implement the full statistics
    const dashboardData = {
      totalAnimals: 12,
      availableForAdoption: 8,
      pendingApplications: 3,
      recentAdoptions: 2,
      recentActivity: [
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
      ],
    };

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
    const rescueId = user?.rescueId;

    if (!rescueId) {
      return res.status(400).json({
        success: false,
        message: 'User is not associated with a rescue organization',
      });
    }

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

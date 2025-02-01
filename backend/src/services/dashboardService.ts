import { Op } from 'sequelize'
import { Application, AuditLog, Pet, Rescue, User } from '../Models'
import sequelize from '../sequelize'
import { AdminDashboardData, RescueDashboardData } from '../types/dashboard'

export const getRescueDashboardData = async (
  rescueId: string,
): Promise<RescueDashboardData> => {
  // Get total pets and their status distribution
  const totalPets = await Pet.count({
    where: {
      owner_id: rescueId,
    },
  })

  // Get adoption metrics
  const successfulAdoptions = await Application.count({
    where: {
      pet_id: {
        [Op.in]: sequelize.literal(
          `(SELECT pet_id FROM pets WHERE owner_id = '${rescueId}')`,
        ),
      },
      status: 'approved',
    },
  })

  const pendingApplications = await Application.count({
    where: {
      pet_id: {
        [Op.in]: sequelize.literal(
          `(SELECT pet_id FROM pets WHERE owner_id = '${rescueId}')`,
        ),
      },
      status: 'pending',
    },
  })

  // Get application response metrics
  const [totalApplications, avgResponseTime] = await Promise.all([
    Application.count({
      where: {
        pet_id: {
          [Op.in]: sequelize.literal(
            `(SELECT pet_id FROM pets WHERE owner_id = '${rescueId}')`,
          ),
        },
      },
    }),
    Application.findAll({
      where: {
        pet_id: {
          [Op.in]: sequelize.literal(
            `(SELECT pet_id FROM pets WHERE owner_id = '${rescueId}')`,
          ),
        },
        status: ['approved', 'rejected'],
      },
      attributes: [
        [
          sequelize.fn(
            'AVG',
            sequelize.fn(
              'EXTRACT',
              sequelize.literal('EPOCH FROM (updated_at - created_at)'),
            ),
          ),
          'avg_response_time',
        ],
      ],
    }).then((result) => {
      const avgSeconds = Number(result[0].get('avg_response_time')) || 0
      return Math.round(avgSeconds / 3600) // Convert to hours
    }),
  ])

  // Get monthly adoptions for the last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const adoptions = await Application.findAll({
    where: {
      pet_id: {
        [Op.in]: sequelize.literal(
          `(SELECT pet_id FROM pets WHERE owner_id = '${rescueId}')`,
        ),
      },
      status: 'approved',
      created_at: {
        [Op.gte]: sixMonthsAgo,
      },
    },
    attributes: [
      [
        sequelize.fn('date_trunc', 'month', sequelize.col('created_at')),
        'month',
      ],
      [sequelize.fn('count', '*'), 'count'],
    ],
    group: [sequelize.fn('date_trunc', 'month', sequelize.col('created_at'))],
    order: [
      [sequelize.fn('date_trunc', 'month', sequelize.col('created_at')), 'ASC'],
    ],
  })

  const monthlyAdoptions = adoptions.map((adoption) => ({
    month: new Date(adoption.get('month') as Date).toLocaleString('default', {
      month: 'short',
    }),
    adoptions: Number(adoption.get('count')),
  }))

  // Get pet status distribution
  const petStatuses = await Pet.findAll({
    where: { owner_id: rescueId },
    attributes: ['status', [sequelize.fn('count', '*'), 'count']],
    group: ['status'],
  })

  const petStatusDistribution = petStatuses.map((status) => ({
    name: String(status.get('status')),
    value: Number(status.get('count')),
  }))

  // Get pet type distribution
  const petTypes = await Pet.findAll({
    where: { owner_id: rescueId },
    attributes: ['type', [sequelize.fn('count', '*'), 'count']],
    group: ['type'],
  })

  const petTypeDistribution = petTypes.map((type) => ({
    name: String(type.get('type')),
    value: Number(type.get('count')),
  }))

  // Calculate adoption rate
  const adoptionRate =
    totalApplications > 0
      ? ((successfulAdoptions / totalApplications) * 100).toFixed(1)
      : '0'

  return {
    totalPets: Number(totalPets),
    successfulAdoptions: Number(successfulAdoptions),
    pendingApplications: Number(pendingApplications),
    averageRating: 0, // Removed as Rating model doesn't have rating field
    monthlyAdoptions,
    petStatusDistribution,
    // New metrics
    petTypeDistribution,
    totalApplications: Number(totalApplications),
    adoptionRate: Number(adoptionRate),
    averageResponseTime: avgResponseTime,
  }
}

export const getAdminDashboardData = async (): Promise<AdminDashboardData> => {
  const totalUsers = await User.count()

  const currentMonth = new Date()
  currentMonth.setMonth(currentMonth.getMonth())
  const monthlyAdoptions = await Application.count({
    where: {
      status: 'approved',
      updated_at: {
        [Op.gte]: currentMonth,
      },
    },
  })

  // Platform metrics for the last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const userGrowth = await User.findAll({
    where: {
      created_at: {
        [Op.gte]: sixMonthsAgo,
      },
    },
    attributes: [
      [
        sequelize.fn('date_trunc', 'month', sequelize.col('created_at')),
        'date',
      ],
      [sequelize.fn('count', '*'), 'count'],
    ],
    group: [sequelize.fn('date_trunc', 'month', sequelize.col('created_at'))],
    order: [
      [sequelize.fn('date_trunc', 'month', sequelize.col('created_at')), 'ASC'],
    ],
  })

  const adoptionGrowth = await Application.findAll({
    where: {
      status: 'approved',
      created_at: {
        [Op.gte]: sixMonthsAgo,
      },
    },
    attributes: [
      [
        sequelize.fn('date_trunc', 'month', sequelize.col('created_at')),
        'date',
      ],
      [sequelize.fn('count', '*'), 'count'],
    ],
    group: [sequelize.fn('date_trunc', 'month', sequelize.col('created_at'))],
    order: [
      [sequelize.fn('date_trunc', 'month', sequelize.col('created_at')), 'ASC'],
    ],
  })

  const rescueGrowth = await Rescue.findAll({
    where: {
      created_at: {
        [Op.gte]: sixMonthsAgo,
      },
    },
    attributes: [
      [
        sequelize.fn('date_trunc', 'month', sequelize.col('created_at')),
        'date',
      ],
      [sequelize.fn('count', '*'), 'count'],
    ],
    group: [sequelize.fn('date_trunc', 'month', sequelize.col('created_at'))],
    order: [
      [sequelize.fn('date_trunc', 'month', sequelize.col('created_at')), 'ASC'],
    ],
  })

  // Get platform-wide metrics
  const [totalPets, totalApplications, totalAdoptions] = await Promise.all([
    Pet.count(),
    Application.count(),
    Application.count({ where: { status: 'approved' } }),
  ])

  // Calculate platform-wide adoption rate
  const platformAdoptionRate =
    totalApplications > 0
      ? ((totalAdoptions / totalApplications) * 100).toFixed(1)
      : '0'

  // Get average response time for applications platform-wide
  const avgPlatformResponseTime = await Application.findAll({
    where: {
      status: ['approved', 'rejected'],
    },
    attributes: [
      [
        sequelize.fn(
          'AVG',
          sequelize.fn(
            'EXTRACT',
            sequelize.literal('EPOCH FROM (updated_at - created_at)'),
          ),
        ),
        'avg_response_time',
      ],
    ],
  }).then((result) => {
    const avgSeconds = Number(result[0].get('avg_response_time')) || 0
    return Math.round(avgSeconds / 3600) // Convert to hours
  })

  // Combine the growth metrics
  const platformMetrics = userGrowth.map((ug, index) => ({
    date: new Date(ug.get('date') as Date).toLocaleString('default', {
      month: 'short',
    }),
    users: Number(ug.get('count')),
    adoptions: Number(adoptionGrowth[index]?.get('count') || 0),
    rescues: Number(rescueGrowth[index]?.get('count') || 0),
  }))

  // Get user distribution using roles association
  const [regularUsers, rescueOrgs, rescueStaff, admins, verifiedUsers] =
    await Promise.all([
      User.count({
        include: [
          {
            association: User.associations.Roles,
            where: { role_name: 'user' },
          },
        ],
      }),
      User.count({
        include: [
          {
            association: User.associations.Roles,
            where: { role_name: 'rescue_manager' },
          },
        ],
      }),
      User.count({
        include: [
          {
            association: User.associations.Roles,
            where: { role_name: 'staff' },
          },
        ],
      }),
      User.count({
        include: [
          {
            association: User.associations.Roles,
            where: { role_name: 'admin' },
          },
        ],
      }),
      User.count({
        include: [
          {
            association: User.associations.Roles,
            where: { role_name: 'verified_user' },
          },
        ],
      }),
    ])

  const userDistribution = [
    { name: 'Regular Users', value: Number(regularUsers) },
    { name: 'Verified Users', value: Number(verifiedUsers) },
    { name: 'Rescue Organizations', value: Number(rescueOrgs) },
    { name: 'Rescue Staff', value: Number(rescueStaff) },
    { name: 'Administrators', value: Number(admins) },
  ]

  // Get recent activity from audit logs
  const recentActivity = await AuditLog.findAll({
    limit: 10,
    order: [['timestamp', 'DESC']],
    attributes: ['action', 'category', 'timestamp', 'level'],
  })

  return {
    totalUsers: Number(totalUsers),
    activeRescues: Number(rescueOrgs),
    monthlyAdoptions: Number(monthlyAdoptions),
    platformUptime: 98.5, // Hardcoded as we don't have monitoring data
    platformMetrics,
    userDistribution,
    // New metrics
    totalPets: Number(totalPets),
    totalApplications: Number(totalApplications),
    totalAdoptions: Number(totalAdoptions),
    platformAdoptionRate: Number(platformAdoptionRate),
    averagePlatformResponseTime: avgPlatformResponseTime,
    systemAlerts: {
      pendingVerifications: 0, // Removed as we don't have this status
      reportedContent: 0, // Removed as we don't have this type
      userReports: 0, // Removed as we don't have this type
    },
    recentActivity: recentActivity.map((activity) => ({
      type: String(activity.get('level')),
      description: String(activity.get('action')),
      timestamp: activity.get('timestamp') as Date,
    })),
  }
}

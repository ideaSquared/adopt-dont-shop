export type MonthlyAdoption = {
  month: string
  adoptions: number
}

export type PlatformMetric = {
  date: string
  users: number
  adoptions: number
  rescues: number
}

export type PetStatus = {
  name: string
  value: number
}

export type UserDistribution = {
  name: string
  value: number
}

export type PetTypeDistribution = {
  name: string
  value: number
}

export type RescueDashboardData = {
  totalPets: number
  successfulAdoptions: number
  pendingApplications: number
  averageRating: number
  monthlyAdoptions: MonthlyAdoption[]
  petStatusDistribution: PetStatus[]
  petTypeDistribution: PetTypeDistribution[]
  totalApplications: number
  adoptionRate: number
  averageResponseTime: number
}

export type AdminDashboardData = {
  totalUsers: number
  activeRescues: number
  monthlyAdoptions: number
  platformUptime: number
  platformMetrics: PlatformMetric[]
  userDistribution: UserDistribution[]
  totalPets: number
  totalApplications: number
  totalAdoptions: number
  platformAdoptionRate: number
  averagePlatformResponseTime: number
  systemAlerts: {
    pendingVerifications: number
    reportedContent: number
    userReports: number
  }
  recentActivity: {
    type: string
    description: string
    timestamp: Date
  }[]
}

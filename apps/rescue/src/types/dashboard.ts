/**
 * Dashboard data types for rescue organization management
 * Based on the Rescue Management System PRD
 */

export type RescueDashboardData = {
  totalPets: number;
  successfulAdoptions: number;
  pendingApplications: number;
  averageRating: number;
  monthlyAdoptions: MonthlyAdoption[];
  petStatusDistribution: PetStatus[];
  petTypeDistribution: PetTypeDistribution[];
  totalApplications: number;
  adoptionRate: number;
  averageResponseTime: number;
};

export type MonthlyAdoption = {
  month: string;
  adoptions: number;
};

export type PetStatus = {
  name: string;
  value: number;
  color?: string;
};

export type PetTypeDistribution = {
  name: string;
  value: number;
};

export type RecentActivity = {
  id: string;
  timestamp: Date;
  type: 'application' | 'adoption' | 'medical' | 'volunteer' | 'general';
  message: string;
  petId?: string;
  applicationId?: string;
};

export type DashboardNotification = {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
};

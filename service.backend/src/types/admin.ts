import Application from '../models/Application';
import Pet from '../models/Pet';
import Rescue from '../models/Rescue';
import User from '../models/User';

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RescueListResponse {
  rescues: Rescue[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PetListResponse {
  pets: Pet[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ApplicationListResponse {
  applications: Application[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SystemStatistics {
  totalUsers: number;
  totalRescues: number;
  totalPets: number;
  totalApplications: number;
  activeUsers: number;
  verifiedRescues: number;
  availablePets: number;
  pendingApplications: number;
  recentActivity: unknown[];
}

export interface AdminDashboardData {
  overview: {
    totalUsers: number;
    totalRescues: number;
    totalPets: number;
    totalApplications: number;
  };
  trends: {
    userGrowth: number;
    petAdoptions: number;
    applicationApprovals: number;
  };
  alerts: {
    pendingApplications: number;
    unverifiedRescues: number;
    systemIssues: number;
  };
}

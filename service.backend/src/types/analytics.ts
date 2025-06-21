import { CountByCategory, DateRange, JsonObject, JsonValue, TimeSeriesPoint } from './common';

// Analytics options and filters
export interface AnalyticsOptions {
  startDate?: Date;
  endDate?: Date;
  rescueId?: string;
  groupBy?: 'day' | 'week' | 'month';
}

// User behavior analytics
export interface UserActivity {
  activity: string;
  count: number;
  percentage?: number;
}

export interface UserBehaviorMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userGrowthRate: number;
  avgSessionDuration: number;
  retentionRate: number;
  topUserActivities: UserActivity[];
}

// Adoption analytics
export interface PetTypeMetrics {
  type: string;
  count: number;
  adoptionRate: number;
  averageTimeToAdoption?: number;
}

export interface RescuePerformance {
  rescueId: string;
  rescueName: string;
  adoptions: number;
  averageTimeToAdoption: number;
  adoptionRate: number;
  totalPets: number;
}

export interface AdoptionMetrics {
  totalAdoptions: number;
  adoptionRate: number;
  avgTimeToAdoption: number;
  popularPetTypes: PetTypeMetrics[];
  adoptionTrends: TimeSeriesPoint[];
  rescuePerformance: RescuePerformance[];
}

// Platform metrics
export interface DatabasePerformance {
  avgQueryTime: number;
  slowQueries: number;
  connectionCount: number;
  activeConnections: number;
  maxConnections: number;
}

export interface StorageUsage {
  totalImages: number;
  totalStorageUsed: string;
  storageGrowthRate: number;
  imagesByType: CountByCategory;
  averageImageSize: number;
}

export interface PlatformMetrics {
  apiRequestCount: number;
  avgResponseTime: number;
  errorRate: number;
  systemUptime: number;
  databasePerformance: DatabasePerformance;
  storageUsage: StorageUsage;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage?: {
    percentage: number;
    loadAverage: number[];
  };
}

// Application analytics
export interface ApplicationStatusMetrics {
  status: string;
  count: number;
  percentage: number;
  avgProcessingTime?: number;
}

export interface ApplicationMetrics {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  avgProcessingTime: number;
  applicationsByStatus: ApplicationStatusMetrics[];
  applicationTrends: TimeSeriesPoint[];
  conversionRate: number;
  abandonment: {
    rate: number;
    commonDropOffPoints: Array<{
      step: string;
      dropOffRate: number;
    }>;
  };
}

// Communication analytics
export interface MessageMetrics {
  totalMessages: number;
  messagesPerChat: number;
  avgResponseTime: number;
  activeChats: number;
  messagesByType: CountByCategory;
}

export interface CommunicationMetrics {
  totalChats: number;
  activeChats: number;
  avgMessagesPerChat: number;
  avgResponseTime: number;
  messageTrends: TimeSeriesPoint[];
  messageMetrics: MessageMetrics;
  userEngagement: {
    dailyActiveUsers: number;
    avgSessionLength: number;
    messageFrequency: CountByCategory;
  };
}

// Dashboard analytics
export interface DashboardAnalytics {
  userMetrics: UserBehaviorMetrics;
  adoptionMetrics: AdoptionMetrics;
  applicationMetrics: ApplicationMetrics;
  communicationMetrics: CommunicationMetrics;
  platformMetrics: PlatformMetrics;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: Date;
    userId?: string;
    entityId?: string;
  }>;
}

// Real-time statistics
export interface RealTimeStats {
  onlineUsers: number;
  activeChats: number;
  pendingApplications: number;
  newPetsToday: number;
  adoptionsToday: number;
  systemLoad: {
    cpu: number;
    memory: number;
    activeConnections: number;
  };
  recentActivities: Array<{
    type: 'user_registration' | 'pet_added' | 'application_submitted' | 'adoption_completed';
    timestamp: Date;
    description: string;
  }>;
}

// Analytics query result types
export interface GroupedCountResult {
  [key: string]: number;
}

export interface SequelizeCountResult {
  count: number;
  dataValues?: JsonObject;
}

export interface GroupedCountResultItem {
  [key: string]: JsonValue;
  count: number;
}

// Export analytics
export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  dateRange?: DateRange;
  includeMetrics?: string[];
  groupBy?: 'day' | 'week' | 'month';
}

export interface AnalyticsExport {
  metadata: {
    generatedAt: Date;
    dateRange: DateRange;
    format: string;
    recordCount: number;
  };
  data: JsonValue[];
  summary?: {
    [key: string]: number | string;
  };
}

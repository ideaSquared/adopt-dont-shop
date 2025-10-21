/**
 * Admin-specific type definitions
 */

// User Management Types
export interface AdminUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'admin' | 'moderator' | 'rescue_staff' | 'adopter';
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  lastLogin?: string;
  emailVerified: boolean;
  phoneNumber?: string;
  rescueId?: string;
  rescueName?: string;
}

export interface UserFilters {
  search?: string;
  userType?: string;
  status?: string;
  rescueId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface UserUpdatePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  userType?: 'admin' | 'moderator' | 'rescue_staff' | 'adopter';
  status?: 'active' | 'suspended' | 'pending';
}

// Rescue Management Types
export interface AdminRescue {
  rescueId: string;
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  ein?: string;
  website?: string;
  description?: string;
  activeListings: number;
  staffCount: number;
  createdAt: string;
  verifiedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface RescueFilters {
  search?: string;
  verificationStatus?: string;
  state?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface RescueVerificationPayload {
  status: 'verified' | 'rejected';
  rejectionReason?: string;
  notes?: string;
}

// Content Moderation Types
export interface ModerationItem {
  reportId: string;
  contentType: 'listing' | 'message' | 'profile' | 'photo';
  contentId: string;
  reportedBy: string;
  reportedByName: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  assignedTo?: string;
  resolvedAt?: string;
  resolution?: string;
  targetUserId?: string;
  targetUserName?: string;
}

export interface ModerationFilters {
  status?: string;
  contentType?: string;
  priority?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ModerationAction {
  action: 'dismiss' | 'warn' | 'suspend_content' | 'suspend_user' | 'ban_user';
  resolution: string;
  notifyUser: boolean;
  suspensionDays?: number;
}

// Support Ticket Types
export interface SupportTicket {
  ticketId: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: 'technical' | 'account' | 'billing' | 'abuse' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  description: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  messagesCount: number;
}

export interface TicketFilters {
  status?: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TicketMessage {
  messageId: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorType: 'user' | 'admin' | 'system';
  message: string;
  createdAt: string;
  attachments?: string[];
}

export interface TicketUpdatePayload {
  status?: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  category?: 'technical' | 'account' | 'billing' | 'abuse' | 'other';
}

// Analytics Types
export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  userGrowth: number;
  totalRescues: number;
  verifiedRescues: number;
  pendingRescues: number;
  totalListings: number;
  activeListings: number;
  adoptedThisMonth: number;
  pendingReports: number;
  openTickets: number;
}

export interface AnalyticsData {
  userRegistrations: TimeSeriesData[];
  adoptions: TimeSeriesData[];
  topRescues: RescueStats[];
  userActivity: ActivityStats;
  systemHealth: HealthMetrics;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface RescueStats {
  rescueId: string;
  rescueName: string;
  totalListings: number;
  successfulAdoptions: number;
  averageAdoptionTime: number;
}

export interface ActivityStats {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
}

export interface HealthMetrics {
  uptime: number;
  apiResponseTime: number;
  errorRate: number;
  databaseHealth: 'healthy' | 'degraded' | 'down';
}

// Audit Log Types
export interface AuditLog {
  logId: string;
  timestamp: string;
  userId: string;
  userName: string;
  userType: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
}

export interface AuditFilters {
  userId?: string;
  action?: string;
  resource?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

// System Configuration Types
export interface FeatureFlag {
  flagId: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetUserTypes?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SystemSetting {
  settingId: string;
  category: string;
  key: string;
  value: string | number | boolean;
  description: string;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  updatedAt: string;
  updatedBy: string;
}

// Pagination and Common Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// Action Response Types
export interface ActionResponse {
  success: boolean;
  message: string;
  data?: any;
}

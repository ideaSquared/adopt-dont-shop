export enum AuditLogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export enum AuditLogStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export type AuditLog = {
  id: number;
  service: string;
  user: string | null;
  userName: string | null;
  userEmail: string | null;
  userType: string | null;
  action: string;
  level: AuditLogLevel;
  status: AuditLogStatus | null;
  timestamp: Date;
  metadata: {
    entity?: string;
    entityId?: string;
    // Display name of the audited entity, when the gateway resolved one.
    entityName?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  } | null;
  category: string;
  ip_address: string | null;
  user_agent: string | null;
};

export type AuditLogFilters = {
  action?: string;
  userId?: string;
  entity?: string;
  level?: AuditLogLevel;
  status?: AuditLogStatus;
  // Free-text search, matched server-side across every page.
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type PaginatedAuditLogsResponse = {
  success: boolean;
  data: AuditLog[];
  pagination: PaginationInfo;
};

import type {
  ReportCategory,
  ReportStatus,
  ReportSeverity,
  ActionType,
  ReportedEntityType,
} from './schemas';

/**
 * Get display label for report category
 */
export const getCategoryLabel = (category: ReportCategory): string => {
  const labels: Record<ReportCategory, string> = {
    inappropriate_content: 'Inappropriate Content',
    spam: 'Spam',
    harassment: 'Harassment',
    false_information: 'False Information',
    scam: 'Scam',
    animal_welfare: 'Animal Welfare',
    identity_theft: 'Identity Theft',
    other: 'Other',
  };
  return labels[category];
};

/**
 * Get display label for report status
 */
export const getStatusLabel = (status: ReportStatus): string => {
  const labels: Record<ReportStatus, string> = {
    pending: 'Pending',
    under_review: 'Under Review',
    resolved: 'Resolved',
    dismissed: 'Dismissed',
    escalated: 'Escalated',
  };
  return labels[status];
};

/**
 * Get display label for severity
 */
export const getSeverityLabel = (severity: ReportSeverity): string => {
  const labels: Record<ReportSeverity, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  };
  return labels[severity];
};

/**
 * Get display label for action type
 */
export const getActionTypeLabel = (actionType: ActionType): string => {
  const labels: Record<ActionType, string> = {
    warning_issued: 'Warning Issued',
    content_removed: 'Content Removed',
    user_suspended: 'User Suspended',
    user_banned: 'User Banned',
    account_restricted: 'Account Restricted',
    content_flagged: 'Content Flagged',
    report_dismissed: 'Report Dismissed',
    escalation: 'Escalation',
    appeal_reviewed: 'Appeal Reviewed',
    no_action: 'No Action',
  };
  return labels[actionType];
};

/**
 * Get display label for entity type
 */
export const getEntityTypeLabel = (entityType: ReportedEntityType): string => {
  const labels: Record<ReportedEntityType, string> = {
    user: 'User',
    rescue: 'Rescue',
    pet: 'Pet',
    application: 'Application',
    message: 'Message',
    conversation: 'Conversation',
  };
  return labels[entityType];
};

/**
 * Get color for severity (for UI styling)
 */
export const getSeverityColor = (severity: ReportSeverity): string => {
  const colors: Record<ReportSeverity, string> = {
    low: '#10b981', // green
    medium: '#f59e0b', // amber
    high: '#f97316', // orange
    critical: '#ef4444', // red
  };
  return colors[severity];
};

/**
 * Get color for status (for UI styling)
 */
export const getStatusColor = (status: ReportStatus): string => {
  const colors: Record<ReportStatus, string> = {
    pending: '#6b7280', // gray
    under_review: '#3b82f6', // blue
    resolved: '#10b981', // green
    dismissed: '#6b7280', // gray
    escalated: '#ef4444', // red
  };
  return colors[status];
};

/**
 * Format date for display
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
};

/**
 * Calculate resolution time in hours
 */
export const calculateResolutionTime = (createdAt: Date | string, resolvedAt?: Date | string): number | null => {
  if (!resolvedAt) {
    return null;
  }

  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const resolved = typeof resolvedAt === 'string' ? new Date(resolvedAt) : resolvedAt;

  return Math.floor((resolved.getTime() - created.getTime()) / (1000 * 60 * 60));
};

/**
 * Check if a report is overdue (pending for more than 24 hours)
 */
export const isReportOverdue = (createdAt: Date | string, status: ReportStatus): boolean => {
  if (status !== 'pending') {
    return false;
  }

  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const now = new Date();
  const hoursElapsed = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  return hoursElapsed > 24;
};

/**
 * Build query string from filters object
 */
export const buildQueryString = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

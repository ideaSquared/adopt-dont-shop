import type { TicketCategory, TicketStatus, TicketPriority } from './schemas';

/**
 * Get display label for ticket category
 */
export const getCategoryLabel = (category: TicketCategory): string => {
  const labels: Record<TicketCategory, string> = {
    technical_issue: 'Technical Issue',
    account_problem: 'Account Problem',
    adoption_inquiry: 'Adoption Inquiry',
    payment_issue: 'Payment Issue',
    feature_request: 'Feature Request',
    report_bug: 'Report Bug',
    general_question: 'General Question',
    compliance_concern: 'Compliance Concern',
    data_request: 'Data Request',
    other: 'Other',
  };
  return labels[category];
};

/**
 * Get display label for ticket status
 */
export const getStatusLabel = (status: TicketStatus): string => {
  const labels: Record<TicketStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    waiting_for_user: 'Waiting for User',
    resolved: 'Resolved',
    closed: 'Closed',
    escalated: 'Escalated',
  };
  return labels[status];
};

/**
 * Get display label for ticket priority
 */
export const getPriorityLabel = (priority: TicketPriority): string => {
  const labels: Record<TicketPriority, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
    critical: 'Critical',
  };
  return labels[priority];
};

/**
 * Get color for priority (for UI styling)
 */
export const getPriorityColor = (priority: TicketPriority): string => {
  const colors: Record<TicketPriority, string> = {
    low: '#10b981', // green
    normal: '#3b82f6', // blue
    high: '#f59e0b', // amber
    urgent: '#f97316', // orange
    critical: '#ef4444', // red
  };
  return colors[priority];
};

/**
 * Get color for status (for UI styling)
 */
export const getStatusColor = (status: TicketStatus): string => {
  const colors: Record<TicketStatus, string> = {
    open: '#3b82f6', // blue
    in_progress: '#8b5cf6', // purple
    waiting_for_user: '#f59e0b', // amber
    resolved: '#10b981', // green
    closed: '#6b7280', // gray
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
export const calculateResolutionTime = (createdAt: Date | string, resolvedAt?: Date | string | null): number | null => {
  if (!resolvedAt) {
    return null;
  }

  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const resolved = typeof resolvedAt === 'string' ? new Date(resolvedAt) : resolvedAt;

  return Math.floor((resolved.getTime() - created.getTime()) / (1000 * 60 * 60));
};

/**
 * Check if a ticket is overdue (based on due date)
 */
export const isTicketOverdue = (dueDate?: Date | string | null, status?: TicketStatus): boolean => {
  if (!dueDate) {
    return false;
  }

  // Only consider open tickets
  if (status && !['open', 'in_progress', 'waiting_for_user'].includes(status)) {
    return false;
  }

  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const now = new Date();

  return now > due;
};

/**
 * Calculate ticket age in hours
 */
export const getTicketAge = (createdAt: Date | string): number => {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
};

/**
 * Format hours to human-readable duration
 */
export const formatDuration = (hours: number): string => {
  if (hours < 1) {
    return 'Less than 1 hour';
  }
  if (hours < 24) {
    return `${Math.round(hours)} hour${hours === 1 ? '' : 's'}`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  return `${days}d ${Math.round(remainingHours)}h`;
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

/**
 * Get icon name for ticket category (can be used with icon libraries)
 */
export const getCategoryIcon = (category: TicketCategory): string => {
  const icons: Record<TicketCategory, string> = {
    technical_issue: 'bug',
    account_problem: 'user',
    adoption_inquiry: 'heart',
    payment_issue: 'credit-card',
    feature_request: 'lightbulb',
    report_bug: 'alert-circle',
    general_question: 'help-circle',
    compliance_concern: 'shield',
    data_request: 'database',
    other: 'message-circle',
  };
  return icons[category];
};

/**
 * Check if ticket needs attention (high priority and open)
 */
export const needsAttention = (priority: TicketPriority, status: TicketStatus): boolean => {
  return ['urgent', 'critical'].includes(priority) && ['open', 'in_progress'].includes(status);
};

/**
 * Get ticket ID display format (e.g., "TICK-12345" from "ticket_1234567890_abc123")
 */
export const formatTicketId = (ticketId: string): string => {
  // Extract timestamp portion if available
  const parts = ticketId.split('_');
  if (parts.length >= 2 && !isNaN(Number(parts[1]))) {
    return `TICK-${parts[1].slice(-6)}`;
  }
  // Fallback: take last 6 chars
  return `TICK-${ticketId.slice(-6)}`;
};

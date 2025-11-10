/**
 * Utility functions for formatting and handling application statuses
 * Simplified for small charities with 4-status workflow
 */

export type ApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'withdrawn';

/**
 * Formats an application status into a human-readable string
 * @param status - The raw status string
 * @returns Formatted status string
 */
export const formatStatusName = (status: string): string => {
  const statusMap: Record<string, string> = {
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };

  // Return mapped value or fallback to title case conversion
  return (
    statusMap[status] ||
    status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
};

/**
 * Gets the color variant for a status (useful for badges, buttons, etc.)
 * @param status - The status string
 * @returns Color variant string
 */
export const getStatusColor = (
  status: string
): 'primary' | 'success' | 'warning' | 'danger' | 'secondary' => {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'submitted':
      return 'primary';
    case 'withdrawn':
      return 'secondary';
    default:
      return 'secondary';
  }
};

/**
 * Gets a brief description of what the status means
 * @param status - The status string
 * @returns Description string
 */
export const getStatusDescription = (status: string): string => {
  const descriptions: Record<string, string> = {
    submitted: 'Application has been submitted for review',
    approved: 'Application has been approved',
    rejected: 'Application has been rejected',
    withdrawn: 'Application was withdrawn by applicant',
  };

  return descriptions[status] || 'Status information not available';
};

/**
 * Checks if a status represents a completed/final state
 * @param status - The status string
 * @returns True if status is final
 */
export const isFinalStatus = (status: string): boolean => {
  const finalStatuses = ['approved', 'rejected', 'withdrawn'];
  return finalStatuses.includes(status);
};

/**
 * Gets the priority level of a status (for sorting/display purposes)
 * @param status - The status string
 * @returns Priority number (lower = higher priority)
 */
export const getStatusPriority = (status: string): number => {
  const priorities: Record<string, number> = {
    submitted: 1,
    approved: 2,
    rejected: 3,
    withdrawn: 4,
  };

  return priorities[status] || 999;
};

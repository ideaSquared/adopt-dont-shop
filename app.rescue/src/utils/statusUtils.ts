/**
 * Utility functions for formatting and handling application statuses
 */

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'pending_references'
  | 'reference_check'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'home_visit_scheduled'
  | 'home_visit_completed'
  | 'conditionally_approved'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'expired'
  | 'on_hold';

/**
 * Formats an application status into a human-readable string
 * @param status - The raw status string
 * @returns Formatted status string
 */
export const formatStatusName = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under Review',
    pending_references: 'Pending References',
    reference_check: 'Reference Check',
    interview_scheduled: 'Interview Scheduled',
    interview_completed: 'Interview Completed',
    home_visit_scheduled: 'Home Visit Scheduled',
    home_visit_completed: 'Home Visit Completed',
    conditionally_approved: 'Conditionally Approved',
    approved: 'Approved',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    expired: 'Expired',
    on_hold: 'On Hold',
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
    case 'expired':
      return 'danger';
    case 'conditionally_approved':
    case 'pending_references':
    case 'interview_scheduled':
    case 'home_visit_scheduled':
      return 'warning';
    case 'submitted':
    case 'under_review':
    case 'interview_completed':
    case 'home_visit_completed':
      return 'primary';
    case 'draft':
    case 'withdrawn':
    case 'on_hold':
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
    draft: 'Application is being prepared',
    submitted: 'Application has been submitted for review',
    under_review: 'Application is being reviewed by staff',
    pending_references: 'Waiting for reference checks to be completed',
    reference_check: 'Reference checks are in progress',
    interview_scheduled: 'Interview has been scheduled with applicant',
    interview_completed: 'Interview has been completed',
    home_visit_scheduled: 'Home visit has been scheduled',
    home_visit_completed: 'Home visit has been completed',
    conditionally_approved: 'Approved with conditions that must be met',
    approved: 'Application has been approved',
    rejected: 'Application has been rejected',
    withdrawn: 'Application was withdrawn by applicant',
    expired: 'Application has expired due to inactivity',
    on_hold: 'Application is temporarily on hold',
  };

  return descriptions[status] || 'Status information not available';
};

/**
 * Checks if a status represents a completed/final state
 * @param status - The status string
 * @returns True if status is final
 */
export const isFinalStatus = (status: string): boolean => {
  const finalStatuses = ['approved', 'rejected', 'withdrawn', 'expired'];
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
    under_review: 2,
    pending_references: 3,
    interview_scheduled: 4,
    home_visit_scheduled: 5,
    conditionally_approved: 6,
    approved: 7,
    rejected: 8,
    withdrawn: 9,
    expired: 10,
    draft: 11,
    on_hold: 12,
  };

  return priorities[status] || 999;
};

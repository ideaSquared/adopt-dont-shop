import {
  applicationStatusLabel,
  type ApplicationStatus,
  APPLICATION_STATUSES,
} from '@adopt-dont-shop/lib.types';

const isApplicationStatus = (status: string): status is ApplicationStatus =>
  (APPLICATION_STATUSES as readonly string[]).includes(status);

export const formatStatusName = (status: string): string => {
  if (isApplicationStatus(status)) {
    return applicationStatusLabel(status);
  }
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

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

export const getStatusDescription = (status: string): string => {
  const descriptions: Record<string, string> = {
    submitted: 'Application has been submitted for review',
    approved: 'Application has been approved',
    rejected: 'Application has been rejected',
    withdrawn: 'Application was withdrawn by applicant',
  };

  return descriptions[status] || 'Status information not available';
};

export const isFinalStatus = (status: string): boolean => {
  const finalStatuses = ['approved', 'rejected', 'withdrawn'];
  return finalStatuses.includes(status);
};

export const getStatusPriority = (status: string): number => {
  const priorities: Record<string, number> = {
    submitted: 1,
    approved: 2,
    rejected: 3,
    withdrawn: 4,
  };

  return priorities[status] || 999;
};

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

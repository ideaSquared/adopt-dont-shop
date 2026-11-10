import React from 'react';
import { StatusBadge as SharedStatusBadge } from '@adopt-dont-shop/lib.components';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

// Statuses are application statuses; values outside that set render as a neutral, humanised badge.
const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => (
  <SharedStatusBadge kind="application" status={status} className={className} />
);

export default StatusBadge;

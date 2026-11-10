import { formatCustomDate } from '@adopt-dont-shop/lib.utils';

export const formatRescueDate = (dateString?: string): string =>
  dateString ? formatCustomDate(dateString, 'dd MMM yyyy') : 'N/A';

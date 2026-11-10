import { getStatusDisplay } from '@adopt-dont-shop/lib.types';

export const formatStatusName = (status: string): string =>
  getStatusDisplay('application', status).label;

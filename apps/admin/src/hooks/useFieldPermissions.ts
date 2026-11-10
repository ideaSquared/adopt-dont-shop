import { useQuery } from '@tanstack/react-query';
import type {
  FieldAccessMap,
  FieldPermissionRecord,
  FieldPermissionResource,
  UserRole,
} from '@adopt-dont-shop/lib.permissions';
import { apiService } from '../services/libraryServices';

export const useFieldPermissionDefaults = (
  resource: FieldPermissionResource,
  role: UserRole,
  enabled: boolean
) =>
  useQuery({
    queryKey: ['field-permissions', resource, role, 'defaults'],
    queryFn: async (): Promise<FieldAccessMap> => {
      const response = await apiService.get<{ data: FieldAccessMap }>(
        `/api/v1/field-permissions/defaults/${resource}/${role}`
      );
      return response.data || {};
    },
    enabled,
  });

export const useFieldPermissionOverrides = (
  resource: FieldPermissionResource,
  role: UserRole,
  enabled: boolean
) =>
  useQuery({
    queryKey: ['field-permissions', resource, role, 'overrides'],
    queryFn: async (): Promise<FieldPermissionRecord[]> => {
      const response = await apiService.get<{ data: FieldPermissionRecord[] }>(
        `/api/v1/field-permissions/${resource}/${role}`
      );
      return response.data || [];
    },
    enabled,
  });

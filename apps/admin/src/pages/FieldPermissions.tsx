import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  DataTable,
  type DataTableColumn,
  ErrorState,
  Heading,
  PageHeader,
  Stack,
  Tabs,
  Text,
  toast,
} from '@adopt-dont-shop/lib.components';
import type {
  FieldAccessLevel,
  FieldPermissionResource,
  UserRole,
} from '@adopt-dont-shop/lib.permissions';
import { apiService } from '../services/libraryServices';
import { Info, RefreshCw, Save } from 'lucide-react';
import {
  useFieldPermissionDefaults,
  useFieldPermissionOverrides,
} from '../hooks/useFieldPermissions';
import * as styles from './FieldPermissions.css';

const RESOURCES: ReadonlyArray<FieldPermissionResource> = [
  'users',
  'pets',
  'applications',
  'rescues',
];
const ROLES: ReadonlyArray<UserRole> = ['admin', 'moderator', 'rescue_staff', 'adopter'];

const getAccessSelectClass = (level: FieldAccessLevel): string => {
  switch (level) {
    case 'write':
      return styles.accessSelectWrite;
    case 'read':
      return styles.accessSelectRead;
    case 'none':
      return styles.accessSelectNone;
    default:
      return styles.accessSelectDefault;
  }
};

const FieldPermissions: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [selectedResource, setSelectedResource] = useState<FieldPermissionResource>('users');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [pendingChanges, setPendingChanges] = useState<Record<string, FieldAccessLevel>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const defaultsQuery = useFieldPermissionDefaults(selectedResource, selectedRole, isAuthenticated);
  const overridesQuery = useFieldPermissionOverrides(
    selectedResource,
    selectedRole,
    isAuthenticated
  );
  const defaults = defaultsQuery.data ?? {};
  const overrides = overridesQuery.data ?? [];
  const loading = defaultsQuery.isLoading || overridesQuery.isLoading;
  const loadFailed = defaultsQuery.isError || overridesQuery.isError;
  const error = saveError ?? (loadFailed ? 'Failed to load field permissions' : null);

  const resetView = () => {
    setPendingChanges({});
    setSaveError(null);
  };

  const refresh = async () => {
    resetView();
    await queryClient.invalidateQueries({
      queryKey: ['field-permissions', selectedResource, selectedRole],
    });
  };

  const selectResource = (resource: FieldPermissionResource) => {
    resetView();
    setSelectedResource(resource);
  };

  const selectRole = (role: UserRole) => {
    resetView();
    setSelectedRole(role);
  };

  const getEffectiveLevel = (fieldName: string): FieldAccessLevel => {
    if (pendingChanges[fieldName] !== undefined) {
      return pendingChanges[fieldName];
    }
    const override = overrides.find(o => o.field_name === fieldName);
    if (override) {
      return override.access_level;
    }
    return defaults[fieldName] || 'none';
  };

  const isOverridden = (fieldName: string): boolean => {
    return (
      overrides.some(o => o.field_name === fieldName) || pendingChanges[fieldName] !== undefined
    );
  };

  const handleChange = (fieldName: string, level: FieldAccessLevel) => {
    const savedLevel =
      overrides.find(o => o.field_name === fieldName)?.access_level ??
      defaults[fieldName] ??
      'none';
    setPendingChanges(prev => {
      if (level === savedLevel) {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      }
      return { ...prev, [fieldName]: level };
    });
  };

  // Resolves to the user-facing failure message, or null when everything saved.
  const saveMutation = useMutation({
    mutationFn: async (): Promise<string | null> => {
      const bulkOverrides: Array<{
        resource: FieldPermissionResource;
        field_name: string;
        role: UserRole;
        access_level: FieldAccessLevel;
      }> = [];
      const deletions: string[] = [];

      for (const [fieldName, accessLevel] of Object.entries(pendingChanges) as Array<
        [string, FieldAccessLevel]
      >) {
        const defaultLevel = defaults[fieldName] ?? 'none';
        const hasExistingOverride = overrides.some(o => o.field_name === fieldName);

        if (accessLevel === defaultLevel) {
          if (hasExistingOverride) {
            deletions.push(fieldName);
          }
          continue;
        }

        bulkOverrides.push({
          resource: selectedResource,
          field_name: fieldName,
          role: selectedRole,
          access_level: accessLevel,
        });
      }

      try {
        if (bulkOverrides.length > 0) {
          await apiService.post('/api/v1/field-permissions/bulk', { overrides: bulkOverrides });
        }

        if (deletions.length > 0) {
          const results = await Promise.allSettled(
            deletions.map(fieldName =>
              apiService.delete(
                `/api/v1/field-permissions/${selectedResource}/${selectedRole}/${fieldName}`
              )
            )
          );
          const failed = deletions.filter((_, i) => results[i].status === 'rejected');
          if (failed.length > 0) {
            return `Failed to revert ${failed.length} field(s) to default: ${failed.join(', ')}`;
          }
        }
        return null;
      } catch {
        return 'Failed to save field permissions';
      }
    },
  });
  const saving = saveMutation.isPending;

  const handleSave = async () => {
    setSaveError(null);
    const failure = await saveMutation.mutateAsync();
    await refresh();
    if (failure !== null) {
      setSaveError(failure);
      toast.error(failure);
      return;
    }
    toast.success('Field permissions saved');
  };

  const fieldNames = Object.keys(defaults).sort();
  const pendingCount = Object.keys(pendingChanges).length;

  const columns: DataTableColumn[] = [
    {
      key: 'field',
      label: 'Field',
      sortable: false,
      render: (_value, row) => <code className={styles.fieldName}>{String(row.field)}</code>,
    },
    {
      key: 'default',
      label: 'Default',
      sortable: false,
      render: (_value, row) => {
        const defaultLevel = defaults[String(row.field)] || 'none';
        return (
          <select className={getAccessSelectClass(defaultLevel)} disabled>
            <option>{defaultLevel}</option>
          </select>
        );
      },
    },
    {
      key: 'effective',
      label: 'Effective Access',
      sortable: false,
      render: (_value, row) => {
        const fieldName = String(row.field);
        const effectiveLevel = getEffectiveLevel(fieldName);
        return (
          <select
            className={getAccessSelectClass(effectiveLevel)}
            value={effectiveLevel}
            onChange={e => handleChange(fieldName, e.target.value as FieldAccessLevel)}
          >
            <option value='none'>none</option>
            <option value='read'>read</option>
            <option value='write'>write</option>
          </select>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      render: (_value, row) => {
        const fieldName = String(row.field);
        return (
          <>
            {isOverridden(fieldName) && <Badge variant='info'>Override</Badge>}
            {pendingChanges[fieldName] !== undefined && <Badge variant='warning'>Unsaved</Badge>}
          </>
        );
      },
    },
  ];

  const accessCard = (
    <Card>
      <CardHeader>
        <Heading level='h3' size='lg'>
          {selectedResource} - {selectedRole.replace('_', ' ')} access
        </Heading>
      </CardHeader>
      <CardContent>
        {!loading && fieldNames.length === 0 ? (
          <Text>No fields configured for this resource and role.</Text>
        ) : (
          <DataTable
            frameless
            columns={columns}
            rows={fieldNames.map(field => ({ id: field, field }))}
            loading={loading}
            pageSize={500}
          />
        )}
      </CardContent>
    </Card>
  );

  return (
    <Stack spacing='lg'>
      <PageHeader
        title='Field Permissions'
        actions={
          <>
            <Button variant='secondary' onClick={refresh} disabled={loading}>
              <RefreshCw size='1em' />
              Refresh
            </Button>
            {pendingCount > 0 && (
              <Button variant='primary' onClick={handleSave} disabled={saving}>
                <Save size='1em' />
                {saving ? 'Saving...' : `Save ${pendingCount} Change${pendingCount > 1 ? 's' : ''}`}
              </Button>
            )}
          </>
        }
      />

      <Alert variant='info' icon={<Info size='1em' />}>
        Field permissions control which data fields are visible or editable for each role. Changes
        here create overrides on top of the default configuration. Fields set to{' '}
        <strong>none</strong> are completely hidden, <strong>read</strong> fields are visible but
        not editable, and <strong>write</strong> fields can be both viewed and modified.
      </Alert>

      <Tabs
        aria-label='Resource'
        value={selectedResource}
        onChange={id => selectResource(RESOURCES.find(resource => resource === id) ?? 'users')}
        tabs={RESOURCES.map(resource => ({
          id: resource,
          label: resource,
          content: resource === selectedResource ? accessCard : null,
        }))}
      />

      <div className={styles.roleSelector}>
        {ROLES.map(role => (
          <Button
            key={role}
            variant={selectedRole === role ? 'primary' : 'outline'}
            size='sm'
            aria-pressed={selectedRole === role}
            onClick={() => selectRole(role)}
          >
            {role.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {error && <ErrorState size='sm' title={error} />}

      {pendingCount > 0 && (
        <Alert variant='warning'>
          {pendingCount} unsaved change{pendingCount > 1 ? 's' : ''}
        </Alert>
      )}
    </Stack>
  );
};

export default FieldPermissions;

import React, { useEffect, useState, useCallback } from 'react';
import clsx from 'clsx';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Heading, Text, Button } from '@adopt-dont-shop/lib.components';
import type {
  FieldAccessLevel,
  FieldAccessMap,
  FieldPermissionRecord,
  FieldPermissionResource,
  UserRole,
} from '@adopt-dont-shop/lib.permissions';
import { apiService } from '../services/libraryServices';
import { FiShield, FiSave, FiRefreshCw, FiInfo } from 'react-icons/fi';
import {
  PageContainer,
  PageHeader,
  HeaderLeft,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../components/ui';
import { Skeleton } from '../components/ui/Skeleton';
import styles from './FieldPermissions.css';

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
  const [selectedResource, setSelectedResource] = useState<FieldPermissionResource>('users');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [defaults, setDefaults] = useState<FieldAccessMap>({});
  const [overrides, setOverrides] = useState<FieldPermissionRecord[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Record<string, FieldAccessLevel>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [defaultsData, overridesData] = await Promise.all([
        apiService.get<{ data: FieldAccessMap }>(
          `/api/v1/field-permissions/defaults/${selectedResource}/${selectedRole}`
        ),
        apiService.get<{ data: FieldPermissionRecord[] }>(
          `/api/v1/field-permissions/${selectedResource}/${selectedRole}`
        ),
      ]);

      setDefaults(defaultsData.data || {});
      setOverrides(overridesData.data || []);
      setPendingChanges({});
    } catch (err) {
      setError('Failed to load field permissions');
    } finally {
      setLoading(false);
    }
  }, [selectedResource, selectedRole]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [fetchData, isAuthenticated]);

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

  const handleSave = async () => {
    setSaving(true);
    setError(null);

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

    let saveError: string | null = null;

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
          const count = failed.length;
          const fields = failed.join(', ');
          saveError = `Failed to revert ${count} field(s) to default: ${fields}`;
        }
      }
    } catch (err) {
      saveError = 'Failed to save field permissions';
    } finally {
      await fetchData();
      if (saveError !== null) {
        setError(saveError);
      }
      setSaving(false);
    }
  };

  const fieldNames = Object.keys(defaults).sort();
  const pendingCount = Object.keys(pendingChanges).length;

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <FiShield size={24} />
          <Heading level='h1'>Field Permissions</Heading>
        </HeaderLeft>
        <div className={styles.headerActions}>
          <Button variant='secondary' onClick={fetchData} disabled={loading}>
            <FiRefreshCw size={16} />
            Refresh
          </Button>
          {pendingCount > 0 && (
            <Button variant='primary' onClick={handleSave} disabled={saving}>
              <FiSave size={16} />
              {saving ? 'Saving...' : `Save ${pendingCount} Change${pendingCount > 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </PageHeader>

      <div className={styles.infoBanner}>
        <FiInfo size={16} />
        <div>
          <Text>
            Field permissions control which data fields are visible or editable for each role.
            Changes here create overrides on top of the default configuration. Fields set to{' '}
            <strong>none</strong> are completely hidden, <strong>read</strong> fields are visible
            but not editable, and <strong>write</strong> fields can be both viewed and modified.
          </Text>
        </div>
      </div>

      <div className={styles.tabRow}>
        {RESOURCES.map(resource => (
          <button
            key={resource}
            className={clsx(styles.tab, selectedResource === resource && styles.tabActive)}
            onClick={() => setSelectedResource(resource)}
          >
            {resource}
          </button>
        ))}
      </div>

      <div className={styles.roleSelector}>
        {ROLES.map(role => (
          <button
            key={role}
            className={clsx(styles.roleChip, selectedRole === role && styles.roleChipActive)}
            onClick={() => setSelectedRole(role)}
          >
            {role.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && (
        <div className={styles.statusBar} style={{ background: '#fee2e2', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {pendingCount > 0 && (
        <div className={styles.statusBar} style={{ background: '#fffbeb', color: '#92400e' }}>
          {pendingCount} unsaved change{pendingCount > 1 ? 's' : ''}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedResource} - {selectedRole.replace('_', ' ')} access
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div
              aria-label='Loading field permissions'
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: '1rem',
                    alignItems: 'center',
                  }}
                >
                  <Skeleton height='0.875rem' width={i % 2 === 0 ? '70%' : '50%'} />
                  <Skeleton height='1.5rem' width='80%' radius='6px' />
                  <Skeleton height='1.5rem' width='80%' radius='6px' />
                  <Skeleton height='1rem' width='60%' />
                </div>
              ))}
            </div>
          ) : fieldNames.length === 0 ? (
            <Text>No fields configured for this resource and role.</Text>
          ) : (
            <table className={styles.fieldTable}>
              <thead>
                <tr>
                  <th className={styles.tableHeader}>Field</th>
                  <th className={styles.tableHeader}>Default</th>
                  <th className={styles.tableHeader}>Effective Access</th>
                  <th className={styles.tableHeader}>Status</th>
                </tr>
              </thead>
              <tbody>
                {fieldNames.map(fieldName => {
                  const defaultLevel = defaults[fieldName] || 'none';
                  const effectiveLevel = getEffectiveLevel(fieldName);
                  const modified = pendingChanges[fieldName] !== undefined;
                  const overridden = isOverridden(fieldName);

                  return (
                    <tr
                      key={fieldName}
                      className={modified ? styles.tableRowModified : styles.tableRow}
                    >
                      <td className={styles.tableCell}>
                        <code className={styles.fieldName}>{fieldName}</code>
                      </td>
                      <td className={styles.tableCell}>
                        <select className={getAccessSelectClass(defaultLevel)} disabled>
                          <option>{defaultLevel}</option>
                        </select>
                      </td>
                      <td className={styles.tableCell}>
                        <select
                          className={getAccessSelectClass(effectiveLevel)}
                          value={effectiveLevel}
                          onChange={e =>
                            handleChange(fieldName, e.target.value as FieldAccessLevel)
                          }
                        >
                          <option value='none'>none</option>
                          <option value='read'>read</option>
                          <option value='write'>write</option>
                        </select>
                      </td>
                      <td className={styles.tableCell}>
                        {overridden && <span className={styles.overrideBadge}>Override</span>}
                        {modified && <span className={styles.overrideBadge}>Unsaved</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default FieldPermissions;

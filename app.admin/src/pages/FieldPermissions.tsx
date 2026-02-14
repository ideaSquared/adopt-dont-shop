import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { useAuth, authService } from '@adopt-dont-shop/lib.auth';
import { Heading, Text, Button } from '@adopt-dont-shop/lib.components';
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

type FieldAccessLevel = 'none' | 'read' | 'write';

type FieldPermissionRecord = {
  fieldPermissionId: number;
  resource: string;
  fieldName: string;
  role: string;
  accessLevel: FieldAccessLevel;
};

type AccessMap = Record<string, FieldAccessLevel>;

const RESOURCES = ['users', 'pets', 'applications', 'rescues'] as const;
const ROLES = ['admin', 'moderator', 'rescue_staff', 'adopter'] as const;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const InfoBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #1e40af;
  margin-bottom: 1.5rem;

  svg {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }
`;

const TabRow = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 1.5rem;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: ${props => (props.$active ? '600' : '400')};
  color: ${props => (props.$active ? '#2563eb' : '#6b7280')};
  border-bottom: 2px solid ${props => (props.$active ? '#2563eb' : 'transparent')};
  margin-bottom: -2px;
  text-transform: capitalize;
  transition: all 0.2s;

  &:hover {
    color: #2563eb;
  }
`;

const RoleSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const RoleChip = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  border: 1px solid ${props => (props.$active ? '#2563eb' : '#d1d5db')};
  background: ${props => (props.$active ? '#2563eb' : 'white')};
  color: ${props => (props.$active ? 'white' : '#374151')};
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: capitalize;
  transition: all 0.2s;

  &:hover {
    border-color: #2563eb;
  }
`;

const FieldTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 0.75rem 1rem;
  font-weight: 600;
  font-size: 0.8rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e5e7eb;
`;

const TableRow = styled.tr<{ $modified?: boolean }>`
  background: ${props => (props.$modified ? '#fffbeb' : 'transparent')};

  &:hover {
    background: ${props => (props.$modified ? '#fef3c7' : '#f9fafb')};
  }
`;

const TableCell = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.875rem;
`;

const FieldName = styled.code`
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.8rem;
  padding: 0.125rem 0.375rem;
  background: #f3f4f6;
  border-radius: 4px;
`;

const AccessSelect = styled.select<{ $level: FieldAccessLevel }>`
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  background: ${props => {
    switch (props.$level) {
      case 'write':
        return '#dcfce7';
      case 'read':
        return '#dbeafe';
      case 'none':
        return '#fee2e2';
      default:
        return 'white';
    }
  }};
  color: ${props => {
    switch (props.$level) {
      case 'write':
        return '#166534';
      case 'read':
        return '#1e40af';
      case 'none':
        return '#991b1b';
      default:
        return '#374151';
    }
  }};
`;

const OverrideBadge = styled.span`
  font-size: 0.7rem;
  padding: 0.125rem 0.5rem;
  background: #fef3c7;
  color: #92400e;
  border-radius: 10px;
  font-weight: 600;
  margin-left: 0.5rem;
`;

const StatusBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
`;

const FieldPermissions: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [selectedResource, setSelectedResource] = useState<(typeof RESOURCES)[number]>('users');
  const [selectedRole, setSelectedRole] = useState<(typeof ROLES)[number]>('admin');
  const [defaults, setDefaults] = useState<AccessMap>({});
  const [overrides, setOverrides] = useState<FieldPermissionRecord[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Record<string, FieldAccessLevel>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_URL || '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authService.getToken();
      const [defaultsRes, overridesRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/field-permissions/defaults/${selectedResource}/${selectedRole}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBase}/api/v1/field-permissions/${selectedResource}/${selectedRole}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (defaultsRes.ok) {
        const defaultsData = await defaultsRes.json();
        setDefaults(defaultsData.data || {});
      }

      if (overridesRes.ok) {
        const overridesData = await overridesRes.json();
        setOverrides(overridesData.data || []);
      }

      setPendingChanges({});
    } catch (err) {
      setError('Failed to load field permissions');
    } finally {
      setLoading(false);
    }
  }, [apiBase, selectedResource, selectedRole]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [fetchData, isAuthenticated]);

  const getEffectiveLevel = (fieldName: string): FieldAccessLevel => {
    if (pendingChanges[fieldName] !== undefined) {
      return pendingChanges[fieldName];
    }
    const override = overrides.find(o => o.fieldName === fieldName);
    if (override) {
      return override.accessLevel;
    }
    return defaults[fieldName] || 'none';
  };

  const isOverridden = (fieldName: string): boolean => {
    return (
      overrides.some(o => o.fieldName === fieldName) || pendingChanges[fieldName] !== undefined
    );
  };

  const handleChange = (fieldName: string, level: FieldAccessLevel) => {
    setPendingChanges(prev => ({ ...prev, [fieldName]: level }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const token = authService.getToken();
      const bulkOverrides = Object.entries(pendingChanges).map(([fieldName, accessLevel]) => ({
        resource: selectedResource,
        fieldName,
        role: selectedRole,
        accessLevel,
      }));

      const response = await fetch(`${apiBase}/api/v1/field-permissions/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ overrides: bulkOverrides }),
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      await fetchData();
    } catch (err) {
      setError('Failed to save field permissions');
    } finally {
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
          <Heading level="h1">Field Permissions</Heading>
        </HeaderLeft>
        <HeaderActions>
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
        </HeaderActions>
      </PageHeader>

      <InfoBanner>
        <FiInfo size={16} />
        <div>
          <Text>
            Field permissions control which data fields are visible or editable for each role.
            Changes here create overrides on top of the default configuration. Fields set to{' '}
            <strong>none</strong> are completely hidden, <strong>read</strong> fields are visible
            but not editable, and <strong>write</strong> fields can be both viewed and modified.
          </Text>
        </div>
      </InfoBanner>

      <TabRow>
        {RESOURCES.map(resource => (
          <Tab
            key={resource}
            $active={selectedResource === resource}
            onClick={() => setSelectedResource(resource)}
          >
            {resource}
          </Tab>
        ))}
      </TabRow>

      <RoleSelector>
        {ROLES.map(role => (
          <RoleChip
            key={role}
            $active={selectedRole === role}
            onClick={() => setSelectedRole(role)}
          >
            {role.replace('_', ' ')}
          </RoleChip>
        ))}
      </RoleSelector>

      {error && <StatusBar style={{ background: '#fee2e2', color: '#991b1b' }}>{error}</StatusBar>}

      {pendingCount > 0 && (
        <StatusBar style={{ background: '#fffbeb', color: '#92400e' }}>
          {pendingCount} unsaved change{pendingCount > 1 ? 's' : ''}
        </StatusBar>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedResource} - {selectedRole.replace('_', ' ')} access
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Text>Loading field permissions...</Text>
          ) : fieldNames.length === 0 ? (
            <Text>No fields configured for this resource and role.</Text>
          ) : (
            <FieldTable>
              <thead>
                <tr>
                  <TableHeader>Field</TableHeader>
                  <TableHeader>Default</TableHeader>
                  <TableHeader>Effective Access</TableHeader>
                  <TableHeader>Status</TableHeader>
                </tr>
              </thead>
              <tbody>
                {fieldNames.map(fieldName => {
                  const defaultLevel = defaults[fieldName] || 'none';
                  const effectiveLevel = getEffectiveLevel(fieldName);
                  const modified = pendingChanges[fieldName] !== undefined;
                  const overridden = isOverridden(fieldName);

                  return (
                    <TableRow key={fieldName} $modified={modified}>
                      <TableCell>
                        <FieldName>{fieldName}</FieldName>
                      </TableCell>
                      <TableCell>
                        <AccessSelect $level={defaultLevel} disabled>
                          <option>{defaultLevel}</option>
                        </AccessSelect>
                      </TableCell>
                      <TableCell>
                        <AccessSelect
                          $level={effectiveLevel}
                          value={effectiveLevel}
                          onChange={e =>
                            handleChange(fieldName, e.target.value as FieldAccessLevel)
                          }
                        >
                          <option value='none'>none</option>
                          <option value='read'>read</option>
                          <option value='write'>write</option>
                        </AccessSelect>
                      </TableCell>
                      <TableCell>
                        {overridden && <OverrideBadge>Override</OverrideBadge>}
                        {modified && <OverrideBadge>Unsaved</OverrideBadge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </FieldTable>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default FieldPermissions;

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heading, SplitPaneDetail, Text } from '@adopt-dont-shop/lib.components';

import { useUsers } from '../hooks';
import type { AdminUser } from '../services/libraryServices';
import * as styles from './UsersSplitPaneDemo.css';

/**
 * ADS-654 reference implementation of the entity-detail split-pane pattern.
 *
 * This is intentionally a small, read-only surface: it shares the existing
 * admin Users list data but renders detail in a non-modal pane. The full
 * Users page migration is tracked under ADS-650.
 */
const displayName = (user: AdminUser): string => {
  const first = user.firstName ?? '';
  const last = user.lastName ?? '';
  const joined = `${first} ${last}`.trim();
  return joined.length > 0 ? joined : user.email;
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString('en-GB');
};

const DetailField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className={styles.detailField}>
    <span className={styles.detailFieldLabel}>{label}</span>
    <span className={styles.detailFieldValue}>{value}</span>
  </div>
);

const UsersSplitPaneDemo: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useUsers({ limit: 25 });

  const users: ReadonlyArray<AdminUser> = data?.data ?? [];

  const handleSelect = (id: string | null) => {
    if (id === null) {
      navigate('/users/split-pane', { replace: true });
      return;
    }
    navigate(`/users/split-pane/${id}`, { replace: true });
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <Heading level='h1'>Users (split-pane preview)</Heading>
        <Text>
          ADS-654 reference: same admin user data as <code>/users</code>, rendered with the new{' '}
          <code>SplitPaneDetail</code> layout.
        </Text>
      </div>

      {error instanceof Error && (
        <div className={styles.errorBox}>Failed to load users: {error.message}</div>
      )}

      {isLoading ? (
        <div className={styles.loading}>Loading users…</div>
      ) : (
        <SplitPaneDetail<AdminUser>
          items={users}
          getItemId={user => user.userId}
          selectedId={userId ?? null}
          onSelect={handleSelect}
          renderListItem={user => (
            <div className={styles.listRow}>
              <span className={styles.listRowName}>{displayName(user)}</span>
              <span className={styles.listRowEmail}>{user.email}</span>
            </div>
          )}
          renderDetail={user => (
            <div data-testid='user-detail'>
              <div className={styles.detailHeader}>
                <Heading level='h2'>{displayName(user)}</Heading>
                <Text>{user.email}</Text>
              </div>
              <DetailField label='User type' value={user.userType} />
              <DetailField label='Status' value={user.status} />
              <DetailField label='Email verified' value={user.emailVerified ? 'Yes' : 'No'} />
              <DetailField label='Phone' value={user.phoneNumber ?? '—'} />
              <DetailField label='City' value={user.city ?? '—'} />
              <DetailField label='Country' value={user.country ?? '—'} />
              <DetailField label='Last login' value={formatDateTime(user.lastLoginAt)} />
              <DetailField label='Joined' value={formatDateTime(user.createdAt)} />
            </div>
          )}
          emptyList={<Text>No users to display.</Text>}
          emptyDetail={<Text>Select a user from the list to view their details.</Text>}
          listAriaLabel='Users'
          detailAriaLabel='User details'
          className={styles.splitPaneContainer}
          data-testid='users-split-pane'
        />
      )}
    </div>
  );
};

export default UsersSplitPaneDemo;

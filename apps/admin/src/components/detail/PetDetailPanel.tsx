import React from 'react';
import { EntityInspector, type EntityInspectorTab, Spinner } from '@adopt-dont-shop/lib.components';
import { formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import { FiPackage, FiHome, FiCalendar, FiClock, FiTag, FiArchive, FiStar } from 'react-icons/fi';
import type { AdminPet } from '@/services/petService';
import { useEntityActivity } from '../../hooks';
import * as styles from './PetDetailPanel.css';

type PetDetailPanelProps = {
  pet: AdminPet;
  onClose: () => void;
};

const formatDate = (value?: string) => {
  if (!value) {
    return '—';
  }
  return formatDisplayDate(value, { includeTime: true });
};

const getStatusBadge = (status: string, archived: boolean): React.ReactElement => {
  if (archived) {
    return <span className={styles.badgeNeutral}>Archived</span>;
  }
  switch (status) {
    case 'available':
      return <span className={styles.badgeSuccess}>Available</span>;
    case 'adopted':
      return <span className={styles.badgeInfo}>Adopted</span>;
    case 'foster':
      return <span className={styles.badgeWarning}>Foster</span>;
    default:
      return <span className={styles.badgeNeutral}>Unavailable</span>;
  }
};

// ── Overview Tab ──────────────────────────────────────────────────

const DetailField: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  emptyText?: string;
}> = ({ icon, label, value, emptyText = 'Not provided' }) => (
  <div className={styles.detailItem}>
    <div className={styles.detailLabel}>
      {icon}
      {label}
    </div>
    <div className={styles.detailValue}>
      {value ? value : <span className={styles.emptyValue}>{emptyText}</span>}
    </div>
  </div>
);

const OverviewTab: React.FC<{ pet: AdminPet }> = ({ pet }) => (
  <div className={styles.detailGrid}>
    <DetailField icon={<FiTag />} label='ID' value={pet.petId} />
    <DetailField icon={<FiPackage />} label='Type' value={pet.type} />
    <DetailField icon={<FiPackage />} label='Breed' value={pet.breed} />
    <DetailField icon={<FiTag />} label='Status' value={pet.status} />
    <DetailField icon={<FiArchive />} label='Archived' value={pet.archived ? 'Yes' : 'No'} />
    <DetailField icon={<FiStar />} label='Featured' value={pet.featured ? 'Yes' : 'No'} />
    <DetailField icon={<FiHome />} label='Rescue' value={pet.rescueName ?? pet.rescueId} />
    <DetailField icon={<FiCalendar />} label='Created' value={formatDate(pet.createdAt)} />
    <DetailField icon={<FiClock />} label='Updated' value={formatDate(pet.updatedAt)} />
  </div>
);

// ── Activity Tab ──────────────────────────────────────────────────

const ActivityTab: React.FC<{ petId: string }> = ({ petId }) => {
  const { data, isLoading, error } = useEntityActivity('pet', petId);

  if (isLoading) {
    return (
      <div className={styles.activityEmpty}>
        <Spinner size='sm' label='Loading activity' />
      </div>
    );
  }

  if (error) {
    return <div className={styles.activityEmpty}>Failed to load activity history.</div>;
  }

  const activities = data ?? [];

  if (activities.length === 0) {
    return <div className={styles.activityEmpty}>No activity recorded for this pet.</div>;
  }

  return (
    <div className={styles.activityList}>
      {activities.map(activity => (
        <div key={activity.activityId} className={styles.activityItem}>
          <div className={styles.activityDot} />
          <div className={styles.activityContent}>
            <p className={styles.activityDescription}>{activity.description}</p>
            <p className={styles.activityMeta}>
              {activity.activityType} &middot;{' '}
              {new Date(activity.createdAt).toLocaleString('en-GB')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Main Panel ────────────────────────────────────────────────────

export const PetDetailPanel: React.FC<PetDetailPanelProps> = ({ pet, onClose }) => {
  const tabs: EntityInspectorTab[] = [
    { id: 'overview', label: 'Overview', content: <OverviewTab pet={pet} /> },
    { id: 'activity', label: 'Activity', content: <ActivityTab petId={pet.petId} /> },
  ];

  return (
    <EntityInspector
      data-testid='pet-detail-panel'
      resetTabsOnKeyChange={pet.petId}
      onClose={onClose}
      closeLabel='Close pet detail'
      tabs={tabs}
      header={
        <>
          <div className={styles.avatar}>
            <FiPackage />
          </div>
          <div className={styles.headerInfo}>
            <h3 className={styles.headerName}>{pet.name}</h3>
            <p className={styles.headerSubtitle}>
              {pet.type} &middot; {pet.breed}
            </p>
          </div>
          <div className={styles.headerBadges}>{getStatusBadge(pet.status, pet.archived)}</div>
        </>
      }
    />
  );
};

export default PetDetailPanel;

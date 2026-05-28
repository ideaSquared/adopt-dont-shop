import React, { useState, useEffect } from 'react';
import {
  Heading,
  Text,
  Button,
  Skeleton,
  SkeletonText,
  Spinner,
  EntityInspector,
  type EntityInspectorTab,
} from '@adopt-dont-shop/lib.components';
import { rescueStatusLabel, type RescueStatus } from '@adopt-dont-shop/lib.types';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';
import type { AdminRescue, RescueStatistics } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';
import { useEntityActivity } from '../../../hooks';
import * as styles from '../RescueDetailModal.css';
import { OverviewTab } from './OverviewTab';
import { ContactTab } from './ContactTab';
import { PoliciesTab } from './PoliciesTab';
import { StaffTab } from './StaffTab';
import { ListingsTab } from './ListingsTab';
import { PlanTab } from './PlanTab';

type RescueDetailModalProps = {
  rescueId: string;
  onClose: () => void;
  onUpdate?: () => void;
  onApprove?: (rescue: AdminRescue) => void;
  onReject?: (rescue: AdminRescue) => void;
};

const formatDate = (dateString?: string): string => {
  if (!dateString) {
    return 'N/A';
  }
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getStatusBadge = (status: RescueStatus) => {
  const label = rescueStatusLabel(status);
  switch (status) {
    case 'verified':
      return <span className={styles.badgeSuccess}>{label}</span>;
    case 'pending':
      return <span className={styles.badgeWarning}>{label}</span>;
    default:
      return <span className={styles.badgeDanger}>{label}</span>;
  }
};

const ActivityTab: React.FC<{ rescueId: string }> = ({ rescueId }) => {
  const { data, isLoading, error } = useEntityActivity('rescue', rescueId);

  if (isLoading) {
    return (
      <div className={styles.loadingSpinner}>
        <Spinner size='sm' label='Loading activity' />
      </div>
    );
  }

  if (error) {
    return <div className={styles.errorMessage}>Failed to load activity history.</div>;
  }

  const activities = data ?? [];

  if (activities.length === 0) {
    return <div className={styles.loadingSpinner}>No activity recorded for this rescue.</div>;
  }

  return (
    <div className={styles.staffList}>
      {activities.map(activity => (
        <div key={activity.activityId} className={styles.staffCard}>
          <div className={styles.staffInfo}>
            <div className={styles.staffName}>{activity.description}</div>
            <div className={styles.staffMeta}>
              {activity.activityType} &middot;{' '}
              {new Date(activity.createdAt).toLocaleString('en-GB')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const RescueDetailModal: React.FC<RescueDetailModalProps> = ({
  rescueId,
  onClose,
  onUpdate,
  onApprove,
  onReject,
}) => {
  const [rescue, setRescue] = useState<AdminRescue | null>(null);
  const [, setStatistics] = useState<RescueStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRescueDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const rescueData = await rescueService.getById(rescueId, { includeStats: true });
        setRescue(rescueData);

        if (rescueData.statistics) {
          setStatistics(rescueData.statistics);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rescue details');
      } finally {
        setLoading(false);
      }
    };

    fetchRescueDetails();
  }, [rescueId]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const tabs: EntityInspectorTab[] = rescue
    ? [
        { id: 'overview', label: 'Overview', content: <OverviewTab rescue={rescue} /> },
        { id: 'contact', label: 'Contact Info', content: <ContactTab rescue={rescue} /> },
        { id: 'policies', label: 'Policies', content: <PoliciesTab rescue={rescue} /> },
        { id: 'staff', label: 'Staff', content: <StaffTab rescueId={rescueId} /> },
        { id: 'listings', label: 'Listings', content: <ListingsTab rescueId={rescueId} /> },
        {
          id: 'plan',
          label: 'Plan',
          content: (
            <PlanTab
              rescueId={rescueId}
              rescue={rescue}
              onUpdate={onUpdate}
              onRescueUpdated={setRescue}
            />
          ),
        },
        { id: 'activity', label: 'Activity', content: <ActivityTab rescueId={rescueId} /> },
      ]
    : [];

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role='presentation'
    >
      <div className={styles.modalContainer}>
        {loading && (
          <div aria-label='Loading rescue details' className={styles.skeletonContent}>
            <div className={styles.skeletonAvatarRow}>
              <Skeleton width='4rem' height='4rem' radius='50%' />
              <div className={styles.skeletonAvatarText}>
                <Skeleton height='1.25rem' width='50%' className={styles.skeletonName} />
                <Skeleton height='0.875rem' width='30%' />
              </div>
            </div>
            <SkeletonText lines={4} lastLineWidth='40%' />
            <SkeletonText lines={3} lastLineWidth='55%' />
          </div>
        )}

        {error && <div className={styles.errorMessage}>{error}</div>}

        {!loading && rescue && (
          <EntityInspector
            data-testid='rescue-detail-panel'
            resetTabsOnKeyChange={rescue.rescueId}
            onClose={onClose}
            closeLabel='Close rescue details'
            tabs={tabs}
            header={
              <div className={styles.headerContent}>
                <Heading level='h2'>{rescue.name || 'Rescue Details'}</Heading>
                <Text className={styles.headerSpacing}>
                  {getStatusBadge(rescue.status)} &bull; Registered {formatDate(rescue.createdAt)}
                </Text>
              </div>
            }
          />
        )}

        {!loading && rescue && rescue.status === 'pending' && (onApprove || onReject) && (
          <div className={styles.modalFooter}>
            {onReject && (
              <Button variant='danger' onClick={() => onReject(rescue)}>
                <FiXCircle style={{ marginRight: '0.5rem' }} />
                Reject
              </Button>
            )}
            {onApprove && (
              <Button variant='primary' onClick={() => onApprove(rescue)}>
                <FiCheckCircle style={{ marginRight: '0.5rem' }} />
                Approve
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

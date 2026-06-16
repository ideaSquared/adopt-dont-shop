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
import { FiCheckCircle, FiXCircle, FiMail } from 'react-icons/fi';
import type { AdminRescue, RescueStatistics } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';
import { useEntityActivity } from '../../hooks';
import * as styles from '../modals/RescueDetailModal.css';
import { OverviewTab } from '../modals/RescueDetailModal/OverviewTab';
import { ContactTab } from '../modals/RescueDetailModal/ContactTab';
import { PoliciesTab } from '../modals/RescueDetailModal/PoliciesTab';
import { StaffTab } from '../modals/RescueDetailModal/StaffTab';
import { ListingsTab } from '../modals/RescueDetailModal/ListingsTab';
import { PlanTab } from '../modals/RescueDetailModal/PlanTab';

type RescueDetailPanelProps = {
  rescueId: string;
  onClose: () => void;
  onUpdate?: () => void;
  onApprove?: (rescue: AdminRescue) => void;
  onReject?: (rescue: AdminRescue) => void;
  onSendEmail?: (rescue: AdminRescue) => void;
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

const ActionsTab: React.FC<{
  rescue: AdminRescue;
  onApprove?: (rescue: AdminRescue) => void;
  onReject?: (rescue: AdminRescue) => void;
  onSendEmail?: (rescue: AdminRescue) => void;
}> = ({ rescue, onApprove, onReject, onSendEmail }) => (
  <div className={styles.actionsSection}>
    {rescue.status === 'pending' && (onApprove || onReject) && (
      <div className={styles.actionGroup}>
        <span className={styles.actionGroupLabel}>Verification</span>
        {onApprove && (
          <Button variant='primary' onClick={() => onApprove(rescue)}>
            <FiCheckCircle className={styles.actionButtonIcon} />
            Approve
          </Button>
        )}
        {onReject && (
          <Button variant='danger' onClick={() => onReject(rescue)}>
            <FiXCircle className={styles.actionButtonIcon} />
            Reject
          </Button>
        )}
      </div>
    )}
    {onSendEmail && (
      <div className={styles.actionGroup}>
        <span className={styles.actionGroupLabel}>Communication</span>
        <Button variant='secondary' onClick={() => onSendEmail(rescue)}>
          <FiMail className={styles.actionButtonIcon} />
          Send Email
        </Button>
      </div>
    )}
  </div>
);

export const RescueDetailPanel: React.FC<RescueDetailPanelProps> = ({
  rescueId,
  onClose,
  onUpdate,
  onApprove,
  onReject,
  onSendEmail,
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

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  if (!rescue) {
    return null;
  }

  const tabs: EntityInspectorTab[] = [
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
    {
      id: 'actions',
      label: 'Actions',
      content: (
        <ActionsTab
          rescue={rescue}
          onApprove={onApprove}
          onReject={onReject}
          onSendEmail={onSendEmail}
        />
      ),
    },
  ];

  return (
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
  );
};

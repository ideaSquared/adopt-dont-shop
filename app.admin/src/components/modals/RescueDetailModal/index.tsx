import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Heading, Text } from '@adopt-dont-shop/lib.components';
import { Skeleton, SkeletonText } from '../../ui/Skeleton';
import { FiX } from 'react-icons/fi';
import type { AdminRescue, RescueStatistics } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';
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
};

type ActiveTab = 'overview' | 'contact' | 'policies' | 'staff' | 'listings' | 'plan';

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'verified':
      return <span className={styles.badgeSuccess}>Verified</span>;
    case 'pending':
      return <span className={styles.badgeWarning}>Pending</span>;
    default:
      return <span className={styles.badgeDanger}>{status}</span>;
  }
};

export const RescueDetailModal: React.FC<RescueDetailModalProps> = ({
  rescueId,
  onClose,
  onUpdate,
}) => {
  const [rescue, setRescue] = useState<AdminRescue | null>(null);
  const [, setStatistics] = useState<RescueStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

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
    if (e.target === e.currentTarget) onClose();
  };

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'contact', label: 'Contact Info' },
    { id: 'policies', label: 'Policies' },
    { id: 'staff', label: 'Staff' },
    { id: 'listings', label: 'Listings' },
    { id: 'plan', label: 'Plan' },
  ];

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role='presentation'
    >
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <Heading level='h2'>{rescue?.name || 'Rescue Details'}</Heading>
            {rescue && (
              <Text style={{ marginTop: '0.5rem' }}>
                {getStatusBadge(rescue.status)} • Registered {formatDate(rescue.createdAt)}
              </Text>
            )}
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className={styles.tabContainer}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={clsx(styles.tab, activeTab === tab.id && styles.tabActive)}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.modalBody}>
          {loading && (
            <div
              aria-label='Loading rescue details'
              style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Skeleton width='4rem' height='4rem' radius='50%' />
                <div style={{ flex: 1 }}>
                  <Skeleton height='1.25rem' width='50%' style={{ marginBottom: '0.5rem' }} />
                  <Skeleton height='0.875rem' width='30%' />
                </div>
              </div>
              <SkeletonText lines={4} lastLineWidth='40%' />
              <SkeletonText lines={3} lastLineWidth='55%' />
            </div>
          )}

          {error && <div className={styles.errorMessage}>{error}</div>}

          {!loading && rescue && (
            <>
              {activeTab === 'overview' && <OverviewTab rescue={rescue} />}
              {activeTab === 'contact' && <ContactTab rescue={rescue} />}
              {activeTab === 'policies' && <PoliciesTab rescue={rescue} />}
              {activeTab === 'staff' && <StaffTab rescueId={rescueId} />}
              {activeTab === 'listings' && <ListingsTab rescueId={rescueId} />}
              {activeTab === 'plan' && (
                <PlanTab
                  rescueId={rescueId}
                  rescue={rescue}
                  onUpdate={onUpdate}
                  onRescueUpdated={setRescue}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

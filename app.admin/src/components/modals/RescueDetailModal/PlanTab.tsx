import React, { useState } from 'react';
import * as styles from '../RescueDetailModal.css';
import { Button } from '@adopt-dont-shop/lib.components';
import type { AdminRescue, RescuePlan } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';

type PlanTabProps = {
  rescueId: string;
  rescue: AdminRescue;
  onUpdate?: () => void;
  onRescueUpdated: (updated: AdminRescue) => void;
};

export const PlanTab: React.FC<PlanTabProps> = ({
  rescueId,
  rescue,
  onUpdate,
  onRescueUpdated,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<RescuePlan>(rescue.plan ?? 'free');
  const [planExpiresAt, setPlanExpiresAt] = useState<string>(rescue.planExpiresAt ?? '');
  const [savingPlan, setSavingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planSuccess, setPlanSuccess] = useState(false);

  const handleUpdatePlan = async () => {
    try {
      setSavingPlan(true);
      setPlanError(null);
      setPlanSuccess(false);

      const updated = await rescueService.updatePlan(rescueId, {
        plan: selectedPlan,
        planExpiresAt: planExpiresAt || null,
      });

      onRescueUpdated(updated);
      setPlanSuccess(true);
      onUpdate?.();
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Subscription Plan</h3>

      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Current Plan</div>
          <div className={styles.infoValue}>
            <span
              className={
                rescue.plan === 'professional'
                  ? styles.badgeSuccess
                  : rescue.plan === 'growth'
                    ? styles.badgeWarning
                    : styles.badgeDanger
              }
            >
              {rescue.plan ?? 'free'}
            </span>
          </div>
        </div>
        {rescue.planLimits && (
          <>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Staff Seats</div>
              <div className={styles.infoValue}>
                {rescue.planLimits.maxStaffSeats ?? 'Unlimited'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Active Pet Listings</div>
              <div className={styles.infoValue}>
                {rescue.planLimits.maxActivePets ?? 'Unlimited'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Analytics History</div>
              <div className={styles.infoValue}>
                {rescue.planLimits.analyticsHistoryDays === null
                  ? 'None'
                  : rescue.planLimits.analyticsHistoryDays === 0
                    ? 'Full history'
                    : `${rescue.planLimits.analyticsHistoryDays} days`}
              </div>
            </div>
          </>
        )}
      </div>

      <div className={styles.inviteForm} style={{ marginTop: '1.5rem' }}>
        <h4 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', color: '#111827' }}>Change Plan</h4>

        {planError && (
          <div className={styles.errorMessage} style={{ marginBottom: '1rem' }}>
            {planError}
          </div>
        )}
        {planSuccess && (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '0.375rem',
              color: '#166534',
              fontSize: '0.875rem',
            }}
          >
            Plan updated successfully.
          </div>
        )}

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor='plan-select'>
              Plan Tier
            </label>
            <select
              id='plan-select'
              className={styles.input}
              value={selectedPlan}
              onChange={e => {
                setSelectedPlan(e.target.value as RescuePlan);
                setPlanSuccess(false);
              }}
              disabled={savingPlan}
            >
              <option value='free'>Free</option>
              <option value='growth'>Growth</option>
              <option value='professional'>Professional</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor='plan-expires-at'>
              Plan Expires At (optional)
            </label>
            <input
              id='plan-expires-at'
              className={styles.input}
              type='datetime-local'
              value={planExpiresAt ? planExpiresAt.slice(0, 16) : ''}
              onChange={e => {
                setPlanExpiresAt(e.target.value ? `${e.target.value}:00.000Z` : '');
                setPlanSuccess(false);
              }}
              disabled={savingPlan}
            />
          </div>
        </div>

        <div className={styles.formActions}>
          <Button
            variant='primary'
            size='sm'
            onClick={handleUpdatePlan}
            disabled={savingPlan || selectedPlan === (rescue.plan ?? 'free')}
          >
            {savingPlan ? 'Saving...' : 'Save Plan'}
          </Button>
        </div>
      </div>
    </div>
  );
};

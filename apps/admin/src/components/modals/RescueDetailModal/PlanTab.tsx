import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import * as styles from '../RescueDetailModal.css';
import {
  Alert,
  Button,
  FormField,
  Input,
  SelectInput,
  StatusBadge,
  toast,
} from '@adopt-dont-shop/lib.components';
import type { AdminRescue, RescuePlan } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';

const PLAN_OPTIONS: ReadonlyArray<{ value: RescuePlan; label: string }> = [
  { value: 'free', label: 'Free' },
  { value: 'growth', label: 'Growth' },
  { value: 'professional', label: 'Professional' },
];

const toRescuePlan = (value: string | string[], fallback: RescuePlan): RescuePlan =>
  PLAN_OPTIONS.find(option => option.value === value)?.value ?? fallback;

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

  const updatePlan = useMutation({
    mutationFn: () =>
      rescueService.updatePlan(rescueId, {
        plan: selectedPlan,
        planExpiresAt: planExpiresAt || null,
      }),
    onSuccess: updated => {
      onRescueUpdated(updated);
      toast.success('Plan updated successfully.');
      onUpdate?.();
    },
  });

  const savingPlan = updatePlan.isPending;
  const planError = updatePlan.error
    ? updatePlan.error instanceof Error
      ? updatePlan.error.message
      : 'Failed to update plan'
    : null;

  const handleUpdatePlan = () => updatePlan.mutate();

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Subscription Plan</h3>

      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Current Plan</div>
          <div className={styles.infoValue}>
            <StatusBadge
              variant={
                rescue.plan === 'professional'
                  ? 'success'
                  : rescue.plan === 'growth'
                    ? 'warning'
                    : 'error'
              }
              label={rescue.plan ?? 'free'}
            />
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

      <div className={`${styles.inviteForm} ${styles.inviteFormSpacing}`}>
        <h4 className={styles.planSectionTitle}>Change Plan</h4>

        {planError && <Alert variant='error'>{planError}</Alert>}

        <div className={styles.formRow}>
          <SelectInput
            label='Plan Tier'
            data-testid='plan-select'
            value={selectedPlan}
            onChange={value => {
              setSelectedPlan(toRescuePlan(value, selectedPlan));
              updatePlan.reset();
            }}
            options={[...PLAN_OPTIONS]}
            disabled={savingPlan}
            fullWidth
          />
          <FormField label='Plan Expires At (optional)' htmlFor='plan-expires-at'>
            <Input
              id='plan-expires-at'
              type='datetime-local'
              value={planExpiresAt ? planExpiresAt.slice(0, 16) : ''}
              onChange={e => {
                setPlanExpiresAt(e.target.value ? `${e.target.value}:00.000Z` : '');
                updatePlan.reset();
              }}
              disabled={savingPlan}
            />
          </FormField>
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

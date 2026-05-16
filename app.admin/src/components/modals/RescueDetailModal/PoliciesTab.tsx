import React from 'react';
import * as styles from '../RescueDetailModal.css';
import type { AdminRescue } from '@/types/rescue';

type PoliciesTabProps = {
  rescue: AdminRescue;
};

export const PoliciesTab: React.FC<PoliciesTabProps> = ({ rescue }) => (
  <div className={styles.section}>
    <h3 className={styles.sectionTitle}>Adoption Policies</h3>
    {rescue.adoptionPolicies ? (
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Home Visit Required</div>
          <div className={styles.infoValue}>
            {rescue.adoptionPolicies.requireHomeVisit ? 'Yes' : 'No'}
          </div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>References Required</div>
          <div className={styles.infoValue}>
            {rescue.adoptionPolicies.requireReferences ? 'Yes' : 'No'}
          </div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Minimum References</div>
          <div className={styles.infoValue}>{rescue.adoptionPolicies.minimumReferenceCount}</div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Adoption Fee Range</div>
          <div className={styles.infoValue}>
            £{rescue.adoptionPolicies.adoptionFeeRange.min} - £
            {rescue.adoptionPolicies.adoptionFeeRange.max}
          </div>
        </div>
      </div>
    ) : (
      <div className={styles.infoValue}>No adoption policies configured</div>
    )}
  </div>
);

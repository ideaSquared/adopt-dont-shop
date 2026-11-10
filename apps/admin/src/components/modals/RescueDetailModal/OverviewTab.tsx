import React from 'react';
import * as styles from '../RescueDetailModal.css';
import { MapPin } from 'lucide-react';
import { StatusBadge } from '@adopt-dont-shop/lib.components';
import type { AdminRescue } from '@/types/rescue';
import { formatRescueDate } from './format-rescue-date';

type OverviewTabProps = {
  rescue: AdminRescue;
};

export const OverviewTab: React.FC<OverviewTabProps> = ({ rescue }) => (
  <>
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Organization Information</h3>
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Organization Name</div>
          <div className={styles.infoValue}>{rescue.name}</div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Status</div>
          <div className={styles.infoValue}>
            <StatusBadge kind='rescue' status={rescue.status} />
          </div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Companies House Number</div>
          <div className={styles.infoValue}>{rescue.companiesHouseNumber || 'N/A'}</div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Charity Registration Number</div>
          <div className={styles.infoValue}>{rescue.charityRegistrationNumber || 'N/A'}</div>
        </div>
        {rescue.verificationSource && (
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Verified Via</div>
            <div className={styles.infoValue}>
              {rescue.verificationSource === 'companies_house'
                ? 'Companies House'
                : rescue.verificationSource === 'charity_commission'
                  ? 'Charity Commission'
                  : 'Manual Review'}
            </div>
          </div>
        )}
        {rescue.verificationFailureReason && (
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Verification Note</div>
            <div className={styles.infoValue}>{rescue.verificationFailureReason}</div>
          </div>
        )}
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Registered</div>
          <div className={styles.infoValue}>{formatRescueDate(rescue.createdAt)}</div>
        </div>
      </div>
    </div>

    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Location</h3>
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>
            <MapPin size='1em' /> Address
          </div>
          <div className={styles.infoValue}>{rescue.address}</div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>City</div>
          <div className={styles.infoValue}>{rescue.city}</div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>County</div>
          <div className={styles.infoValue}>{rescue.county || 'N/A'}</div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Postcode</div>
          <div className={styles.infoValue}>{rescue.postcode}</div>
        </div>
      </div>
    </div>

    {rescue.description && (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Description</h3>
        <div className={styles.infoValue}>{rescue.description}</div>
      </div>
    )}

    {rescue.mission && (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Mission</h3>
        <div className={styles.infoValue}>{rescue.mission}</div>
      </div>
    )}
  </>
);

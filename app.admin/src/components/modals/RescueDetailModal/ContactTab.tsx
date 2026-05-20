import React from 'react';
import * as styles from '../RescueDetailModal.css';
import { FiMail, FiPhone, FiGlobe } from 'react-icons/fi';
import type { AdminRescue } from '@/types/rescue';

type ContactTabProps = {
  rescue: AdminRescue;
};

export const ContactTab: React.FC<ContactTabProps> = ({ rescue }) => (
  <div className={styles.section}>
    <h3 className={styles.sectionTitle}>Contact Details</h3>
    <div className={styles.infoGrid}>
      <div className={styles.infoItem}>
        <div className={styles.infoLabel}>
          <FiMail /> Email
        </div>
        <div className={styles.infoValue}>{rescue.email}</div>
      </div>
      <div className={styles.infoItem}>
        <div className={styles.infoLabel}>
          <FiPhone /> Phone
        </div>
        <div className={styles.infoValue}>{rescue.phone || 'N/A'}</div>
      </div>
      <div className={styles.infoItem}>
        <div className={styles.infoLabel}>
          <FiGlobe /> Website
        </div>
        <div className={styles.infoValue}>
          {rescue.website ? (
            <a href={rescue.website} target='_blank' rel='noopener noreferrer'>
              {rescue.website}
            </a>
          ) : (
            'N/A'
          )}
        </div>
      </div>
      <div className={styles.infoItem}>
        <div className={styles.infoLabel}>Contact Person</div>
        <div className={styles.infoValue}>{rescue.contactPerson || 'N/A'}</div>
      </div>
    </div>
  </div>
);

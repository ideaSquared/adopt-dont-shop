import React from 'react';
import * as styles from './PreFilledBadge.css';

type Props = {
  label?: string;
};

export const PreFilledBadge: React.FC<Props> = ({ label = 'Pre-filled from your profile' }) => (
  <span className={styles.chip} title={label} aria-label={label}>
    <span aria-hidden='true'>✨</span>
    <span>Pre-filled</span>
  </span>
);

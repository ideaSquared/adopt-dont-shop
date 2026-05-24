import React from 'react';
import { Skeleton } from '@adopt-dont-shop/lib.components';
import * as styles from './SettingsFormSkeleton.css';

export const SettingsFormSkeleton: React.FC = () => (
  <div className={styles.container} aria-hidden="true">
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className={styles.fieldGroup}>
        <Skeleton height="0.75rem" width={`${80 + (i % 3) * 20}px`} />
        <Skeleton height="2.5rem" width="100%" />
      </div>
    ))}
    <Skeleton height="2.5rem" width="120px" radius="4px" />
  </div>
);

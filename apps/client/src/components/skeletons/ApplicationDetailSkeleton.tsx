import React from 'react';
import { Skeleton, SkeletonText } from '@adopt-dont-shop/lib.components';
import * as styles from './ApplicationDetailSkeleton.css';

export const ApplicationDetailSkeleton: React.FC = () => (
  <div className={styles.container} aria-hidden='true'>
    <Skeleton height='1rem' width='4rem' />

    <div className={styles.headerRow}>
      <div className={styles.headerText}>
        <Skeleton height='1.75rem' width='250px' />
        <Skeleton height='0.875rem' width='180px' />
      </div>
      <Skeleton height='2rem' width='100px' radius='9999px' />
    </div>

    <div className={styles.section}>
      <Skeleton height='1rem' width='120px' />
      <SkeletonText lines={3} />
    </div>

    <div className={styles.section}>
      <Skeleton height='1rem' width='140px' />
      <SkeletonText lines={4} />
    </div>
  </div>
);

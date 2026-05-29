import React from 'react';
import { Skeleton, SkeletonText } from '@adopt-dont-shop/lib.components';
import { PetCardSkeleton } from './PetCardSkeleton';
import * as styles from './RescueDetailSkeleton.css';

export const RescueDetailSkeleton: React.FC = () => (
  <div className={styles.container} aria-hidden='true'>
    <div className={styles.header}>
      <Skeleton width='5rem' height='5rem' radius='50%' />
      <div className={styles.headerText}>
        <Skeleton height='1.75rem' width='200px' />
        <Skeleton height='0.875rem' width='300px' />
      </div>
    </div>

    <div className={styles.infoSection}>
      <Skeleton height='1.25rem' width='140px' />
      <SkeletonText lines={3} />
    </div>

    <div className={styles.infoSection}>
      <Skeleton height='1.25rem' width='180px' />
      <div className={styles.petGrid}>
        {Array.from({ length: 3 }, (_, i) => (
          <PetCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

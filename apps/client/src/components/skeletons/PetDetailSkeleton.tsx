import React from 'react';
import { Skeleton } from '@adopt-dont-shop/lib.components';
import * as styles from './PetDetailSkeleton.css';

export const PetDetailSkeleton: React.FC = () => (
  <div className={styles.container} aria-hidden='true'>
    <Skeleton height='1rem' width='4rem' radius='4px' />

    <div className={styles.header}>
      <div className={styles.titleGroup}>
        <Skeleton height='2rem' width='200px' />
        <div className={styles.subtitleRow}>
          <Skeleton height='0.875rem' width='60px' />
          <Skeleton height='0.875rem' width='80px' />
          <Skeleton height='0.875rem' width='50px' />
          <Skeleton height='0.875rem' width='60px' />
        </div>
      </div>
      <Skeleton height='2rem' width='120px' radius='9999px' />
    </div>

    <Skeleton className={styles.imagePlaceholder} height='auto' />

    <div className={styles.infoGrid}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={styles.infoItem}>
          <Skeleton height='0.75rem' width='40%' />
          <Skeleton height='1rem' width='70%' />
        </div>
      ))}
    </div>

    <div className={styles.descriptionBlock}>
      <Skeleton height='1.25rem' width='120px' />
      <Skeleton height='0.875rem' width='100%' />
      <Skeleton height='0.875rem' width='100%' />
      <Skeleton height='0.875rem' width='75%' />
    </div>
  </div>
);

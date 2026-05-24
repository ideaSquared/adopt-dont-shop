import React from 'react';
import { Skeleton } from '@adopt-dont-shop/lib.components';
import * as styles from './PetCardSkeleton.css';

export const PetCardSkeleton: React.FC = () => (
  <div className={styles.card} aria-hidden='true'>
    <Skeleton className={styles.imagePlaceholder} height='auto' radius='0' />
    <div className={styles.content}>
      <Skeleton height='1.25rem' width='60%' />
      <div className={styles.detailRow}>
        <Skeleton height='0.75rem' width='30%' />
        <Skeleton height='0.75rem' width='40%' />
      </div>
      <div className={styles.detailRow}>
        <Skeleton height='0.75rem' width='25%' />
        <Skeleton height='0.75rem' width='35%' />
      </div>
      <div className={styles.detailRow}>
        <Skeleton height='0.75rem' width='28%' />
        <Skeleton height='0.75rem' width='30%' />
      </div>
      <Skeleton height='0.75rem' width='90%' />
      <Skeleton height='0.75rem' width='70%' />
    </div>
  </div>
);

type PetCardSkeletonGridProps = {
  count?: number;
};

export const PetCardSkeletonGrid: React.FC<PetCardSkeletonGridProps> = ({ count = 6 }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <PetCardSkeleton key={i} />
    ))}
  </>
);

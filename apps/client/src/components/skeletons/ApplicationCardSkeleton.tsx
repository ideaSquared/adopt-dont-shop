import React from 'react';
import { Skeleton } from '@adopt-dont-shop/lib.components';
import * as styles from './ApplicationCardSkeleton.css';

const ApplicationCardSkeleton: React.FC = () => (
  <div className={styles.card} aria-hidden='true'>
    <Skeleton className={styles.imageBlock} height='auto' />
    <div className={styles.content}>
      <Skeleton height='1rem' width='50%' />
      <Skeleton height='0.75rem' width='70%' />
      <div className={styles.statusRow}>
        <Skeleton height='1.5rem' width='80px' radius='9999px' />
        <Skeleton height='0.75rem' width='100px' />
      </div>
    </div>
  </div>
);

type ApplicationCardSkeletonListProps = {
  count?: number;
};

export const ApplicationCardSkeletonList: React.FC<ApplicationCardSkeletonListProps> = ({
  count = 3,
}) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <ApplicationCardSkeleton key={i} />
    ))}
  </>
);

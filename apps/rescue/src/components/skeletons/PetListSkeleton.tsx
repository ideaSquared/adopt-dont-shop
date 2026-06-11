import React from 'react';
import { Skeleton } from '@adopt-dont-shop/lib.components';
import * as styles from './PetListSkeleton.css';

export const PetListSkeleton: React.FC = () => (
  <div className={styles.container} aria-hidden="true">
    <Skeleton className={styles.searchBar} height="2.5rem" width="100%" />
    {Array.from({ length: 5 }, (_, i) => (
      <div key={i} className={styles.petRow}>
        <Skeleton className={styles.imageBlock} height="auto" />
        <div className={styles.textBlock}>
          <Skeleton height="1rem" width="40%" />
          <Skeleton height="0.75rem" width="60%" />
        </div>
        <div className={styles.actions}>
          <Skeleton height="2rem" width="60px" radius="4px" />
          <Skeleton height="2rem" width="60px" radius="4px" />
        </div>
      </div>
    ))}
  </div>
);

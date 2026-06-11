import React from 'react';
import { Skeleton, SkeletonText } from '@adopt-dont-shop/lib.components';
import * as styles from './DashboardSkeleton.css';

export const DashboardSkeleton: React.FC = () => (
  <div aria-hidden="true">
    <div className={styles.metricsGrid}>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className={styles.metricCard}>
          <Skeleton height="0.75rem" width="60%" />
          <Skeleton height="2rem" width="40%" />
          <Skeleton height="0.625rem" width="80%" />
        </div>
      ))}
    </div>

    <div className={styles.analyticsGrid}>
      <div className={styles.chartCard}>
        <Skeleton height="1rem" width="150px" />
        <Skeleton height="200px" width="100%" />
      </div>
      <div className={styles.chartCard}>
        <Skeleton height="1rem" width="180px" />
        <div className={styles.activityLines}>
          <SkeletonText lines={5} />
        </div>
      </div>
      <div className={styles.chartCard}>
        <Skeleton height="1rem" width="140px" />
        <div className={styles.activityLines}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Skeleton height="0.625rem" width="80px" />
              <Skeleton height="0.875rem" width="100%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

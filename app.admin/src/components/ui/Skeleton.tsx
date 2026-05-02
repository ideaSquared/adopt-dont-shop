import React from 'react';
import clsx from 'clsx';
import * as styles from './Skeleton.css';

type SkeletonProps = {
  width?: string;
  height?: string;
  radius?: string;
  className?: string;
  style?: React.CSSProperties;
};

export const Skeleton: React.FC<SkeletonProps> = ({ width, height, radius, className, style }) => (
  <div
    className={clsx(styles.skeletonBase, className)}
    style={{
      width: width ?? '100%',
      height: height ?? '1rem',
      borderRadius: radius ?? '4px',
      ...style,
    }}
  />
);

type SkeletonTextProps = {
  lines?: number;
  lastLineWidth?: string;
};

export const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 3, lastLineWidth = '60%' }) => (
  <div>
    {Array.from({ length: lines }, (_, i) => (
      <div
        key={i}
        className={clsx(styles.skeletonBase, styles.textLine)}
        style={{
          height: '0.875rem',
          width: i === lines - 1 ? lastLineWidth : '100%',
          borderRadius: '4px',
        }}
      />
    ))}
  </div>
);

type SkeletonTableRowProps = {
  columnCount: number;
  hasCheckbox?: boolean;
};

export const SkeletonTableRow: React.FC<SkeletonTableRowProps> = ({
  columnCount,
  hasCheckbox = false,
}) => (
  <tr aria-hidden='true' data-testid='skeleton-row'>
    {hasCheckbox && (
      <td style={{ padding: '1rem' }}>
        <div className={styles.skeletonBase} style={{ width: '1rem', height: '1rem', borderRadius: '2px' }} />
      </td>
    )}
    {Array.from({ length: columnCount }, (_, i) => (
      <td key={i} style={{ padding: '1rem' }}>
        <div className={styles.cellContainer}>
          {i === 0 ? (
            <>
              <div
                className={styles.skeletonBase}
                style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div
                  className={styles.skeletonBase}
                  style={{ height: '0.875rem', borderRadius: '4px', marginBottom: '0.25rem' }}
                />
                <div
                  className={styles.skeletonBase}
                  style={{ height: '0.75rem', width: '70%', borderRadius: '4px' }}
                />
              </div>
            </>
          ) : (
            <div
              className={styles.skeletonBase}
              style={{ height: '0.875rem', width: i % 3 === 0 ? '60%' : '80%', borderRadius: '4px' }}
            />
          )}
        </div>
      </td>
    ))}
  </tr>
);

type SkeletonCardProps = {
  lines?: number;
  showAvatar?: boolean;
};

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3, showAvatar = false }) => (
  <div className={styles.cardContainer} aria-hidden='true'>
    {showAvatar && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div
          className={styles.skeletonBase}
          style={{ width: '3rem', height: '3rem', borderRadius: '50%', flexShrink: 0 }}
        />
        <div style={{ flex: 1 }}>
          <div
            className={styles.skeletonBase}
            style={{ height: '1rem', borderRadius: '4px', marginBottom: '0.375rem' }}
          />
          <div
            className={styles.skeletonBase}
            style={{ height: '0.875rem', width: '60%', borderRadius: '4px' }}
          />
        </div>
      </div>
    )}
    <SkeletonText lines={lines} />
  </div>
);

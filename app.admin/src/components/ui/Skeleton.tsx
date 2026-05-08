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
        className={clsx(styles.skeletonBase, styles.textLine, styles.genericTextRow)}
        style={{ width: i === lines - 1 ? lastLineWidth : '100%' }}
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
      <td className={styles.tableCell}>
        <div className={clsx(styles.skeletonBase, styles.checkboxSkeleton)} />
      </td>
    )}
    {Array.from({ length: columnCount }, (_, i) => (
      <td key={i} className={styles.tableCell}>
        <div className={styles.cellContainer}>
          {i === 0 ? (
            <>
              <div className={clsx(styles.skeletonBase, styles.avatarSkeleton)} />
              <div className={styles.flexFill}>
                <div className={clsx(styles.skeletonBase, styles.textRowPrimary)} />
                <div className={clsx(styles.skeletonBase, styles.textRowSecondary)} />
              </div>
            </>
          ) : (
            <div
              className={clsx(styles.skeletonBase, styles.genericTextRow)}
              style={{ width: i % 3 === 0 ? '60%' : '80%' }}
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
      <div className={styles.avatarRow}>
        <div className={clsx(styles.skeletonBase, styles.avatarLarge)} />
        <div className={styles.flexFill}>
          <div className={clsx(styles.skeletonBase, styles.cardTextPrimary)} />
          <div className={clsx(styles.skeletonBase, styles.cardTextSecondary)} />
        </div>
      </div>
    )}
    <SkeletonText lines={lines} />
  </div>
);

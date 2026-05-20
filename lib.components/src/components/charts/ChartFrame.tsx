import React from 'react';
import clsx from 'clsx';
import * as styles from './ChartFrame.css';

/**
 * ADS-105: Common frame around a chart widget.
 *
 * Owns the title, loading/empty/error states, and the action slot
 * (refresh, drill-down trigger, export). Concrete chart components
 * compose it as their outer shell so the visual language stays
 * consistent between LineChart, BarChart, PieChart, etc.
 */

export type ChartFrameProps = {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /** Called when the user clicks the body (drill-down). */
  onClick?: () => void;
};

export const ChartFrame: React.FC<ChartFrameProps> = ({
  title,
  subtitle,
  isLoading,
  error,
  isEmpty,
  emptyMessage = 'No data',
  actions,
  children,
  onClick,
}) => (
  <div
    className={styles.frame}
    onClick={onClick}
    onKeyDown={
      onClick
        ? e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }
        : undefined
    }
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    data-testid='chart-frame'
  >
    <div className={styles.header}>
      <div>
        <h4 className={styles.title}>{title}</h4>
        {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
    <div className={styles.body}>
      {isLoading ? (
        <div className={styles.state} data-testid='chart-loading'>
          Loading…
        </div>
      ) : error ? (
        <div className={clsx(styles.state, styles.stateError)} data-testid='chart-error'>
          {error.message}
        </div>
      ) : isEmpty ? (
        <div className={styles.state} data-testid='chart-empty'>
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

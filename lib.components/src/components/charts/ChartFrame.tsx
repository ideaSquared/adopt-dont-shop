import React from 'react';

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

const frameStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--color-surface, #fff)',
  border: '1px solid var(--color-border, #e5e7eb)',
  borderRadius: '8px',
  padding: '16px',
  height: '100%',
  minHeight: '220px',
  boxSizing: 'border-box',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '8px',
  marginBottom: '12px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--color-text, #111827)',
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-text-muted, #6b7280)',
  marginTop: '2px',
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  minHeight: 0,
};

const stateStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-muted, #6b7280)',
  fontSize: '13px',
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
    style={frameStyle}
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
    <div style={headerStyle}>
      <div>
        <h4 style={titleStyle}>{title}</h4>
        {subtitle ? <div style={subtitleStyle}>{subtitle}</div> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
    <div style={bodyStyle}>
      {isLoading ? (
        <div style={stateStyle} data-testid='chart-loading'>
          Loading…
        </div>
      ) : error ? (
        <div
          style={{ ...stateStyle, color: 'var(--color-danger, #dc2626)' }}
          data-testid='chart-error'
        >
          {error.message}
        </div>
      ) : isEmpty ? (
        <div style={stateStyle} data-testid='chart-empty'>
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

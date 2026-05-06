import React from 'react';

export type MetricCardFormat = 'number' | 'percent' | 'currency' | 'duration';

export type MetricCardProps = {
  label: string;
  value: number | string;
  delta?: number;
  /** When true, a positive delta is displayed in red (e.g. error rate going up). */
  deltaInverted?: boolean;
  format?: MetricCardFormat;
  helperText?: string;
};

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--color-surface, #fff)',
  border: '1px solid var(--color-border, #e5e7eb)',
  borderRadius: '8px',
  padding: '16px',
  height: '100%',
  minHeight: '110px',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-muted, #6b7280)',
  margin: 0,
};

const valueStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: 'var(--color-text, #111827)',
  margin: '4px 0',
};

const helperStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-text-muted, #6b7280)',
};

const formatValue = (value: number | string, format: MetricCardFormat | undefined): string => {
  if (typeof value !== 'number') {
    return String(value);
  }
  if (format === 'percent') {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (format === 'currency') {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (format === 'duration') {
    // Treat numeric value as seconds.
    const totalSec = Math.round(value);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
  return new Intl.NumberFormat(undefined).format(value);
};

const deltaColor = (delta: number, inverted: boolean): string => {
  const positiveIsGood = !inverted;
  if (delta === 0) {
    return 'var(--color-text-muted, #6b7280)';
  }
  if ((delta > 0 && positiveIsGood) || (delta < 0 && !positiveIsGood)) {
    return 'var(--color-success, #16a34a)';
  }
  return 'var(--color-danger, #dc2626)';
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  delta,
  deltaInverted,
  format,
  helperText,
}) => (
  <div style={cardStyle} data-testid='metric-card'>
    <h4 style={labelStyle}>{label}</h4>
    <div style={valueStyle}>{formatValue(value, format)}</div>
    {typeof delta === 'number' ? (
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: deltaColor(delta, !!deltaInverted),
        }}
      >
        {delta > 0 ? '+' : ''}
        {(delta * 100).toFixed(1)}%
      </div>
    ) : null}
    {helperText ? <div style={helperStyle}>{helperText}</div> : null}
  </div>
);

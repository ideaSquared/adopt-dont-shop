import React, { useEffect } from 'react';

/**
 * ADS-105: Modal/picker for adding a widget.
 *
 * Surfaces a small catalog of widget presets so the builder doesn't
 * have to hand-write JSON for every chart. Each preset embeds a
 * sensible default options shape, ready to be appended to
 * `config.widgets`.
 */

export type WidgetPreset = {
  id: string;
  label: string;
  description: string;
  template: {
    title: string;
    metric: 'adoption' | 'application' | 'user' | 'communication' | 'platform' | 'custom';
    chartType: 'line' | 'bar' | 'pie' | 'area' | 'table' | 'metric-card';
    options: Record<string, unknown>;
    position: { x: number; y: number; w: number; h: number };
  };
};

export const DEFAULT_PRESETS: WidgetPreset[] = [
  {
    id: 'adoptions-trend',
    label: 'Adoption trends',
    description: 'Line chart of completed adoptions over time.',
    template: {
      title: 'Adoptions over time',
      metric: 'adoption',
      chartType: 'line',
      options: {
        xKey: 'date',
        series: [{ key: 'count', label: 'Adoptions', color: '#16a34a' }],
        showLegend: true,
      },
      position: { x: 0, y: 0, w: 4, h: 3 },
    },
  },
  {
    id: 'pet-types',
    label: 'Popular pet types',
    description: 'Pie chart of adoption volume by species.',
    template: {
      title: 'Pet types',
      metric: 'adoption',
      chartType: 'pie',
      options: { labelKey: 'type', valueKey: 'count', donut: true },
      position: { x: 0, y: 3, w: 2, h: 3 },
    },
  },
  {
    id: 'application-funnel',
    label: 'Application funnel',
    description: 'Stacked bar chart of applications by status.',
    template: {
      title: 'Applications by status',
      metric: 'application',
      chartType: 'bar',
      options: {
        xKey: 'status',
        series: [{ key: 'count', label: 'Count', color: '#2563eb' }],
      },
      position: { x: 2, y: 3, w: 2, h: 3 },
    },
  },
  {
    id: 'rescue-leaderboard',
    label: 'Rescue leaderboard',
    description: 'Top performing rescues by adoptions.',
    template: {
      title: 'Top rescues',
      metric: 'adoption',
      chartType: 'table',
      options: {
        columns: [
          { key: 'name', label: 'Rescue' },
          { key: 'adoptions', label: 'Adoptions' },
        ],
        pageSize: 10,
      },
      position: { x: 0, y: 6, w: 4, h: 4 },
    },
  },
  {
    id: 'active-users',
    label: 'Active users',
    description: 'Single big number with delta vs prior period.',
    template: {
      title: 'Active users',
      metric: 'user',
      chartType: 'metric-card',
      options: { valueKey: 'activeUsers', label: 'Active users', format: 'number' },
      position: { x: 0, y: 0, w: 1, h: 1 },
    },
  },
];

export type WidgetPickerProps = {
  presets?: WidgetPreset[];
  onAdd: (preset: WidgetPreset) => void;
  onClose?: () => void;
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
};

const panelStyle: React.CSSProperties = {
  background: 'var(--color-surface, #fff)',
  borderRadius: '12px',
  padding: '20px',
  width: 'min(640px, 90vw)',
  maxHeight: '80vh',
  overflowY: 'auto',
};

const presetStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  textAlign: 'left',
  padding: '12px',
  border: '1px solid var(--color-border, #e5e7eb)',
  borderRadius: '8px',
  background: 'var(--color-surface, #fff)',
  cursor: 'pointer',
  width: '100%',
};

export const WidgetPicker: React.FC<WidgetPickerProps> = ({
  presets = DEFAULT_PRESETS,
  onAdd,
  onClose,
}) => {
  // Close on Escape (overlay click-to-close removed for jsx-a11y; users
  // close via the explicit Close button or Escape).
  useEffect(() => {
    if (!onClose) {
      return;
    }
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={overlayStyle} role='presentation'>
      <div style={panelStyle} role='dialog' aria-modal='true'>
        <h3 style={{ marginTop: 0 }}>Add a widget</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '8px',
          }}
        >
          {presets.map(preset => (
            <button
              key={preset.id}
              type='button'
              style={presetStyle}
              onClick={() => onAdd(preset)}
              data-testid={`widget-preset-${preset.id}`}
            >
              <strong style={{ fontSize: '13px' }}>{preset.label}</strong>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted, #6b7280)',
                  marginTop: '4px',
                }}
              >
                {preset.description}
              </span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <button type='button' onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

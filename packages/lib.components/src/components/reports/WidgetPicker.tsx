import React, { useEffect } from 'react';
import * as styles from './WidgetPicker.css';

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
    <div className={styles.overlay} role='presentation'>
      <div className={styles.panel} role='dialog' aria-modal='true'>
        <h3 className={styles.heading}>Add a widget</h3>
        <div className={styles.presetGrid}>
          {presets.map(preset => (
            <button
              key={preset.id}
              type='button'
              className={styles.presetButton}
              onClick={() => onAdd(preset)}
              data-testid={`widget-preset-${preset.id}`}
            >
              <strong className={styles.presetLabel}>{preset.label}</strong>
              <span className={styles.presetDescription}>{preset.description}</span>
            </button>
          ))}
        </div>
        <div className={styles.footer}>
          <button type='button' onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { FilterPanel, type FilterPanelValue } from './FilterPanel';
import { WidgetPicker, type WidgetPreset } from './WidgetPicker';
import {
  ReportRenderer,
  type ReportRendererWidget,
} from './ReportRenderer';

/**
 * ADS-105: Form-based custom report builder.
 *
 * Two-column layout: filters + widget list (left, 1/3) and live
 * preview (right, 2/3). Widget operations are simple add / remove /
 * reorder; chart options are edited via inline JSON in this MVP — a
 * later iteration can add per-chartType form editors.
 *
 * The component is "controlled" by `config` and emits `onChange` on
 * every edit so callers can persist via the lib.analytics
 * useSaveReport / useUpdateReport hooks.
 */

export type ReportBuilderConfig = {
  filters: FilterPanelValue;
  layout: { columns: 1 | 2 | 3 | 4; rowGap?: number };
  widgets: ReportRendererWidget[];
};

export type ReportBuilderProps = {
  config: ReportBuilderConfig;
  onChange: (next: ReportBuilderConfig) => void;
  /** Map of widgetId → executed data for the live preview. */
  previewData?: Record<string, unknown>;
  isPreviewing?: boolean;
  previewError?: Error | null;
  /** Slot for app-specific filter fields, e.g. rescue picker. */
  filterExtras?: React.ReactNode;
  /** Optional widget presets to override the default catalog. */
  widgetPresets?: WidgetPreset[];
  /** Save action — typically calls useSaveReport / useUpdateReport. */
  onSave?: () => void;
  isSaving?: boolean;
};

const layoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 2fr',
  gap: '16px',
  alignItems: 'start',
};

const sidebarStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const widgetRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  border: '1px solid var(--color-border, #e5e7eb)',
  borderRadius: '6px',
  background: 'var(--color-surface, #fff)',
  fontSize: '13px',
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginTop: '12px',
};

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'w-' + Math.random().toString(36).slice(2, 10);
};

const moveItem = <T,>(arr: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= arr.length) {
    return arr;
  }
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  config,
  onChange,
  previewData,
  isPreviewing,
  previewError,
  filterExtras,
  widgetPresets,
  onSave,
  isSaving,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleAddPreset = (preset: WidgetPreset): void => {
    onChange({
      ...config,
      widgets: [
        ...config.widgets,
        {
          id: generateId(),
          ...preset.template,
        } as ReportRendererWidget,
      ],
    });
    setPickerOpen(false);
  };

  const handleRemove = (id: string): void => {
    onChange({
      ...config,
      widgets: config.widgets.filter(w => w.id !== id),
    });
  };

  const handleMove = (index: number, dir: -1 | 1): void => {
    onChange({
      ...config,
      widgets: moveItem(config.widgets, index, index + dir),
    });
  };

  const handleColumns = (cols: 1 | 2 | 3 | 4): void => {
    onChange({ ...config, layout: { ...config.layout, columns: cols } });
  };

  return (
    <div data-testid="report-builder" style={layoutStyle}>
      <div style={sidebarStyle}>
        <FilterPanel
          value={config.filters}
          onChange={filters => onChange({ ...config, filters })}
          extraFields={filterExtras}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            border: '1px solid var(--color-border, #e5e7eb)',
            borderRadius: '8px',
          }}
        >
          <span style={{ fontSize: '13px' }}>Grid columns</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => handleColumns(n as 1 | 2 | 3 | 4)}
                aria-pressed={config.layout.columns === n}
                style={{
                  padding: '4px 10px',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '4px',
                  background:
                    config.layout.columns === n ? 'var(--color-primary, #2563eb)' : 'transparent',
                  color: config.layout.columns === n ? '#fff' : 'inherit',
                  cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 style={{ fontSize: '13px', margin: '8px 0' }}>
            Widgets ({config.widgets.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {config.widgets.map((widget, i) => (
              <div key={widget.id} style={widgetRowStyle}>
                <div>
                  <strong>{widget.title}</strong>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    {widget.metric} · {widget.chartType}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button type="button" onClick={() => handleMove(i, -1)} aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" onClick={() => handleMove(i, 1)} aria-label="Move down">
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(widget.id)}
                    aria-label="Remove widget"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={buttonRowStyle}>
          <button type="button" onClick={() => setPickerOpen(true)} data-testid="add-widget">
            Add widget
          </button>
          {onSave ? (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              data-testid="save-report"
              style={{ marginLeft: 'auto' }}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          ) : null}
        </div>
      </div>
      <div>
        {config.widgets.length === 0 ? (
          <div
            style={{
              border: '1px dashed var(--color-border, #e5e7eb)',
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280',
            }}
          >
            Add a widget to start building your report.
          </div>
        ) : (
          <ReportRenderer
            config={{
              layout: config.layout,
              widgets: config.widgets,
            }}
            data={previewData ?? {}}
            isLoading={isPreviewing}
            error={previewError ?? null}
          />
        )}
      </div>
      {pickerOpen ? (
        <WidgetPicker
          presets={widgetPresets}
          onAdd={handleAddPreset}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </div>
  );
};

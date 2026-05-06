import React from 'react';

/**
 * ADS-105: Compact filter bar for the builder.
 *
 * Edits the report's `filters` block. Date range and groupBy only —
 * rescueId is implicit from the user's affiliation in app.rescue and
 * exposed as an explicit picker only in app.admin (passed as
 * `extraFields`).
 */

export type FilterPanelValue = {
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'week' | 'month';
  rescueId?: string;
};

export type FilterPanelProps = {
  value: FilterPanelValue;
  onChange: (next: FilterPanelValue) => void;
  /** Slot for app-specific filters (e.g. rescue picker on admin). */
  extraFields?: React.ReactNode;
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  alignItems: 'center',
  padding: '12px',
  background: 'var(--color-surface, #fff)',
  border: '1px solid var(--color-border, #e5e7eb)',
  borderRadius: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-text-muted, #6b7280)',
  marginRight: '4px',
};

const dateInputStyle: React.CSSProperties = {
  padding: '6px 8px',
  border: '1px solid var(--color-border, #e5e7eb)',
  borderRadius: '6px',
  fontSize: '13px',
};

const formatDateForInput = (d: Date | undefined): string => (d ? d.toISOString().slice(0, 10) : '');

export const FilterPanel: React.FC<FilterPanelProps> = ({ value, onChange, extraFields }) => {
  const update = (patch: Partial<FilterPanelValue>): void => {
    onChange({ ...value, ...patch });
  };
  return (
    <div style={rowStyle} data-testid='filter-panel'>
      <label>
        <span style={labelStyle}>From</span>
        <input
          type='date'
          style={dateInputStyle}
          value={formatDateForInput(value.startDate)}
          onChange={e =>
            update({ startDate: e.target.value ? new Date(e.target.value) : undefined })
          }
        />
      </label>
      <label>
        <span style={labelStyle}>To</span>
        <input
          type='date'
          style={dateInputStyle}
          value={formatDateForInput(value.endDate)}
          onChange={e => update({ endDate: e.target.value ? new Date(e.target.value) : undefined })}
        />
      </label>
      <label>
        <span style={labelStyle}>Group by</span>
        <select
          style={dateInputStyle}
          value={value.groupBy ?? ''}
          onChange={e =>
            update({
              groupBy: (e.target.value || undefined) as 'day' | 'week' | 'month' | undefined,
            })
          }
        >
          <option value=''>—</option>
          <option value='day'>Day</option>
          <option value='week'>Week</option>
          <option value='month'>Month</option>
        </select>
      </label>
      {extraFields}
    </div>
  );
};

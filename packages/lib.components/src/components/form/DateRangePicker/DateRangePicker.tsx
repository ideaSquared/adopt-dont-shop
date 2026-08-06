import { useId, type ChangeEvent } from 'react';
import clsx from 'clsx';

import { DateInput } from '../DateInput';
import * as styles from './DateRangePicker.css';

export type DateRangeValue = {
  from: string | null;
  to: string | null;
};

export type DateRangePickerProps = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  fromLabel?: string;
  toLabel?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  className?: string;
  'data-testid'?: string;
};

const isInvalidRange = (from: string | null, to: string | null): boolean =>
  Boolean(from && to && to < from);

/**
 * DateRangePicker — a shared from/to date range control composed from the
 * existing `DateInput` (native `<input type="date">`, so it renders in the
 * user's locale — dd/mm/yyyy for en-GB). Values are ISO `yyyy-mm-dd` strings
 * (or `null`). Selecting a range where `to` precedes `from` surfaces an
 * accessible error, and each field constrains the other's min/max.
 */
export const DateRangePicker = ({
  value,
  onChange,
  fromLabel = 'From',
  toLabel = 'To',
  min,
  max,
  disabled = false,
  error,
  required = false,
  className,
  'data-testid': testId,
}: DateRangePickerProps) => {
  const fromId = useId();
  const toId = useId();

  const rangeError =
    error ??
    (isInvalidRange(value.from, value.to)
      ? 'The end date must be on or after the start date.'
      : undefined);

  const handleFrom = (event: ChangeEvent<HTMLInputElement>) =>
    onChange({ from: event.target.value || null, to: value.to });

  const handleTo = (event: ChangeEvent<HTMLInputElement>) =>
    onChange({ from: value.from, to: event.target.value || null });

  return (
    <div className={clsx(styles.container, className)} data-testid={testId}>
      <div className={styles.field}>
        <label htmlFor={fromId} className={styles.label}>
          {fromLabel}
          {required ? <span aria-hidden='true'> *</span> : null}
        </label>
        <DateInput
          id={fromId}
          value={value.from ?? ''}
          onChange={handleFrom}
          disabled={disabled}
          min={min}
          max={value.to ?? max}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={toId} className={styles.label}>
          {toLabel}
          {required ? <span aria-hidden='true'> *</span> : null}
        </label>
        <DateInput
          id={toId}
          value={value.to ?? ''}
          onChange={handleTo}
          disabled={disabled}
          min={value.from ?? min}
          max={max}
        />
      </div>

      {rangeError ? (
        <p role='alert' className={styles.error}>
          {rangeError}
        </p>
      ) : null}
    </div>
  );
};

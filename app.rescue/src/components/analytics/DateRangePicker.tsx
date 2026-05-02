import React, { useState } from 'react';
import { FiCalendar, FiChevronDown } from 'react-icons/fi';
import { DateRange } from '../../services/analyticsService';
import * as styles from './DateRangePicker.css';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: {
    label: string;
    getDates: () => DateRange;
  }[];
}

const defaultPresets = [
  {
    label: 'Last 7 days',
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return { start, end };
    },
  },
  {
    label: 'Last 30 days',
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { start, end };
    },
  },
  {
    label: 'Last 90 days',
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      return { start, end };
    },
  },
  {
    label: 'This month',
    getDates: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start, end };
    },
  },
  {
    label: 'Last month',
    getDates: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start, end };
    },
  },
];

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  presets = defaultPresets,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value.start.toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(value.end.toISOString().split('T')[0]);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const formatDateRange = (range: DateRange) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${formatter.format(range.start)} - ${formatter.format(range.end)}`;
  };

  const handlePresetClick = (preset: (typeof presets)[0]) => {
    const newRange = preset.getDates();
    onChange(newRange);
    setActivePreset(preset.label);
    setCustomStart(newRange.start.toISOString().split('T')[0]);
    setCustomEnd(newRange.end.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    const start = new Date(customStart);
    const end = new Date(customEnd);

    if (start <= end) {
      onChange({ start, end });
      setActivePreset(null);
      setIsOpen(false);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-date-picker]')) {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={styles.container} data-date-picker="">
      <button className={styles.trigger} onClick={() => setIsOpen(!isOpen)}>
        <FiCalendar />
        <span>{formatDateRange(value)}</span>
        <FiChevronDown />
      </button>

      <div className={styles.dropdown({ open: isOpen })}>
        <div className={styles.presetsSection}>
          {presets.map(preset => (
            <button
              key={preset.label}
              className={styles.presetButton({ active: activePreset === preset.label })}
              onClick={() => handlePresetClick(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className={styles.customSection}>
          <div className={styles.dateInputs}>
            <div className={styles.dateInputGroup}>
              <label className={styles.label} htmlFor="date-range-start">
                Start Date
              </label>
              <input
                id="date-range-start"
                className={styles.dateInput}
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
              />
            </div>

            <div className={styles.dateInputGroup}>
              <label className={styles.label} htmlFor="date-range-end">
                End Date
              </label>
              <input
                id="date-range-end"
                className={styles.dateInput}
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
              />
            </div>
          </div>

          <button className={styles.applyButton} onClick={handleCustomApply}>
            Apply Custom Range
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;

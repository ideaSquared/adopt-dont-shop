import React from 'react';
import clsx from 'clsx';
import * as styles from './OptionTiles.css';

type Props = {
  name: string;
  options: readonly string[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  iconFor: (option: string) => string;
  hasError?: boolean;
};

export const OptionTiles: React.FC<Props> = ({
  name,
  options,
  value,
  onChange,
  iconFor,
  hasError = false,
}) => (
  <div className={styles.grid} role='radiogroup'>
    {options.map(option => {
      const selected = value === option;
      return (
        <label
          key={option}
          className={clsx(
            styles.tile,
            selected
              ? styles.tileVariants.selected
              : hasError
                ? styles.tileVariants.error
                : styles.tileVariants.unselected
          )}
        >
          <input
            className={styles.hiddenRadio}
            type='radio'
            name={name}
            value={option}
            checked={selected}
            onChange={() => onChange(option)}
          />
          <span className={styles.emoji} aria-hidden='true'>
            {iconFor(option)}
          </span>
          <span
            className={clsx(
              styles.label,
              selected ? styles.labelVariants.selected : styles.labelVariants.unselected
            )}
          >
            {option}
          </span>
        </label>
      );
    })}
  </div>
);

/**
 * Per-question icon dictionaries.
 */
const normalise = (s: string): string =>
  s
    .toLowerCase()
    .replace(/—/g, '-')
    .replace(/[^a-z0-9 -/]/g, '')
    .trim();

const ICON_BY_OPTION: Record<string, Record<string, string>> = {
  housing_type: {
    house: '🏠',
    'flat/apartment': '🏢',
    bungalow: '🏚️',
    'terraced house': '🏘️',
    'farmhouse/rural': '🚜',
    other: '🏡',
  },
  home_ownership: {
    own: '🔑',
    rent: '🧾',
    'live with family/parents': '👨‍👩‍👧',
    other: '🤔',
  },
  yard_size: {
    'no outdoor space': '🚫',
    'small (balcony/patio)': '🪴',
    'small garden': '🌱',
    'medium garden': '🌿',
    'large garden': '🌳',
    'very large/rural land': '🌄',
  },
  experience_level: {
    'first-time owner': '🌱',
    'some experience': '🌿',
    experienced: '🌳',
    'very experienced': '🏆',
  },
  pet_sleeping_location: {
    'indoors - own bed or crate': '🛏️',
    'indoors - bedroom with us': '🛌',
    'outdoors - shelter provided': '🏡',
    'will vary / not decided yet': '🤷',
  },
  hours_from_home: {
    'i work from home': '🏡',
    'less than 4 hours': '🕐',
    '4-6 hours': '🕓',
    '6-8 hours': '🕕',
    '8-10 hours': '🕗',
    'more than 10 hours': '🕙',
  },
  hours_alone: {
    'less than 2 hours': '🕐',
    '2-4 hours': '🕑',
    '4-6 hours': '🕓',
    '6-8 hours': '🕕',
    'more than 8 hours': '🕗',
  },
  employment_status: {
    'employed full-time': '💼',
    'employed part-time': '🕐',
    'self-employed': '💻',
    student: '🎓',
    retired: '🌴',
    homemaker: '🏠',
    'currently unemployed': '🔍',
    other: '✨',
  },
  pet_costs_prepared: {
    'yes - i have budgeted for all ongoing costs': '💰',
    'yes - i understand the costs involved': '👍',
    'mostly - i may need to research some costs further': '🧐',
    'im not fully sure what costs are involved': '🤔',
  },
};

export const hasIconMapping = (questionKey: string): boolean =>
  Object.prototype.hasOwnProperty.call(ICON_BY_OPTION, questionKey);

export const getIconFor =
  (questionKey: string) =>
  (option: string): string => {
    const dict = ICON_BY_OPTION[questionKey];
    if (!dict) {
      return '•';
    }
    return dict[normalise(option)] ?? '•';
  };

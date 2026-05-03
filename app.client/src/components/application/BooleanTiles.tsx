import React from 'react';
import clsx from 'clsx';
import * as styles from './BooleanTiles.css';

type Props = {
  name: string;
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
  hasError?: boolean;
};

export const BooleanTiles: React.FC<Props> = ({ name, value, onChange, hasError = false }) => {
  const yesSelected = value === true;
  const noSelected = value === false;

  return (
    <div className={styles.group} role='radiogroup'>
      <label
        className={clsx(
          styles.tile,
          yesSelected
            ? styles.tileVariants.yesSelected
            : hasError
              ? styles.tileVariants.yesError
              : styles.tileVariants.yesUnselected
        )}
      >
        <input
          className={styles.hiddenRadio}
          type='radio'
          name={name}
          value='yes'
          checked={yesSelected}
          onChange={() => onChange(true)}
        />
        <span className={styles.emoji} aria-hidden='true'>
          👍
        </span>
        <span
          className={clsx(
            styles.label,
            yesSelected ? styles.labelVariants.yesSelected : styles.labelVariants.unselected
          )}
        >
          Yes
        </span>
      </label>
      <label
        className={clsx(
          styles.tile,
          noSelected
            ? styles.tileVariants.noSelected
            : hasError
              ? styles.tileVariants.noError
              : styles.tileVariants.noUnselected
        )}
      >
        <input
          className={styles.hiddenRadio}
          type='radio'
          name={name}
          value='no'
          checked={noSelected}
          onChange={() => onChange(false)}
        />
        <span className={styles.emoji} aria-hidden='true'>
          👎
        </span>
        <span
          className={clsx(
            styles.label,
            noSelected ? styles.labelVariants.noSelected : styles.labelVariants.unselected
          )}
        >
          No
        </span>
      </label>
    </div>
  );
};

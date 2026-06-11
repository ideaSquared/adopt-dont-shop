import React, { ChangeEvent } from 'react';

import * as styles from './DateInput.css';

type DateInputProps = {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
  id?: string;
};

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  disabled,
  min,
  max,
  id,
}) => {
  return (
    <input
      className={styles.input}
      type='date'
      value={value}
      onChange={onChange}
      disabled={disabled}
      min={min}
      max={max}
      id={id}
    />
  );
};

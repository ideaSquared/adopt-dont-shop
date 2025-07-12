import React, { ChangeEvent } from 'react';
import styled from 'styled-components';

const StyledInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid ${({ theme }) => theme.border.color.primary};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-size: 1rem;
  color: ${({ theme }) => theme.text.primary};
  background: ${({ theme }) => theme.background.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.border.color.focus};
  }

  &:disabled {
    background: ${({ theme }) => theme.background.disabled};
    cursor: not-allowed;
  }
`;

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
    <StyledInput
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

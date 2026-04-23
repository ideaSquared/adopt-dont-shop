import React from 'react';
import styled from 'styled-components';

type Props = {
  name: string;
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
  hasError?: boolean;
};

const Group = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 380px) {
    grid-template-columns: 1fr;
  }
`;

const Tile = styled.label<{ $selected: boolean; $hasError: boolean; $tone: 'yes' | 'no' }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.125rem 1rem;
  border-radius: 0.75rem;
  border: 2px solid
    ${({ $selected, $hasError, $tone, theme }) => {
      if ($selected && $tone === 'yes') {
        return theme.colors.semantic.success[500];
      }
      if ($selected && $tone === 'no') {
        return theme.colors.neutral[500];
      }
      if ($hasError) {
        return theme.colors.semantic.error[400];
      }
      return theme.border.color.primary;
    }};
  background: ${({ $selected, $tone, theme }) => {
    if ($selected && $tone === 'yes') {
      return theme.colors.semantic.success[50];
    }
    if ($selected && $tone === 'no') {
      return theme.colors.neutral[100];
    }
    return theme.background.primary;
  }};
  cursor: pointer;
  text-align: center;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;

  &:hover {
    background: ${({ $tone, theme }) =>
      $tone === 'yes' ? theme.colors.semantic.success[50] : theme.colors.neutral[100]};
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary[400]};
    outline-offset: 2px;
  }
`;

const HiddenRadio = styled.input`
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
`;

const Emoji = styled.span`
  font-size: 1.75rem;
  line-height: 1;
`;

const Label = styled.span<{ $selected: boolean; $tone: 'yes' | 'no' }>`
  font-size: 0.9375rem;
  font-weight: ${props => (props.$selected ? 600 : 500)};
  color: ${({ $selected, $tone, theme }) => {
    if ($selected && $tone === 'yes') {
      return theme.colors.semantic.success[700];
    }
    if ($selected && $tone === 'no') {
      return theme.colors.neutral[700];
    }
    return theme.text.primary;
  }};
`;

export const BooleanTiles: React.FC<Props> = ({ name, value, onChange, hasError = false }) => {
  const yesSelected = value === true;
  const noSelected = value === false;

  return (
    <Group role='radiogroup'>
      <Tile $selected={yesSelected} $hasError={hasError} $tone='yes'>
        <HiddenRadio
          type='radio'
          name={name}
          value='yes'
          checked={yesSelected}
          onChange={() => onChange(true)}
        />
        <Emoji aria-hidden='true'>👍</Emoji>
        <Label $selected={yesSelected} $tone='yes'>
          Yes
        </Label>
      </Tile>
      <Tile $selected={noSelected} $hasError={hasError} $tone='no'>
        <HiddenRadio
          type='radio'
          name={name}
          value='no'
          checked={noSelected}
          onChange={() => onChange(false)}
        />
        <Emoji aria-hidden='true'>👎</Emoji>
        <Label $selected={noSelected} $tone='no'>
          No
        </Label>
      </Tile>
    </Group>
  );
};

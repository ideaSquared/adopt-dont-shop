import { forwardRef } from 'react';
import styled, { css } from 'styled-components';

export type RadioInputSize = 'sm' | 'md' | 'lg';
export type RadioInputState = 'default' | 'error' | 'success' | 'warning';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioInputProps {
  name: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  size?: RadioInputSize;
  state?: RadioInputState;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  error?: string;
  helperText?: string;
  direction?: 'horizontal' | 'vertical';
  fullWidth?: boolean;
  className?: string;
  'data-testid'?: string;
  onChange?: (value: string) => void;
}

const getSizeStyles = (size: RadioInputSize) => {
  const sizes = {
    sm: css`
      width: 16px;
      height: 16px;
    `,
    md: css`
      width: 20px;
      height: 20px;
    `,
    lg: css`
      width: 24px;
      height: 24px;
    `,
  };
  return sizes[size];
};

const getStateStyles = (state: RadioInputState, theme: any) => {
  const states = {
    default: css`
      border-color: ${theme.colors.neutral[300]};
    `,
    error: css`
      border-color: ${theme.colors.semantic.error.main};
    `,
    success: css`
      border-color: ${theme.colors.semantic.success.main};
    `,
    warning: css`
      border-color: ${theme.colors.semantic.warning.main};
    `,
  };
  return states[state];
};

const RadioContainer = styled.div<{ $fullWidth: boolean }>`
  display: ${({ $fullWidth }) => ($fullWidth ? 'block' : 'inline-block')};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
`;

const Label = styled.label<{ $required: boolean }>`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.neutral[700]};

  ${({ $required }) =>
    $required &&
    css`
      &::after {
        content: ' *';
        color: ${({ theme }) => theme.colors.semantic.error.main};
      }
    `}
`;

const RadioGroup = styled.div<{ $direction: 'horizontal' | 'vertical' }>`
  display: flex;
  flex-direction: ${({ $direction }) => ($direction === 'horizontal' ? 'row' : 'column')};
  gap: ${({ theme, $direction }) =>
    $direction === 'horizontal' ? theme.spacing.lg : theme.spacing.sm};
  flex-wrap: wrap;
`;

const RadioOptionContainer = styled.label<{ $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
`;

const HiddenRadio = styled.input.attrs({ type: 'radio' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const StyledRadio = styled.div<{
  $size: RadioInputSize;
  $state: RadioInputState;
  $checked: boolean;
  $disabled: boolean;
}>`
  position: relative;
  border: 2px solid;
  border-radius: 50%;
  transition: all ${({ theme }) => theme.transitions.fast};
  flex-shrink: 0;

  ${({ $size }) => getSizeStyles($size)}
  ${({ $state, theme }) => getStateStyles($state, theme)}

  ${({ $checked, theme }) =>
    $checked &&
    css`
      border-color: ${theme.colors.primary.main};
      background-color: ${theme.colors.primary.main};

      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: ${theme.colors.neutral.white};
      }
    `}

  ${({ $disabled }) =>
    $disabled &&
    css`
      background-color: ${({ theme }) => theme.colors.neutral[100]};
      cursor: not-allowed;
    `}

  ${RadioOptionContainer}:hover &:not([disabled]) {
    border-color: ${({ theme }) => theme.colors.primary.main};
  }

  ${HiddenRadio}:focus + & {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary.light}40;
  }
`;

const OptionLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.neutral[700]};
  user-select: none;
`;

const HelperText = styled.div<{ $state: RadioInputState }>`
  margin-top: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme, $state }) => {
    switch ($state) {
      case 'error':
        return theme.colors.semantic.error.main;
      case 'success':
        return theme.colors.semantic.success.main;
      case 'warning':
        return theme.colors.semantic.warning.main;
      default:
        return theme.colors.neutral[600];
    }
  }};
`;

export const RadioInput = forwardRef<HTMLInputElement, RadioInputProps>(
  (
    {
      name,
      options,
      value,
      defaultValue,
      size = 'md',
      state = 'default',
      disabled = false,
      required = false,
      label,
      error,
      helperText,
      direction = 'vertical',
      fullWidth = false,
      className,
      'data-testid': testId,
      onChange,
      ...props
    },
    ref
  ) => {
    const handleChange = (optionValue: string) => {
      if (onChange) {
        onChange(optionValue);
      }
    };

    const finalState = error ? 'error' : state;
    const finalHelperText = error || helperText;

    return (
      <RadioContainer $fullWidth={fullWidth} className={className} data-testid={testId}>
        {label && <Label $required={required}>{label}</Label>}

        <RadioGroup $direction={direction}>
          {options.map((option, index) => (
            <RadioOptionContainer
              key={option.value}
              $disabled={disabled || option.disabled || false}
            >
              <HiddenRadio
                ref={index === 0 ? ref : undefined}
                name={name}
                value={option.value}
                {...(value !== undefined
                  ? { checked: value === option.value }
                  : { defaultChecked: defaultValue === option.value })}
                disabled={disabled || option.disabled}
                required={required}
                onChange={() => handleChange(option.value)}
                {...props}
              />
              <StyledRadio
                $size={size}
                $state={finalState}
                $checked={value === option.value}
                $disabled={disabled || option.disabled || false}
              />
              <OptionLabel>{option.label}</OptionLabel>
            </RadioOptionContainer>
          ))}
        </RadioGroup>

        {finalHelperText && <HelperText $state={finalState}>{finalHelperText}</HelperText>}
      </RadioContainer>
    );
  }
);

RadioInput.displayName = 'RadioInput';

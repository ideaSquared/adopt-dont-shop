import * as Select from '@radix-ui/react-select';
import { forwardRef } from 'react';
import styled, { css } from 'styled-components';
import { SelectInputProps, SelectInputSize, SelectInputState } from './SelectInput';

const getSizeStyles = (size: SelectInputSize) => {
  const sizes = {
    sm: css`
      min-height: 32px;
      font-size: 14px;
    `,
    md: css`
      min-height: 40px;
      font-size: 16px;
    `,
    lg: css`
      min-height: 48px;
      font-size: 18px;
    `,
  };
  return sizes[size];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getStateStyles = (state: SelectInputState, theme: any) => {
  const states = {
    default: css`
      border-color: ${theme.colors?.neutral?.[300] || '#d1d5db'};
      &:focus-within {
        border-color: ${theme.colors?.primary?.[500] || '#3b82f6'};
        box-shadow: 0 0 0 3px ${theme.colors?.primary?.[200] || '#dbeafe'};
      }
    `,
    error: css`
      border-color: ${theme.colors?.semantic?.error?.[500] || '#ef4444'};
      &:focus-within {
        border-color: ${theme.colors?.semantic?.error?.[500] || '#ef4444'};
        box-shadow: 0 0 0 3px ${theme.colors?.semantic?.error?.[200] || '#fecaca'};
      }
    `,
    success: css`
      border-color: ${theme.colors?.semantic?.success?.[500] || '#10b981'};
      &:focus-within {
        border-color: ${theme.colors?.semantic?.success?.[500] || '#10b981'};
        box-shadow: 0 0 0 3px ${theme.colors?.semantic?.success?.[200] || '#a7f3d0'};
      }
    `,
    warning: css`
      border-color: ${theme.colors?.semantic?.warning?.[500] || '#f59e0b'};
      &:focus-within {
        border-color: ${theme.colors?.semantic?.warning?.[500] || '#f59e0b'};
        box-shadow: 0 0 0 3px ${theme.colors?.semantic?.warning?.[200] || '#fde68a'};
      }
    `,
  };
  return states[state];
};

const Container = styled.div<{ $fullWidth: boolean }>`
  display: ${({ $fullWidth }) => ($fullWidth ? 'block' : 'inline-block')};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  position: relative;
`;

const Label = styled.label<{ $required: boolean }>`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing?.xs || '4px'};
  font-size: ${({ theme }) => theme.typography?.size?.sm || '14px'};
  font-weight: ${({ theme }) => theme.typography?.weight?.medium || '500'};
  color: ${({ theme }) => theme.colors?.neutral?.[700] || '#374151'};

  ${({ $required }) =>
    $required &&
    css`
      &::after {
        content: ' *';
        color: ${({ theme }) => theme.colors?.semantic?.error?.[500] || '#ef4444'};
      }
    `}
`;

const StyledTrigger = styled(Select.Trigger)<{
  $size: SelectInputSize;
  $state: SelectInputState;
  $disabled: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 ${({ theme }) => theme.spacing?.sm || '8px'};
  border: 1px solid;
  border-radius: ${({ theme }) => theme.spacing?.xs || '4px'};
  background-color: ${({ theme }) => theme.colors?.neutral?.[50] || '#f9fafb'};
  transition: all ${({ theme }) => theme.transitions?.fast || '150ms'};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};

  ${({ $size }) => getSizeStyles($size)}
  ${({ $state, theme }) => getStateStyles($state, theme)}

  ${({ $disabled, theme }) =>
    $disabled &&
    css`
      background-color: ${theme.colors?.neutral?.[100] || '#f3f4f6'};
      color: ${theme.colors?.neutral?.[400] || '#9ca3af'};
      cursor: not-allowed;
    `}

  &:focus {
    outline: none;
  }
`;

const StyledContent = styled(Select.Content)`
  background: ${({ theme }) => theme.colors?.neutral?.[50] || '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.colors?.neutral?.[300] || '#d1d5db'};
  border-radius: ${({ theme }) => theme.spacing?.xs || '4px'};
  box-shadow: ${({ theme }) => theme.shadows?.lg || '0 10px 15px -3px rgba(0, 0, 0, 0.1)'};
  max-height: 200px;
  overflow: hidden;
  z-index: ${({ theme }) => theme.zIndex?.dropdown || '1000'};
`;

const StyledViewport = styled(Select.Viewport)`
  padding: 0;
`;

const StyledItem = styled(Select.Item)<{ $disabled?: boolean }>`
  padding: ${({ theme }) => theme.spacing?.sm || '8px'};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: background-color ${({ theme }) => theme.transitions?.fast || '150ms'};
  color: ${({ $disabled, theme }) =>
    $disabled
      ? theme.colors?.neutral?.[400] || '#9ca3af'
      : theme.colors?.neutral?.[900] || '#111827'};
  outline: none;

  &[data-highlighted] {
    background-color: ${({ $disabled, theme }) =>
      $disabled ? 'transparent' : theme.colors?.neutral?.[100] || '#f3f4f6'};
  }

  &[data-state='checked'] {
    background-color: ${({ theme }) => theme.colors?.primary?.[100] || '#dbeafe'};
  }
`;

const StyledValue = styled(Select.Value)`
  color: ${({ theme }) => theme.colors?.neutral?.[900] || '#111827'};
`;

const StyledIcon = styled(Select.Icon)`
  color: ${({ theme }) => theme.colors?.neutral?.[400] || '#9ca3af'};
`;

const Placeholder = styled.span`
  color: ${({ theme }) => theme.colors?.neutral?.[400] || '#9ca3af'};
`;

const HelperText = styled.div<{ $state: SelectInputState }>`
  margin-top: ${({ theme }) => theme.spacing?.xs || '4px'};
  font-size: ${({ theme }) => theme.typography?.size?.sm || '14px'};
  color: ${({ theme, $state }) =>
    $state === 'error'
      ? theme.colors?.semantic?.error?.[500] || '#ef4444'
      : $state === 'success'
        ? theme.colors?.semantic?.success?.[500] || '#10b981'
        : $state === 'warning'
          ? theme.colors?.semantic?.warning?.[500] || '#f59e0b'
          : theme.colors?.neutral?.[600] || '#4b5563'};
`;

const ChevronDownIcon = () => (
  <svg width='15' height='15' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path
      d='m4.93179 5.43179c0.20119-0.20119 0.52681-0.20119 0.72801 0l2.34020 2.34020 2.3402-2.34020c0.2012-0.20119 0.5268-0.20119 0.728 0 0.2012 0.20119 0.2012 0.52681 0 0.72801l-2.7042 2.70420c-0.2012 0.2012-0.5268 0.2012-0.728 0l-2.70420-2.70420c-0.20119-0.20120-0.20119-0.52682 0-0.72801z'
      fill='currentColor'
    />
  </svg>
);

type RadixSelectInputProps = Omit<
  SelectInputProps,
  'multiple' | 'searchable' | 'clearable' | 'onSearch'
> & {
  onValueChange?: (value: string) => void;
};

export const RadixSelectInput = forwardRef<HTMLButtonElement, RadixSelectInputProps>(
  (
    {
      options,
      value,
      defaultValue,
      label,
      placeholder = 'Select an option...',
      size = 'md',
      state = 'default',
      disabled = false,
      required = false,
      error,
      helperText,
      fullWidth = false,
      className,
      'data-testid': dataTestId,
      onChange,
      onValueChange,
    },
    ref
  ) => {
    const effectiveState = error ? 'error' : state;
    const effectiveHelperText = error || helperText;

    const handleValueChange = (newValue: string) => {
      onChange?.(newValue);
      onValueChange?.(newValue);
    };

    // Convert value to string for Radix Select (it only supports single selection)
    const stringValue = Array.isArray(value) ? value[0] : value;
    const stringDefaultValue = Array.isArray(defaultValue) ? defaultValue[0] : defaultValue;

    return (
      <Container $fullWidth={fullWidth} className={className}>
        {label && <Label $required={required}>{label}</Label>}

        <Select.Root
          {...(value !== undefined ? { value: stringValue } : { defaultValue: stringDefaultValue })}
          onValueChange={handleValueChange}
          disabled={disabled}
        >
          <StyledTrigger
            ref={ref}
            $size={size}
            $state={effectiveState}
            $disabled={disabled}
            data-testid={dataTestId}
            aria-label={label}
          >
            <StyledValue placeholder={<Placeholder>{placeholder}</Placeholder>} />
            <StyledIcon>
              <ChevronDownIcon />
            </StyledIcon>
          </StyledTrigger>

          <Select.Portal>
            <StyledContent position='popper' sideOffset={5}>
              <StyledViewport>
                {options.map(option => (
                  <StyledItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    $disabled={option.disabled}
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                  </StyledItem>
                ))}
              </StyledViewport>
            </StyledContent>
          </Select.Portal>
        </Select.Root>

        {effectiveHelperText && (
          <HelperText $state={effectiveState}>{effectiveHelperText}</HelperText>
        )}
      </Container>
    );
  }
);

RadixSelectInput.displayName = 'RadixSelectInput';

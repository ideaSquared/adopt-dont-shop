import { forwardRef, useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectInputSize = 'sm' | 'md' | 'lg';
export type SelectInputState = 'default' | 'error' | 'success' | 'warning';

export type SelectInputProps = {
  options: SelectOption[];
  value?: string | string[];
  defaultValue?: string | string[];
  label?: string;
  placeholder?: string;
  size?: SelectInputSize;
  state?: SelectInputState;
  disabled?: boolean;
  required?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  className?: string;
  'data-testid'?: string;
  onChange?: (value: string | string[]) => void;
  onSearch?: (query: string) => void;
};

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

const SelectContainer = styled.div<{
  $size: SelectInputSize;
  $state: SelectInputState;
  $disabled: boolean;
  $isOpen: boolean;
}>`
  position: relative;
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
`;

const SelectContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${({ theme }) => theme.spacing?.sm || '8px'};
  min-height: inherit;
  gap: ${({ theme }) => theme.spacing?.xs || '4px'};
`;

const SelectedValue = styled.span`
  color: ${({ theme }) => theme.colors?.neutral?.[900] || '#111827'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`;

const Placeholder = styled.span`
  color: ${({ theme }) => theme.colors?.neutral?.[400] || '#9ca3af'};
  flex: 1;
`;

const ChevronIcon = styled.div<{ $isOpen: boolean }>`
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors?.neutral?.[400] || '#9ca3af'};
  transition: transform ${({ theme }) => theme.transitions?.fast || '150ms'};
  transform: ${({ $isOpen }) => ($isOpen ? 'rotate(180deg)' : 'rotate(0deg)')};

  &::before {
    content: '▼';
    font-size: 12px;
  }
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.colors?.neutral?.[50] || '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.colors?.neutral?.[300] || '#d1d5db'};
  border-top: none;
  border-radius: 0 0 ${({ theme }) => theme.spacing?.xs || '4px'}
    ${({ theme }) => theme.spacing?.xs || '4px'};
  box-shadow: ${({ theme }) => theme.shadows?.lg || '0 10px 15px -3px rgba(0, 0, 0, 0.1)'};
  max-height: 200px;
  overflow-y: auto;
  z-index: ${({ theme }) => theme.zIndex?.dropdown || '1000'};
  display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};
`;

const Option = styled.div<{ $isSelected: boolean; $isDisabled: boolean }>`
  padding: ${({ theme }) => theme.spacing?.sm || '8px'};
  cursor: ${({ $isDisabled }) => ($isDisabled ? 'not-allowed' : 'pointer')};
  transition: background-color ${({ theme }) => theme.transitions?.fast || '150ms'};
  background-color: ${({ $isSelected, theme }) =>
    $isSelected ? theme.colors?.primary?.[100] || '#dbeafe' : 'transparent'};
  color: ${({ $isDisabled, theme }) =>
    $isDisabled
      ? theme.colors?.neutral?.[400] || '#9ca3af'
      : theme.colors?.neutral?.[900] || '#111827'};

  &:hover {
    background-color: ${({ $isDisabled, theme }) =>
      $isDisabled ? 'transparent' : theme.colors?.neutral?.[100] || '#f3f4f6'};
  }
`;

const NoOptions = styled.div`
  padding: ${({ theme }) => theme.spacing?.sm || '8px'};
  color: ${({ theme }) => theme.colors?.neutral?.[400] || '#9ca3af'};
  text-align: center;
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

export const SelectInput = forwardRef<HTMLDivElement, SelectInputProps>(
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
      multiple = false,
      error,
      helperText,
      fullWidth = false,
      className,
      'data-testid': dataTestId,
      onChange,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState<string>(() => {
      if (value !== undefined) {
        return Array.isArray(value) ? value[0] || '' : value;
      }
      if (defaultValue !== undefined) {
        return Array.isArray(defaultValue) ? defaultValue[0] || '' : defaultValue;
      }
      return '';
    });

    const containerRef = useRef<HTMLDivElement>(null);

    // Sync external value changes
    useEffect(() => {
      if (value !== undefined) {
        const newValue = Array.isArray(value) ? value[0] || '' : value;
        setInternalValue(newValue);
      }
    }, [value]);

    const effectiveState = error ? 'error' : state;
    const effectiveHelperText = error || helperText;

    const selectedOption = options.find(option => option.value === internalValue);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    const handleToggle = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
      }
    };

    const handleSelect = (optionValue: string) => {
      if (multiple) {
        // For now, multiple selection is not fully implemented
        setInternalValue(optionValue);
        onChange?.(optionValue);
      } else {
        setInternalValue(optionValue);
        onChange?.(optionValue);
        setIsOpen(false);
      }
    };

    return (
      <Container ref={containerRef} $fullWidth={fullWidth} className={className}>
        {label && <Label $required={required}>{label}</Label>}

        <SelectContainer
          ref={ref}
          $size={size}
          $state={effectiveState}
          $disabled={disabled}
          $isOpen={isOpen}
          onClick={handleToggle}
          data-testid={dataTestId}
          role='combobox'
          aria-expanded={isOpen}
          aria-haspopup='listbox'
        >
          <SelectContent>
            {selectedOption ? (
              <SelectedValue>{selectedOption.label}</SelectedValue>
            ) : (
              <Placeholder>{placeholder}</Placeholder>
            )}
            <ChevronIcon $isOpen={isOpen} />
          </SelectContent>
        </SelectContainer>

        <Dropdown $isOpen={isOpen}>
          {options.length > 0 ? (
            options.map(option => (
              <Option
                key={option.value}
                $isSelected={option.value === internalValue}
                $isDisabled={!!option.disabled}
                onClick={() => !option.disabled && handleSelect(option.value)}
                role='option'
                aria-selected={option.value === internalValue}
              >
                {option.label}
              </Option>
            ))
          ) : (
            <NoOptions>No options found</NoOptions>
          )}
        </Dropdown>

        {effectiveHelperText && (
          <HelperText $state={effectiveState}>{effectiveHelperText}</HelperText>
        )}
      </Container>
    );
  }
);

SelectInput.displayName = 'SelectInput';

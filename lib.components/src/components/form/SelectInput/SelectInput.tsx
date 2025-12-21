import * as Select from '@radix-ui/react-select';
import React, { forwardRef, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import countries from '../CountrySelectInput/CountryList.json';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  flag?: string; // For country options
  originalValue?: string; // For internal processing
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
  isCountrySelect?: boolean;
  onChange?: (value: string | string[]) => void;
  onSearch?: (query: string) => void;
};

const getSizeStyles = (size: SelectInputSize) => {
  const sizes = {
    sm: css`
      min-height: 32px;
      font-size: 14px;
      padding: 0 ${({ theme }) => theme.spacing?.xs || '4px'};
    `,
    md: css`
      min-height: 40px;
      font-size: 16px;
      padding: 0 ${({ theme }) => theme.spacing?.sm || '8px'};
    `,
    lg: css`
      min-height: 48px;
      font-size: 18px;
      padding: 0 ${({ theme }) => theme.spacing?.md || '12px'};
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

const SelectContainer = styled.div<{ $fullWidth: boolean }>`
  position: relative;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
`;

const StyledTrigger = styled(Select.Trigger)<{
  $size: SelectInputSize;
  $state: SelectInputState;
  $disabled: boolean;
  $fullWidth: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  min-width: 200px;
  border: 1px solid;
  border-radius: ${({ theme }) => theme.spacing?.xs || '4px'};
  background-color: ${({ theme }) => theme.colors?.neutral?.[50] || '#f9fafb'};
  transition: all ${({ theme }) => theme.transitions?.fast || '150ms'};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  gap: ${({ theme }) => theme.spacing?.xs || '4px'};

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
  background: ${({ theme }) => theme.colors?.neutral?.[50] || '#ffffff'};
  border: 1px solid ${({ theme }) => theme.colors?.neutral?.[300] || '#d1d5db'};
  border-radius: ${({ theme }) => theme.spacing?.xs || '4px'};
  box-shadow: ${({ theme }) =>
    theme.shadows?.lg || '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'};
  max-height: 300px;
  overflow: hidden;
  z-index: 50;
  min-width: var(--radix-select-trigger-width);
  width: var(--radix-select-trigger-width);
  will-change: transform, opacity;

  /* Ensure content appears above other elements */
  position: relative;

  &[data-state='open'] {
    animation: slideDownAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  &[data-state='closed'] {
    animation: slideUpAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  &[data-side='top'] {
    animation-name: slideDownAndFade;
  }

  &[data-side='right'] {
    animation-name: slideLeftAndFade;
  }

  &[data-side='bottom'] {
    animation-name: slideUpAndFade;
  }

  &[data-side='left'] {
    animation-name: slideRightAndFade;
  }

  @keyframes slideUpAndFade {
    from {
      opacity: 0;
      transform: translateY(2px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideRightAndFade {
    from {
      opacity: 0;
      transform: translateX(-2px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideDownAndFade {
    from {
      opacity: 0;
      transform: translateY(-2px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideLeftAndFade {
    from {
      opacity: 0;
      transform: translateX(2px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const StyledViewport = styled(Select.Viewport)`
  padding: ${({ theme }) => theme.spacing?.xs || '4px'};
  max-height: 250px;
  overflow-y: auto;

  /* Custom scrollbar styles */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors?.neutral?.[300] || '#d1d5db'};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: ${({ theme }) => theme.colors?.neutral?.[400] || '#9ca3af'};
  }
`;

const SearchContainer = styled.div`
  padding: ${({ theme }) => theme.spacing?.xs || '4px'};
  border-bottom: 1px solid ${({ theme }) => theme.colors?.neutral?.[200] || '#e5e7eb'};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing?.xs || '4px'} ${({ theme }) => theme.spacing?.sm || '8px'};
  border: 1px solid ${({ theme }) => theme.colors?.neutral?.[300] || '#d1d5db'};
  border-radius: ${({ theme }) => theme.spacing?.xs || '4px'};
  font-size: ${({ theme }) => theme.typography?.size?.sm || '14px'};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors?.primary?.[500] || '#3b82f6'};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors?.primary?.[200] || '#dbeafe'};
  }
`;

const StyledItem = styled(Select.Item)<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing?.sm || '8px'};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: background-color ${({ theme }) => theme.transitions?.fast || '150ms'};
  color: ${({ $disabled, theme }) =>
    $disabled
      ? theme.colors?.neutral?.[400] || '#9ca3af'
      : theme.colors?.neutral?.[900] || '#111827'};
  outline: none;
  border-radius: ${({ theme }) => theme.spacing?.xs || '4px'};
  margin: 1px 0;
  gap: ${({ theme }) => theme.spacing?.xs || '4px'};

  &[data-highlighted] {
    background-color: ${({ $disabled, theme }) =>
      $disabled ? 'transparent' : theme.colors?.neutral?.[100] || '#f3f4f6'};
  }

  &[data-state='checked'] {
    background-color: ${({ theme }) => theme.colors?.primary?.[100] || '#dbeafe'};
  }
`;

const ValueContainer = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing?.xs || '4px'};
  flex: 1;
  min-width: 0;
`;

const SingleValue = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing?.xs || '4px'};
  color: ${({ theme }) => theme.colors?.neutral?.[900] || '#111827'};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MultiValue = styled.div`
  display: inline-flex;
  align-items: center;
  background-color: ${({ theme }) => theme.colors?.primary?.[100] || '#dbeafe'};
  color: ${({ theme }) => theme.colors?.primary?.[700] || '#1d4ed8'};
  padding: 2px ${({ theme }) => theme.spacing?.xs || '4px'};
  border-radius: ${({ theme }) => theme.spacing?.xs || '4px'};
  font-size: ${({ theme }) => theme.typography?.size?.sm || '14px'};
  gap: ${({ theme }) => theme.spacing?.xs || '4px'};
  max-width: 200px;
  overflow: hidden;
`;

const MultiValueRemove = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color ${({ theme }) => theme.transitions?.fast || '150ms'};
  color: ${({ theme }) => theme.colors?.primary?.[600] || '#2563eb'};

  &:hover {
    background-color: ${({ theme }) => theme.colors?.primary?.[200] || '#dbeafe'};
  }
`;

const ClearButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color ${({ theme }) => theme.transitions?.fast || '150ms'};
  color: ${({ theme }) => theme.colors?.neutral?.[400] || '#9ca3af'};

  &:hover {
    background-color: ${({ theme }) => theme.colors?.neutral?.[100] || '#f3f4f6'};
  }
`;

const Placeholder = styled.span`
  color: ${({ theme }) => theme.colors?.neutral?.[400] || '#9ca3af'};
  flex: 1;
  text-align: left;
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

const XIcon = () => (
  <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path
      d='M9 3L3 9M3 3l6 6'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

export const SelectInput = forwardRef<HTMLButtonElement, SelectInputProps>(
  (
    {
      options: propOptions,
      value,
      defaultValue,
      label,
      placeholder = 'Select an option...',
      size = 'md',
      state = 'default',
      disabled = false,
      required = false,
      multiple = false,
      searchable = false,
      clearable = false,
      error,
      helperText,
      fullWidth = false,
      className,
      'data-testid': dataTestId,
      isCountrySelect = false,
      onChange,
      onSearch,
    },
    ref
  ) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Use country options if isCountrySelect is true
    const countryOptions: SelectOption[] = useMemo(() => {
      return countries.map(country => ({
        value: country.name,
        label: country.name,
      }));
    }, []);

    const options = isCountrySelect ? countryOptions : propOptions;

    // Filter options based on search query and convert empty values for Radix compatibility
    const filteredOptions = useMemo(() => {
      const processedOptions = options.map(option => ({
        ...option,
        // Convert empty string values to a special value for Radix compatibility
        value: option.value === '' ? '__all__' : option.value,
        originalValue: option.value,
      }));

      if (!searchable || !searchQuery) {
        return processedOptions;
      }
      return processedOptions.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [options, searchQuery, searchable]);

    // Handle single/multiple values
    const currentValue = multiple ? (Array.isArray(value) ? value : []) : value;
    const selectedOptions = multiple
      ? options.filter(option => (currentValue as string[]).includes(option.value))
      : options.find(option => option.value === currentValue);

    const handleValueChange = (newValue: string) => {
      // Convert special "all" value back to empty string
      const actualValue = newValue === '__all__' ? '' : newValue;

      if (multiple) {
        const currentArray = Array.isArray(value) ? value : [];
        const updatedArray = currentArray.includes(actualValue)
          ? currentArray.filter(v => v !== actualValue)
          : [...currentArray, actualValue];
        onChange?.(updatedArray);
      } else {
        onChange?.(actualValue);
      }
    };

    const handleRemoveValue = (valueToRemove: string) => {
      if (multiple && Array.isArray(value)) {
        const updatedArray = value.filter(v => v !== valueToRemove);
        onChange?.(updatedArray);
      }
    };

    const handleClear = () => {
      onChange?.(multiple ? [] : '');
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      onSearch?.(query);
    };

    const renderValue = () => {
      if (multiple && Array.isArray(currentValue) && currentValue.length > 0) {
        const multipleSelectedOptions = selectedOptions as SelectOption[];
        return (
          <ValueContainer>
            {multipleSelectedOptions.map((option: SelectOption) => (
              <MultiValue key={option.value}>
                {option.label}
                <MultiValueRemove
                  onClick={e => {
                    e.stopPropagation();
                    handleRemoveValue(option.value);
                  }}
                  aria-label={`Remove ${option.label}`}
                >
                  <XIcon />
                </MultiValueRemove>
              </MultiValue>
            ))}
          </ValueContainer>
        );
      }

      if (!multiple && selectedOptions) {
        const singleSelectedOption = selectedOptions as SelectOption;
        return <SingleValue>{singleSelectedOption.label}</SingleValue>;
      }

      return <Placeholder>{placeholder}</Placeholder>;
    };

    const actualState = error ? 'error' : state;
    const displayText = error || helperText;

    return (
      <Container $fullWidth={fullWidth} className={className} data-testid={dataTestId}>
        {label && (
          <Label $required={required} htmlFor={dataTestId}>
            {label}
          </Label>
        )}
        <SelectContainer $fullWidth={fullWidth}>
          <Select.Root
            value={
              multiple
                ? undefined
                : (currentValue === '' ? '__all__' : (currentValue as string)) || ''
            }
            defaultValue={
              multiple ? undefined : defaultValue === '' ? '__all__' : (defaultValue as string)
            }
            onValueChange={handleValueChange}
            disabled={disabled}
          >
            <StyledTrigger
              ref={ref}
              $size={size}
              $state={actualState}
              $disabled={disabled}
              $fullWidth={fullWidth}
              aria-label={label}
            >
              {renderValue()}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {clearable &&
                  (currentValue || (Array.isArray(currentValue) && currentValue.length > 0)) && (
                    <ClearButton
                      onClick={e => {
                        e.stopPropagation();
                        handleClear();
                      }}
                      aria-label='Clear selection'
                    >
                      <XIcon />
                    </ClearButton>
                  )}
                <Select.Icon>
                  <ChevronDownIcon />
                </Select.Icon>
              </div>
            </StyledTrigger>
            <Select.Portal>
              <StyledContent position='popper' sideOffset={4}>
                {searchable && (
                  <SearchContainer>
                    <SearchInput
                      placeholder='Search options...'
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onClick={e => e.stopPropagation()}
                    />
                  </SearchContainer>
                )}
                <StyledViewport>
                  {filteredOptions.length === 0 ? (
                    <div style={{ padding: '8px', textAlign: 'center', color: '#9ca3af' }}>
                      No options found
                    </div>
                  ) : (
                    filteredOptions.map(option => (
                      <StyledItem
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        $disabled={option.disabled}
                      >
                        <Select.ItemText>{option.label}</Select.ItemText>
                      </StyledItem>
                    ))
                  )}
                </StyledViewport>
              </StyledContent>
            </Select.Portal>
          </Select.Root>
        </SelectContainer>
        {displayText && <HelperText $state={actualState}>{displayText}</HelperText>}
      </Container>
    );
  }
);

SelectInput.displayName = 'SelectInput';

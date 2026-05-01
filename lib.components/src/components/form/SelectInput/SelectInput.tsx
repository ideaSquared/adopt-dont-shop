import * as Select from '@radix-ui/react-select';
import React, { forwardRef, useMemo, useState } from 'react';
import clsx from 'clsx';
import countries from '../CountrySelectInput/CountryList.json';
import {
  container,
  label as labelStyle,
  selectContainer,
  trigger,
  content,
  viewport,
  searchContainer,
  searchInput,
  selectItem,
  valueContainer,
  singleValue,
  multiValue,
  multiValueRemove,
  clearButton,
  placeholder,
  helperText,
} from './SelectInput.css';

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
      placeholder: placeholderText = 'Select an option...',
      size = 'md',
      state = 'default',
      disabled = false,
      required = false,
      multiple = false,
      searchable = false,
      clearable = false,
      error,
      helperText: helperTextProp,
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
          <div className={valueContainer}>
            {multipleSelectedOptions.map((option: SelectOption) => (
              <div className={multiValue} key={option.value}>
                {option.label}
                <button
                  className={multiValueRemove}
                  onClick={e => {
                    e.stopPropagation();
                    handleRemoveValue(option.value);
                  }}
                  aria-label={`Remove ${option.label}`}
                >
                  <XIcon />
                </button>
              </div>
            ))}
          </div>
        );
      }

      if (!multiple && selectedOptions) {
        const singleSelectedOption = selectedOptions as SelectOption;
        return <div className={singleValue}>{singleSelectedOption.label}</div>;
      }

      return <span className={placeholder}>{placeholderText}</span>;
    };

    const actualState = error ? 'error' : state;
    const displayText = error || helperTextProp;

    return (
      <div className={clsx(container({ fullWidth }), className)} data-testid={dataTestId}>
        {label && (
          <label className={labelStyle({ required })} htmlFor={dataTestId}>
            {label}
          </label>
        )}
        <div className={selectContainer({ fullWidth })}>
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
            <Select.Trigger
              ref={ref}
              className={trigger({ size, state: actualState, disabled, fullWidth })}
              aria-label={label}
            >
              {renderValue()}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {clearable &&
                  (currentValue || (Array.isArray(currentValue) && currentValue.length > 0)) && (
                    <button
                      className={clearButton}
                      onClick={e => {
                        e.stopPropagation();
                        handleClear();
                      }}
                      aria-label='Clear selection'
                    >
                      <XIcon />
                    </button>
                  )}
                <Select.Icon>
                  <ChevronDownIcon />
                </Select.Icon>
              </div>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className={content} position='popper' sideOffset={4}>
                {searchable && (
                  <div className={searchContainer}>
                    <input
                      className={searchInput}
                      placeholder='Search options...'
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                )}
                <Select.Viewport className={viewport}>
                  {filteredOptions.length === 0 ? (
                    <div style={{ padding: '8px', textAlign: 'center', color: '#9ca3af' }}>
                      No options found
                    </div>
                  ) : (
                    filteredOptions.map(option => (
                      <Select.Item
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        className={selectItem({ disabled: option.disabled })}
                      >
                        <Select.ItemText>{option.label}</Select.ItemText>
                      </Select.Item>
                    ))
                  )}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        {displayText && <div className={helperText({ state: actualState })}>{displayText}</div>}
      </div>
    );
  }
);

SelectInput.displayName = 'SelectInput';

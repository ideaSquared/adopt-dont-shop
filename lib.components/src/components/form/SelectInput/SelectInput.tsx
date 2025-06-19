import React, { forwardRef, useEffect, useRef, useState } from 'react';
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

const getStateStyles = (state: SelectInputState, theme: any) => {
  const states = {
    default: css`
      border-color: ${theme.colors.neutral[300]};
      &:focus-within {
        border-color: ${theme.colors.primary.main};
        box-shadow: 0 0 0 3px ${theme.colors.primary.light}40;
      }
    `,
    error: css`
      border-color: ${theme.colors.semantic.error.main};
      &:focus-within {
        border-color: ${theme.colors.semantic.error.main};
        box-shadow: 0 0 0 3px ${theme.colors.semantic.error.light}40;
      }
    `,
    success: css`
      border-color: ${theme.colors.semantic.success.main};
      &:focus-within {
        border-color: ${theme.colors.semantic.success.main};
        box-shadow: 0 0 0 3px ${theme.colors.semantic.success.light}40;
      }
    `,
    warning: css`
      border-color: ${theme.colors.semantic.warning.main};
      &:focus-within {
        border-color: ${theme.colors.semantic.warning.main};
        box-shadow: 0 0 0 3px ${theme.colors.semantic.warning.light}40;
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

const SelectContainer = styled.div<{
  $size: SelectInputSize;
  $state: SelectInputState;
  $disabled: boolean;
  $isOpen: boolean;
}>`
  position: relative;
  border: 1px solid;
  border-radius: ${({ theme }) => theme.spacing.xs};
  background-color: ${({ theme }) => theme.colors.neutral.white};
  transition: all ${({ theme }) => theme.transitions.fast};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};

  ${({ $size }) => getSizeStyles($size)}
  ${({ $state, theme }) => getStateStyles($state, theme)}

  ${({ $disabled, theme }) =>
    $disabled &&
    css`
      background-color: ${theme.colors.neutral[100]};
      color: ${theme.colors.neutral[400]};
      cursor: not-allowed;
    `}

  ${({ $isOpen }) =>
    $isOpen &&
    css`
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    `}
`;

const SelectContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${({ theme }) => theme.spacing.sm};
  min-height: inherit;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const SelectedValues = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
  flex: 1;
  min-width: 0;
`;

const SelectedValue = styled.span`
  color: ${({ theme }) => theme.colors.neutral[900]};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.primary.light};
  color: ${({ theme }) => theme.colors.primary.dark};
  padding: 2px ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.sm};
  gap: ${({ theme }) => theme.spacing.xs};
`;

const TagRemove = styled.button`
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
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary.main}20;
  }
`;

const Placeholder = styled.span`
  color: ${({ theme }) => theme.colors.neutral[400]};
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  background: transparent;
  flex: 1;
  min-width: 100px;
  font-size: inherit;
  color: ${({ theme }) => theme.colors.neutral[900]};

  &::placeholder {
    color: ${({ theme }) => theme.colors.neutral[400]};
  }
`;

const ChevronIcon = styled.div<{ $isOpen: boolean }>`
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.neutral[400]};
  transition: transform ${({ theme }) => theme.transitions.fast};
  transform: ${({ $isOpen }) => ($isOpen ? 'rotate(180deg)' : 'rotate(0deg)')};

  &::before {
    content: '▼';
    font-size: 12px;
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
  color: ${({ theme }) => theme.colors.neutral[400]};
  border-radius: 50%;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.neutral[100]};
    color: ${({ theme }) => theme.colors.neutral[600]};
  }

  &::before {
    content: '×';
    font-size: 16px;
  }
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.colors.neutral.white};
  border: 1px solid ${({ theme }) => theme.colors.neutral[300]};
  border-top: none;
  border-bottom-left-radius: ${({ theme }) => theme.spacing.xs};
  border-bottom-right-radius: ${({ theme }) => theme.spacing.xs};
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};
`;

const Option = styled.div<{ $isSelected: boolean; $isDisabled: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm};
  cursor: ${({ $isDisabled }) => ($isDisabled ? 'not-allowed' : 'pointer')};
  transition: background-color ${({ theme }) => theme.transitions.fast};
  background-color: ${({ $isSelected, theme }) =>
    $isSelected ? theme.colors.primary.light : 'transparent'};
  color: ${({ $isDisabled, theme }) =>
    $isDisabled ? theme.colors.neutral[400] : theme.colors.neutral[900]};

  &:hover {
    background-color: ${({ $isDisabled, theme }) =>
      $isDisabled ? 'transparent' : theme.colors.neutral[100]};
  }
`;

const NoOptions = styled.div`
  padding: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.neutral[400]};
  text-align: center;
`;

const HelperText = styled.div<{ $state: SelectInputState }>`
  margin-top: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme, $state }) =>
    $state === 'error'
      ? theme.colors.semantic.error.main
      : $state === 'success'
        ? theme.colors.semantic.success.main
        : $state === 'warning'
          ? theme.colors.semantic.warning.main
          : theme.colors.neutral[600]};
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
      searchable = false,
      clearable = false,
      error,
      helperText,
      fullWidth = false,
      className,
      'data-testid': dataTestId,
      onChange,
      onSearch,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedValues, setSelectedValues] = useState<string[]>(() => {
      if (value !== undefined) {
        return Array.isArray(value) ? value : [value];
      }
      if (defaultValue !== undefined) {
        return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
      }
      return [];
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const effectiveState = error ? 'error' : state;
    const effectiveHelperText = error || helperText;

    const filteredOptions = searchable
      ? options.filter(option => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
      : options;

    const selectedOptions = options.filter(option => selectedValues.includes(option.value));

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
        if (searchable && !isOpen) {
          setTimeout(() => searchInputRef.current?.focus(), 0);
        }
      }
    };

    const handleSelect = (optionValue: string) => {
      if (multiple) {
        const newValues = selectedValues.includes(optionValue)
          ? selectedValues.filter(v => v !== optionValue)
          : [...selectedValues, optionValue];
        setSelectedValues(newValues);
        onChange?.(newValues);
      } else {
        setSelectedValues([optionValue]);
        onChange?.(optionValue);
        setIsOpen(false);
      }
    };

    const handleRemoveTag = (optionValue: string) => {
      const newValues = selectedValues.filter(v => v !== optionValue);
      setSelectedValues(newValues);
      onChange?.(multiple ? newValues : '');
    };

    const handleClear = () => {
      setSelectedValues([]);
      onChange?.(multiple ? [] : '');
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      onSearch?.(query);
    };

    const hasValue = selectedValues.length > 0;
    const showClearButton = clearable && hasValue && !disabled;

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
            <SelectedValues>
              {hasValue ? (
                multiple ? (
                  selectedOptions.map(option => (
                    <Tag key={option.value}>
                      {option.label}
                      <TagRemove
                        onClick={e => {
                          e.stopPropagation();
                          handleRemoveTag(option.value);
                        }}
                        aria-label={`Remove ${option.label}`}
                      >
                        ×
                      </TagRemove>
                    </Tag>
                  ))
                ) : (
                  <SelectedValue>{selectedOptions[0]?.label}</SelectedValue>
                )
              ) : searchable && isOpen ? (
                <SearchInput
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={placeholder}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <Placeholder>{placeholder}</Placeholder>
              )}
            </SelectedValues>

            {showClearButton && (
              <ClearButton
                onClick={e => {
                  e.stopPropagation();
                  handleClear();
                }}
                aria-label='Clear selection'
              />
            )}

            <ChevronIcon $isOpen={isOpen} />
          </SelectContent>
        </SelectContainer>

        <Dropdown $isOpen={isOpen}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <Option
                key={option.value}
                $isSelected={selectedValues.includes(option.value)}
                $isDisabled={!!option.disabled}
                onClick={() => !option.disabled && handleSelect(option.value)}
                role='option'
                aria-selected={selectedValues.includes(option.value)}
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


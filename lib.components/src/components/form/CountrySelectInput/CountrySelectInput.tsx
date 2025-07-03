/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import countries from './CountryList.json';

interface CountrySelectProps {
  onCountryChange: (value: string) => void;
  countryValue?: string;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  className?: string;
  'data-testid'?: string;
}

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

  ${({ $required, theme }) =>
    $required &&
    `
      &::after {
        content: ' *';
        color: ${theme.colors.semantic.error[500]};
      }
    `}
`;

const StyledButton = styled.button<{ $hasError: boolean }>`
  padding: 0.75rem;
  border: 1px solid
    ${props =>
      props.$hasError ? props.theme.colors.semantic.error[500] : props.theme.border.color.primary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  font-size: 1rem;
  line-height: 1.5;
  width: 100%;
  background-color: ${props => props.theme.background.primary};
  color: ${props => props.theme.text.primary};
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[200]};
  }

  &:disabled {
    background-color: ${props => props.theme.background.disabled};
    color: ${props => props.theme.text.disabled};
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary[400]};
  }
`;

const DropdownPortal = styled.div<{ $position: { top: number; left: number; width: number } }>`
  position: fixed;
  top: ${({ $position }) => $position.top}px;
  left: ${({ $position }) => $position.left}px;
  width: ${({ $position }) => $position.width}px;
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  background-color: ${props => props.theme.background.primary};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  max-height: 15rem;
  overflow-y: auto;
  border-radius: ${({ theme }) => theme.border.radius.md};
  border: 1px solid ${({ theme }) => theme.border.color.secondary};
`;

const DropdownMenu = styled.ul`
  padding: ${({ theme }) => theme.spacing.xs};
  margin: 0;
  list-style: none;

  li {
    padding: ${({ theme }) => theme.spacing.sm};
    display: flex;
    align-items: center;
    cursor: pointer;
    border-radius: ${({ theme }) => theme.border.radius.sm};
    transition: background-color ${({ theme }) => theme.transitions.fast};

    &:hover {
      background-color: ${props => props.theme.colors.neutral[100]};
    }

    &.selected {
      background-color: ${props => props.theme.colors.primary[100]};
      color: ${props => props.theme.colors.primary[700]};
    }

    &.highlighted {
      background-color: ${props => props.theme.colors.primary[50]};
    }
  }
`;

const FlagIcon = styled.span`
  width: 20px;
  height: 15px;
  margin-right: 0.5rem;
  display: inline-block;
  font-size: 14px;
  text-align: center;
  background-color: ${({ theme }) => theme.colors.neutral[200]};
  border-radius: 2px;
  line-height: 15px;
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

const HelperText = styled.div<{ $hasError: boolean }>`
  margin-top: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme, $hasError }) =>
    $hasError ? theme.colors.semantic.error[500] : theme.colors.neutral[600]};
`;

const CountrySelect: React.FC<CountrySelectProps> = ({
  onCountryChange,
  countryValue = '',
  disabled = false,
  label,
  placeholder = 'Select Country',
  error,
  helperText,
  fullWidth = false,
  className,
  'data-testid': dataTestId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [isOpen]);

  if (!countries || countries.length === 0) {
    console.error('No countries data');
    return null;
  }

  const handleSelect = (name: string) => {
    onCountryChange(name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prevIndex => (prevIndex + 1) % countries.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prevIndex => (prevIndex - 1 + countries.length) % countries.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          handleSelect(countries[highlightedIndex].name);
        } else if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        return;
    }
  };

  const selectedCountry = countries.find(country => country.name === countryValue);
  const hasError = !!error;
  const effectiveHelperText = error || helperText;

  const dropdownContent = isOpen ? (
    <DropdownPortal $position={dropdownPosition}>
      <DropdownMenu role='listbox' aria-activedescendant={countryValue}>
        {countries.map((country, index) => (
          <li
            key={country.code}
            id={country.name}
            role='option'
            aria-selected={country.name === countryValue}
            className={`
              ${country.name === countryValue ? 'selected' : ''} 
              ${highlightedIndex === index ? 'highlighted' : ''}
            `}
            onClick={() => handleSelect(country.name)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect(country.name);
              }
            }}
            tabIndex={-1}
          >
            <FlagIcon title={country.code}>{country.code}</FlagIcon>
            {country.name}
          </li>
        ))}
      </DropdownMenu>
    </DropdownPortal>
  ) : null;

  return (
    <Container ref={containerRef} $fullWidth={fullWidth} className={className}>
      {label && <Label $required={false}>{label}</Label>}

      <StyledButton
        ref={buttonRef}
        type='button'
        role='combobox'
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        $hasError={hasError}
        data-testid={dataTestId}
      >
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {selectedCountry ? (
            <>
              <FlagIcon title={selectedCountry.code}>{selectedCountry.code}</FlagIcon>
              <span>{selectedCountry.name}</span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronIcon $isOpen={isOpen} />
      </StyledButton>

      {effectiveHelperText && <HelperText $hasError={hasError}>{effectiveHelperText}</HelperText>}

      {typeof document !== 'undefined' &&
        dropdownContent &&
        createPortal(dropdownContent, document.body)}
    </Container>
  );
};

export default CountrySelect;

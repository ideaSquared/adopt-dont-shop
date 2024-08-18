/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'
import Flag from 'react-world-flags'
import countries from './CountryList.json'

interface CountrySelectProps {
  onCountryChange: (value: string) => void
  countryValue?: string
  disabled?: boolean
}

const StyledButton = styled.button`
  padding: 0.375rem 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  font-size: 1rem;
  line-height: 1.5;
  width: 100%;
  background-color: ${(props) => props.theme.background.content};
  color: ${(props) => props.theme.text.body};
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;

  &:disabled {
    background-color: ${(props) => props.theme.background.disabled};
    color: ${(props) => props.theme.text.disabled};
  }
`

const DropdownMenu = styled.ul`
  position: absolute;
  z-index: 10;
  margin-top: 0.25rem;
  width: 100%;
  background-color: ${(props) => props.theme.background.content};
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
  max-height: 15rem;
  overflow-y: auto;
  border-radius: 0.25rem;
  padding: 0.375rem 0.75rem;
  line-height: 1.5;
  list-style: none;
  box-sizing: border-box;

  li {
    padding: 0.5rem 1rem;
    display: flex;
    align-items: center;
    cursor: pointer;

    &:hover {
      background-color: ${(props) => props.theme.background.hover};
    }

    &.selected {
      background-color: ${(props) => props.theme.background.selected};
    }

    &.highlighted {
      background-color: ${(props) => props.theme.background.highlighted};
    }
  }
`

const FlagIcon = styled(Flag)`
  width: 20px;
  height: 15px;
  margin-right: 0.5rem;
  object-fit: contain;
`

const CountrySelect: React.FC<CountrySelectProps> = ({
  onCountryChange,
  countryValue = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (!countries || countries.length === 0) {
    console.error('No countries data')
    return null
  }

  const handleSelect = (name: string) => {
    onCountryChange(name)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prevIndex) => (prevIndex + 1) % countries.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(
          (prevIndex) => (prevIndex - 1 + countries.length) % countries.length,
        )
        break
      case 'Enter':
        if (isOpen && highlightedIndex >= 0) {
          handleSelect(countries[highlightedIndex].name)
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
      default:
        return
    }
  }

  return (
    <div ref={dropdownRef}>
      <StyledButton
        ref={buttonRef}
        type="button"
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      >
        {countryValue ? (
          <span className="flex items-center">
            <FlagIcon
              code={
                countries.find((country) => country.name === countryValue)
                  ?.code || ''
              }
            />
            <span>{countryValue}</span>
          </span>
        ) : (
          'Select Country'
        )}
      </StyledButton>
      {isOpen && (
        <DropdownMenu role="listbox" aria-activedescendant={countryValue}>
          {countries.map((country, index) => (
            <li
              key={country.code}
              id={country.name}
              role="option"
              aria-selected={country.name === countryValue}
              className={`
                ${country.name === countryValue ? 'selected' : ''} 
                ${highlightedIndex === index ? 'highlighted' : ''}
              `}
              onClick={() => handleSelect(country.name)}
              onKeyDown={handleKeyDown}
              tabIndex={index}
            >
              <FlagIcon code={country.code} />
              {country.name}
            </li>
          ))}
        </DropdownMenu>
      )}
    </div>
  )
}

export default CountrySelect

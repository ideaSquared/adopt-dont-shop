import React from 'react'
import styled from 'styled-components'

interface Option {
  value: string
  label: string
}

interface SelectInputProps {
  options: Option[]
  value?: string | null
  // eslint-disable-next-line no-unused-vars
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  disabled?: boolean
  required?: boolean
  placeholder?: string
  id?: string
}

const StyledSelect = styled.select`
  padding: 0.375rem 0.75rem;
  border: 1px solid ${(props) => props.theme.border.color.default};
  border-radius: 0.25rem;
  font-size: 1rem;
  line-height: 1.5;
  height: 2.375rem;
  width: 100%;
  background-color: ${(props) => props.theme.background.content};
  color: ${(props) => props.theme.text.body};
  box-sizing: border-box;

  option {
    background-color: ${(props) => props.theme.background.content};
    color: ${(props) => props.theme.text.body};
  }

  &:disabled {
    background-color: ${(props) => props.theme.background.disabled};
    color: ${(props) => props.theme.text.dim};
    cursor: not-allowed;
  }
`

const SelectInput: React.FC<SelectInputProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = 'Select an option',
  id,
}) => {
  return (
    <StyledSelect
      value={value || ''}
      onChange={onChange}
      disabled={disabled}
      required={required}
      id={id}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </StyledSelect>
  )
}

export default SelectInput

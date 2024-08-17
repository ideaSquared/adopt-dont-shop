import React from 'react'
import styled from 'styled-components'

interface TextInputProps {
  value: string | null
  type: string
  // eslint-disable-next-line no-unused-vars
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

const StyledInput = styled.input`
  padding: 0.375rem 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  height: 2.375rem;
  font-size: 1rem;
  line-height: 1.5;
  width: 100%;
  background-color: ${(props) => props.theme.background.content};
  color: ${(props) => props.theme.text.body};
  box-sizing: border-box;
`

const TextInput: React.FC<TextInputProps> = ({
  value,
  type,
  onChange,
  placeholder = '',
  disabled = false,
  required = false,
}) => {
  return (
    <StyledInput
      type={type}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
    />
  )
}

export default TextInput

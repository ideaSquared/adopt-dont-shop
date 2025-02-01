import React from 'react'
import styled from 'styled-components'

type FormInputProps = {
  label: string
  description?: string
  children: React.ReactNode
  buttonText?: string
  onButtonClick?: () => void
  id?: string
}

const Container = styled.div`
  margin-bottom: 1rem;
`

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
`

const Description = styled.span`
  display: block;
  margin-top: 0.5rem;
  color: ${(props) => props.theme.text.dim};
  font-size: 0.875rem;
`

const InputGroup = styled.div`
  display: flex;
  align-items: center;
`

const InputContainer = styled.div`
  flex: 1;
`

const Button = styled.button`
  margin-left: 0.5rem;

  padding: 0.5rem 1rem;
  font-size: 1rem;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }
`

export const FormInput: React.FC<FormInputProps> = ({
  label,
  description,
  children,
  buttonText,
  onButtonClick,
  id,
}) => {
  // Generate a unique ID if none provided
  const inputId = id || `form-input-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <Container>
      <Label htmlFor={inputId}>{label}</Label>
      <InputGroup>
        <InputContainer>
          {/* Wrap children in a div with aria-labelledby to maintain accessibility */}
          <div
            aria-labelledby={inputId}
            aria-describedby={
              description ? `${inputId}-description` : undefined
            }
          >
            {children}
          </div>
        </InputContainer>

        {buttonText && <Button onClick={onButtonClick}>{buttonText}</Button>}
      </InputGroup>
      {description && (
        <Description id={`${inputId}-description`}>{description}</Description>
      )}
    </Container>
  )
}

export default FormInput

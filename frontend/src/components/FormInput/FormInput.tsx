import React from 'react'
import styled from 'styled-components'

interface FormInputProps {
  label: string
  description?: string
  children: React.ReactNode
  buttonText?: string
  onButtonClick?: () => void
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
  margin-bottom: 0.5rem;
  color: #6c757d;
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

const FormInput: React.FC<FormInputProps> = ({
  label,
  description,
  children,
  buttonText,
  onButtonClick,
}) => {
  return (
    <Container>
      <Label>{label}</Label>
      {description && <Description>{description}</Description>}
      <InputGroup>
        <InputContainer>{children}</InputContainer>
        {buttonText && <Button onClick={onButtonClick}>{buttonText}</Button>}
      </InputGroup>
    </Container>
  )
}

export default FormInput

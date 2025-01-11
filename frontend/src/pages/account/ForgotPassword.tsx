import React, { useState } from 'react'

// Third-party imports
import styled from 'styled-components'

// Internal imports
import { Button, FormInput, TextInput } from '@adoptdontshop/components'
import { UserService } from '@adoptdontshop/libs/users'

// Style definitions
const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
`

const Title = styled.h1`
  font-size: 2rem;
  color: #333;
  margin-bottom: 2rem;
`

const Message = styled.p<{ isError?: boolean }>`
  color: ${({ isError }) => (isError ? '#dc3545' : '#28a745')};
  margin: 1rem 0;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: ${({ isError }) => (isError ? '#f8d7da' : '#d4edda')};
`

const Form = styled.form`
  margin-bottom: 2rem;
`

// Types
type ForgotPasswordProps = {
  // No props needed currently
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = () => {
  // State
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  // Event handlers
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const success = await UserService.forgotPassword(email)
    setMessage(success ? 'Password reset link sent!' : 'Email not found')
  }

  // Render
  return (
    <Container>
      <Title>Forgot password</Title>
      <Form onSubmit={handleSubmit}>
        <FormInput label="Email">
          <TextInput
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            type="email"
            required
          />
        </FormInput>

        <Button type="submit">Reset my password</Button>
      </Form>
      {message && (
        <Message isError={message.includes('not found')}>{message}</Message>
      )}
    </Container>
  )
}

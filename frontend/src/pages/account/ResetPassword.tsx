import React, { useEffect, useState } from 'react'

// Third-party imports
import { useLocation } from 'react-router-dom'
import styled from 'styled-components'

// Internal imports
import { Button, FormInput, TextInput } from '@adoptdontshop/components'
import { UserService } from '@adoptdontshop/libs/users/'

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
type ResetPasswordProps = {
  // No props needed currently
}

// Hooks
const useQuery = () => {
  return new URLSearchParams(useLocation().search)
}

export const ResetPassword: React.FC<ResetPasswordProps> = () => {
  // Hooks
  const query = useQuery()

  // State
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')

  // Effects
  useEffect(() => {
    const token = query.get('token')
    if (token) {
      setResetToken(token)
    } else {
      setMessage('Invalid or missing reset token')
    }
  }, [query])

  // Event handlers
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!resetToken) {
      setMessage('No reset token provided')
      return
    }

    const success = await UserService.resetPassword(resetToken, newPassword)
    setMessage(
      success ? 'Password reset successful!' : 'Invalid or expired token',
    )
  }

  // Render
  return (
    <Container>
      <Title>Reset Password</Title>
      <Form onSubmit={handleSubmit}>
        <FormInput label="New Password">
          <TextInput
            value={newPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewPassword(e.target.value)
            }
            type="password"
            required
          />
        </FormInput>

        <Button type="submit">Reset Password</Button>
      </Form>
      {message && (
        <Message
          isError={message.includes('Invalid') || message.includes('No reset')}
        >
          {message}
        </Message>
      )}
    </Container>
  )
}

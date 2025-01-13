// src/pages/CompleteAccountSetup.tsx

import React, { useEffect, useState } from 'react'

// Third-party imports
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

// Internal imports
import { Alert, Button, FormInput, TextInput } from '@adoptdontshop/components'
import { UserService } from '@adoptdontshop/libs/users'

// Style definitions
const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
`

const Title = styled.h1`
  font-size: 2rem;

  margin-bottom: 2rem;
`

const Form = styled.form`
  margin-bottom: 2rem;
`

// Types
type CompleteAccountSetupProps = {
  // No props needed currently
}

// Hooks
const useQuery = () => {
  return new URLSearchParams(useLocation().search)
}

export const CompleteAccountSetup: React.FC<CompleteAccountSetupProps> = () => {
  // Hooks
  const query = useQuery()
  const navigate = useNavigate()

  // State
  const [setupToken, setSetupToken] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  // Effects
  useEffect(() => {
    const token = query.get('token')
    if (token) {
      setSetupToken(token)
    } else {
      setMessage('Invalid or missing account setup token')
    }
  }, [query])

  // Event handlers
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!setupToken) {
      setMessage('No setup token provided')
      return
    }

    try {
      const response = await UserService.completeAccountSetup(
        setupToken,
        password,
      )
      setMessage(response.message)
      // Redirect to login page after a short delay
      setTimeout(() => navigate('/login'), 2000)
    } catch {
      setMessage('Account setup failed. Please try again.')
    }
  }

  // Render
  return (
    <Container>
      <Title>Complete Account Setup</Title>
      <Form onSubmit={handleSubmit}>
        <FormInput label="New Password">
          <TextInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </FormInput>

        <Button type="submit">Set Password and Complete Setup</Button>
      </Form>
      {message && (
        <Alert
          variant={
            message.includes('success')
              ? 'success'
              : message.includes('failed') ||
                  message.includes('Invalid') ||
                  message.includes('missing')
                ? 'error'
                : 'info'
          }
        >
          {message}
        </Alert>
      )}
    </Container>
  )
}

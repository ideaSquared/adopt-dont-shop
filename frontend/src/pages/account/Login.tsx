import React, { useState } from 'react'

// Third-party imports
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

// Internal imports
import { Alert, Button, FormInput, TextInput } from '@adoptdontshop/components'
import { useUser } from 'contexts/auth/UserContext'

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

const HelpText = styled.p`
  color: #666;
  font-size: 0.9rem;
  margin: 0.5rem 0;
`

const Link = styled.a`
  color: #007bff;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const LinksContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
`

// Types
type LoginProps = {
  // No props needed currently
}

export const Login: React.FC<LoginProps> = () => {
  // Hooks
  const navigate = useNavigate()
  const { loginUser } = useUser()

  // State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  // Event handlers
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const success = await loginUser(email, password)
      if (success) {
        navigate('/')
      } else {
        setMessage('Invalid email or password')
      }
    } catch (error) {
      setMessage('Login failed. Please try again.')
    }
  }

  // Render
  return (
    <Container>
      <Title>Login</Title>
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
        <FormInput label="Password">
          <TextInput
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            type="password"
            required
          />
        </FormInput>

        <Button type="submit">Login</Button>
      </Form>

      {message && (
        <Alert
          variant={
            message.includes('success')
              ? 'success'
              : message.includes('Invalid') || message.includes('failed')
                ? 'error'
                : 'info'
          }
        >
          {message}
        </Alert>
      )}

      <LinksContainer>
        <Link href="/forgot-password">Forgot password?</Link>
        <Link href="/create-account">Create an account</Link>
      </LinksContainer>

      <HelpText>
        Need help? Contact us at{' '}
        <Link href="mailto:help@adoptdontshop.app">help@adoptdontshop.app</Link>
      </HelpText>
    </Container>
  )
}

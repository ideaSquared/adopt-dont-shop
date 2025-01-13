import React, { useEffect, useState } from 'react'

// Third-party imports
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

// Internal imports
import { Button } from '@adoptdontshop/components'
import { UserService } from '@adoptdontshop/libs/users'

// Style definitions
const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
`

const Title = styled.h1`
  font-size: 2rem;

  margin-bottom: 2rem;
`

const Message = styled.p<{ isError?: boolean }>`
  color: ${({ isError }) => (isError ? '#dc3545' : '#28a745')};
  margin: 1rem 0;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: ${({ isError }) => (isError ? '#f8d7da' : '#d4edda')};
`

const LoadingText = styled.p`
  color: #666;
  font-size: 1.1rem;
  margin: 1rem 0;
`

const ButtonContainer = styled.div`
  margin-top: 2rem;
`

// Types
type VerifyEmailProps = {
  // No props needed currently
}

export const VerifyEmail: React.FC<VerifyEmailProps> = () => {
  // Hooks
  const navigate = useNavigate()
  const location = useLocation()

  // State
  const [message, setMessage] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [isVerified, setIsVerified] = useState<boolean>(false)

  // Effects
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search)
    const token = queryParams.get('token')

    if (token && !isVerified) {
      // Check if it's already verified to prevent double call
      UserService.verifyEmail(token)
        .then((response) => {
          setMessage(response.message || 'Email verified successfully!')
          setLoading(false)
          setIsVerified(true)
        })
        .catch(() => {
          setMessage(
            'Verification failed. The token might be invalid or expired.',
          )
          setLoading(false)
        })
    } else {
      setMessage('No verification token provided.')
      setLoading(false)
    }
  }, [location.search, isVerified])

  // Event handlers
  const handleBackToHome = () => {
    navigate('/')
  }

  // Render
  return (
    <Container>
      <Title>Email Verification</Title>
      {loading ? (
        <LoadingText>Verifying...</LoadingText>
      ) : (
        <>
          <Message
            isError={
              message.includes('failed') || message.includes('No verification')
            }
          >
            {message}
          </Message>
          <ButtonContainer>
            <Button onClick={handleBackToHome}>Back to Home</Button>
          </ButtonContainer>
        </>
      )}
    </Container>
  )
}

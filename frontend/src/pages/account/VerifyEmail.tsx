import { Button } from '@adoptdontshop/components'
import { UserService } from '@adoptdontshop/libs/users'
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const VerifyEmail: React.FC = () => {
  const [message, setMessage] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const navigate = useNavigate()
  const location = useLocation()
  const [isVerified, setIsVerified] = useState<boolean>(false)

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

  const handleBackToHome = () => {
    navigate('/')
  }

  return (
    <div>
      <h1>Email Verification</h1>
      {loading ? (
        <p>Verifying...</p>
      ) : (
        <div>
          <p>{message}</p>
          <Button onClick={handleBackToHome}>Back to Home</Button>
        </div>
      )}
    </div>
  )
}

export default VerifyEmail

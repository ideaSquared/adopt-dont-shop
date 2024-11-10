// src/pages/CompleteAccountSetup.tsx

import { Button, FormInput, TextInput } from '@adoptdontshop/components'
import { UserService } from '@adoptdontshop/libs/users'
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const useQuery = () => {
  return new URLSearchParams(useLocation().search)
}

const CompleteAccountSetup: React.FC = () => {
  const query = useQuery()
  const navigate = useNavigate() // Use useNavigate instead of useHistory

  // Component state
  const [setupToken, setSetupToken] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  // Retrieve token from URL query parameters
  useEffect(() => {
    const token = query.get('token')
    if (token) {
      setSetupToken(token)
    } else {
      setMessage('Invalid or missing account setup token')
    }
  }, [query])

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

  return (
    <div>
      <h1>Complete Account Setup</h1>
      <form onSubmit={handleSubmit}>
        <FormInput label="New Password">
          <TextInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </FormInput>

        <Button type="submit">Set Password and Complete Setup</Button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}

export default CompleteAccountSetup

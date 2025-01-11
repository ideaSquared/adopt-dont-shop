import { Button, FormInput, TextInput } from '@adoptdontshop/components'
import { useUser } from 'contexts/auth/UserContext'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

type LoginProps = {
  // No props needed for this component, but maintaining consistent structure
}

export const Login: React.FC<LoginProps> = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const { loginUser } = useUser()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      const success = await loginUser(email, password)
      if (success) {
        setMessage('Login successful!')
      } else {
        setMessage('Login failed: Invalid email or password.')
      }
    } catch (error) {
      console.error('Error during login:', error)
      setMessage('Login failed')
    }
  }

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
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
      </form>
      {message && <p>{message}</p>}
      <p>
        <Link to="/forgot-password">Forgot Password?</Link>
      </p>
    </div>
  )
}

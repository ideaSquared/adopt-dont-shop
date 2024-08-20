import { Button, FormInput, TextInput } from '@adoptdontshop/components'
import { UserService } from '@adoptdontshop/libs/users/'
import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const useQuery = () => {
  return new URLSearchParams(useLocation().search)
}

const ResetPassword: React.FC = () => {
  const query = useQuery()
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = query.get('token')
    if (token) {
      setResetToken(token)
    } else {
      setMessage('Invalid or missing reset token')
    }
  }, [query])

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

  return (
    <div>
      <h1>Reset Password</h1>
      <form onSubmit={handleSubmit}>
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
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}

export default ResetPassword

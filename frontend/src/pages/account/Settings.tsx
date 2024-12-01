import { Button, FormInput, TextInput } from '@adoptdontshop/components'
import { User, UserService } from '@adoptdontshop/libs/users/'
import React, { useState } from 'react'

const Settings: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user')
    return storedUser ? JSON.parse(storedUser) : null
  })
  const [message, setMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target

    if (user) {
      setUser({
        ...user,
        [name]: value,
      })
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (user) {
      const updatedUser = await UserService.updateUser(user)
      setMessage(
        updatedUser ? 'Settings updated successfully!' : 'Update failed',
      )
    }
  }

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!user || !user.user_id) {
      // TODO: Return a generic response maybe? I don't think we should be telling a user they're not found
      setPasswordMessage('User not found')
      return
    }

    const success = await UserService.changePassword(
      user.user_id,
      currentPassword,
      newPassword,
    )

    setPasswordMessage(
      success ? 'Password changed successfully!' : 'Failed to change password',
    )
    setCurrentPassword('')
    setNewPassword('')
  }

  return (
    <div>
      <h1>Settings</h1>
      {user ? (
        <>
          <form onSubmit={handleSubmit}>
            <FormInput label="User ID">
              <TextInput
                type="text"
                name="user_id"
                value={user.user_id}
                onChange={() => {}}
                disabled
              />
            </FormInput>
            <FormInput label="First name">
              <TextInput
                type="text"
                name="first_name"
                value={user.first_name || ''}
                onChange={handleChange}
              />
            </FormInput>
            <FormInput label="Last name">
              <TextInput
                type="text"
                name="last_name"
                value={user.last_name || ''}
                onChange={handleChange}
              />
            </FormInput>
            <FormInput label="Email">
              <TextInput
                type="email"
                name="email"
                value={user.email || ''}
                onChange={handleChange}
              />
            </FormInput>

            <Button type="submit">Save Settings</Button>
          </form>

          <h2>Change Password</h2>
          <form onSubmit={handleChangePassword}>
            <FormInput label="Current password">
              <TextInput
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </FormInput>
            <FormInput label="New password">
              <TextInput
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </FormInput>
            <Button type="submit">Change Password</Button>
          </form>

          {passwordMessage && <p>{passwordMessage}</p>}
        </>
      ) : (
        <p>Loading...</p>
      )}
      {message && <p>{message}</p>}
    </div>
  )
}

export default Settings

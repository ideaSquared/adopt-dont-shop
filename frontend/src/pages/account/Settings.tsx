import React, { useState } from 'react'

// Third-party imports
import styled from 'styled-components'

// Internal imports
import { Button, FormInput, TextInput } from '@adoptdontshop/components'
import { User, UserService } from '@adoptdontshop/libs/users/'

// Style definitions
const SettingsContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
`

const Title = styled.h1`
  font-size: 2rem;
  color: #333;
  margin-bottom: 2rem;
`

const SubTitle = styled.h2`
  font-size: 1.5rem;
  color: #444;
  margin: 2rem 0 1rem;
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
type SettingsProps = {
  // No props needed currently
}

export const Settings: React.FC<SettingsProps> = () => {
  // State
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user')
    return storedUser ? JSON.parse(storedUser) : null
  })
  const [message, setMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // Event handlers
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

    if (!user?.user_id) {
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

  // Render
  if (!user) {
    return (
      <SettingsContainer>
        <Message isError>Loading...</Message>
      </SettingsContainer>
    )
  }

  return (
    <SettingsContainer>
      <Title>Settings</Title>
      <Form onSubmit={handleSubmit}>
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
        {message && (
          <Message isError={message.includes('failed')}>{message}</Message>
        )}
      </Form>

      <SubTitle>Change Password</SubTitle>
      <Form onSubmit={handleChangePassword}>
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
        {passwordMessage && (
          <Message isError={passwordMessage.includes('failed')}>
            {passwordMessage}
          </Message>
        )}
      </Form>
    </SettingsContainer>
  )
}

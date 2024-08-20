import { Button, FormInput, TextInput } from '@adoptdontshop/components'
import { User, UserService } from '@adoptdontshop/libs/users/'
import React, { useState } from 'react'

const Settings: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user')
    return storedUser ? JSON.parse(storedUser) : null
  })
  const [message, setMessage] = useState('')

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

  return (
    <div>
      <h1>Settings</h1>
      {user ? (
        <form onSubmit={handleSubmit}>
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
      ) : (
        <p>Loading...</p>
      )}
      {message && <p>{message}</p>}
    </div>
  )
}

export default Settings

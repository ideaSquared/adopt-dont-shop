import {
  Badge,
  Button,
  CheckboxInput,
  FormInput,
  SelectInput,
  Table,
  TextInput,
} from '@adoptdontshop/components'
import { User, UserService } from '@adoptdontshop/libs/users'
import { Role } from '@adoptdontshop/permissions'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

const BadgeWrapper = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchByEmailName, setSearchByEmailName] = useState<string | null>('')
  const [filterByAdmin, setFilterByAdmin] = useState<boolean>(false)
  const [filterByVerified, setFilterByVerified] = useState<boolean>(false)
  const [filterByRole, setFilterByRole] = useState<Role | 'all'>('all')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await UserService.getUsers()
        setUsers(fetchedUsers)
        setFilteredUsers(fetchedUsers)
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    fetchUsers()
  }, [])

  useEffect(() => {
    const filtered = users.filter((user) => {
      // Check if the user's email or name matches the search term
      const matchesSearch =
        !searchByEmailName ||
        user.email.toLowerCase().includes(searchByEmailName.toLowerCase()) ||
        user.first_name
          .toLowerCase()
          .includes(searchByEmailName.toLowerCase()) ||
        (user.last_name
          ?.toLowerCase()
          .includes(searchByEmailName.toLowerCase()) ??
          false)

      // Check if the user is verified if the filter is active
      const matchesVerified = !filterByVerified || user.reset_token_force_flag

      const matchesRole =
        filterByRole === 'all' ||
        user.roles.some((role) => role === filterByRole)

      return matchesSearch && matchesVerified && matchesRole
    })

    setFilteredUsers(filtered)
  }, [searchByEmailName, filterByAdmin, filterByVerified, filterByRole, users])

  const handleSearchByEmailName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchByEmailName(e.target.value)
  }

  const handleFilterByAdmin = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterByAdmin(e.target.checked)
  }

  const handleFilterByVerified = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterByVerified(e.target.checked)
  }

  return (
    <div>
      <h1>Users</h1>
      <FormInput label="Search by name or email">
        <TextInput
          type="text"
          value={searchByEmailName}
          onChange={handleSearchByEmailName}
        />
      </FormInput>
      <FormInput label="Admin Only">
        <CheckboxInput checked={filterByAdmin} onChange={handleFilterByAdmin} />
      </FormInput>
      <FormInput label="Verified Only">
        <CheckboxInput
          checked={filterByVerified}
          onChange={handleFilterByVerified}
        />
      </FormInput>
      <FormInput label="Filter by Role">
        <SelectInput
          value={filterByRole}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setFilterByRole(e.target.value as Role | 'all')
          }
          options={[
            { value: 'all', label: 'All Roles' },
            ...Object.values(Role).map((role) => ({
              value: role,
              label: role.replace(/_/g, ' ').toLowerCase(),
            })),
          ]}
        />
      </FormInput>

      <Table>
        <thead>
          <tr>
            <th>User ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Roles</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user) => (
            <tr key={user.user_id}>
              <td>{user.user_id}</td>
              <td>{user.first_name}</td>
              <td>{user.last_name}</td>
              <td>{user.email}</td>
              <td>
                <BadgeWrapper>
                  {/* Assuming user roles are an array of Role enums */}
                  {user.roles?.map((role) => (
                    <Badge key={role} variant="info">
                      {role.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  ))}
                  {user.reset_token_force_flag && (
                    <Badge variant="success">Force reset</Badge>
                  )}
                </BadgeWrapper>
              </td>
              <td>
                <Button type="button">Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

export default Users

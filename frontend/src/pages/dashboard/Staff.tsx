// src/components/Staff.tsx

import {
  Badge,
  Button,
  CheckboxInput,
  FormInput,
  SelectInput,
  Table,
  TextInput,
} from '@adoptdontshop/components'
import { RescueService, StaffMember } from '@adoptdontshop/libs/rescues'
import { Role } from '@adoptdontshop/permissions'
import { useUser } from 'contexts/auth/UserContext'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

const BadgeWrapper = styled.div`
  display: flex;
  gap: 0.5rem;
`

const Staff: React.FC = () => {
  const { rescue } = useUser()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([])
  const [searchByEmailName, setSearchByEmailName] = useState<string | null>('')
  const [filterByRole, setFilterByRole] = useState<Role | 'all'>('all')
  const [filterByVerified, setFilterByVerified] = useState<boolean>(false)

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        if (!rescue) return
        const fetchedStaff = await RescueService.getStaffMembersByRescueId(
          rescue.rescue_id,
        )
        setStaff(fetchedStaff || [])
        setFilteredStaff(fetchedStaff || [])
      } catch (error) {
        console.error('Failed to fetch staff:', error) // Use actual error handling in production
      }
    }
    fetchStaff()
  }, [rescue])

  useEffect(() => {
    const filtered = staff.filter((member) => {
      const matchesSearch =
        !searchByEmailName ||
        member.user_id.includes(searchByEmailName) || // Added search by user_id
        member.email.toLowerCase().includes(searchByEmailName.toLowerCase()) ||
        member.first_name
          .toLowerCase()
          .includes(searchByEmailName.toLowerCase()) ||
        (member.last_name
          ?.toLowerCase()
          .includes(searchByEmailName.toLowerCase()) ??
          false)

      const matchesRole =
        filterByRole === 'all' ||
        member.role.some((r) => r.role_name === filterByRole)

      const matchesVerified = !filterByVerified || member.verified_by_rescue

      return matchesSearch && matchesRole && matchesVerified
    })

    setFilteredStaff(filtered)
  }, [searchByEmailName, filterByRole, filterByVerified, staff])

  const handleSearchByEmailName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchByEmailName(e.target.value)
  }

  const handleFilterByRole = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterByRole(e.target.value as Role | 'all')
  }

  const deleteStaff = (staff_member_id: string) => {
    alert(`Deleting staff with ID ${staff_member_id}`) // Replace with actual deletion logic
  }

  return (
    <div>
      <h1>Staff</h1>
      <FormInput label="Search by name, email, or user ID">
        <TextInput
          type="text"
          value={searchByEmailName || ''}
          onChange={handleSearchByEmailName}
        />
      </FormInput>
      <FormInput label="Filter by Role">
        <SelectInput
          value={filterByRole}
          onChange={handleFilterByRole}
          options={[
            { value: 'all', label: 'Filter by all roles' },
            ...Object.values(Role).map((role) => ({
              value: role,
              label: role.replace(/_/g, ' ').toLowerCase(),
            })),
          ]}
        />
      </FormInput>
      <FormInput label="Verified Only">
        <CheckboxInput
          checked={filterByVerified}
          onChange={(e) => setFilterByVerified(e.target.checked)}
        />
      </FormInput>
      <Table>
        <thead>
          <tr>
            <th>User ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Verified</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredStaff.map((staff) => (
            <tr key={staff.user_id}>
              <td>{staff.user_id}</td>
              <td>{staff.first_name}</td>
              <td>{staff.last_name}</td>
              <td>{staff.email}</td>
              <td>
                <BadgeWrapper>
                  {staff.role.map((role) => (
                    <Badge key={role.role_id} variant="info">
                      {role.role_name.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  ))}
                </BadgeWrapper>
              </td>
              <td>
                {staff.verified_by_rescue ? (
                  <Badge variant="success">YES</Badge>
                ) : (
                  <Badge variant="danger">NO</Badge>
                )}
              </td>
              <td>
                <Button
                  type="button"
                  onClick={() => deleteStaff(staff.user_id)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

export default Staff

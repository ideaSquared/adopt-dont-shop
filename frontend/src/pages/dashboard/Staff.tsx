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
import { RescueService } from '@adoptdontshop/libs/rescues'
import { Role } from '@adoptdontshop/permissions'
import { useUser } from 'contexts/auth/UserContext'
import { RoleDisplay } from 'contexts/permissions/Permission'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

const BadgeWrapper = styled.div`
  display: flex;
  gap: 0.5rem;
`

interface StaffWithInvite {
  user_id: string
  first_name: string
  last_name: string
  email: string
  role: RoleDisplay[]
  verified_by_rescue: boolean
  isInvite?: boolean
  invited_on?: Date
  status?: string
}
const Staff: React.FC = () => {
  const { rescue } = useUser()
  const [staff, setStaff] = useState<StaffWithInvite[]>([])
  const [filteredStaff, setFilteredStaff] = useState<StaffWithInvite[]>([])
  const [searchByEmailName, setSearchByEmailName] = useState<string | null>('')
  const [filterByRole, setFilterByRole] = useState<Role | 'all'>('all')
  const [filterByVerified, setFilterByVerified] = useState<boolean>(false)
  const [inviteEmail, setInviteEmail] = useState<string>('')

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        if (!rescue) return
        const fetchedStaff = await RescueService.getStaffMembersByRescueId(
          rescue.rescue_id,
        )
        console.log('Fetched staff:', fetchedStaff) // Debugging log
        setStaff(fetchedStaff || [])
        setFilteredStaff(fetchedStaff || [])
      } catch (error) {
        console.error('Failed to fetch staff:', error)
      }
    }
    fetchStaff()
  }, [rescue])

  useEffect(() => {
    const filtered = staff.filter((member) => {
      const matchesSearch =
        !searchByEmailName ||
        member.user_id.includes(searchByEmailName) ||
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

    console.log('Filtered staff:', filtered) // Debugging log
    setFilteredStaff(filtered)
  }, [searchByEmailName, filterByRole, filterByVerified, staff])

  const handleSearchByEmailName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchByEmailName(e.target.value)
  }

  const handleFilterByRole = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterByRole(e.target.value as Role | 'all')
  }

  const deleteStaff = async (staff_member_id: string) => {
    try {
      await RescueService.deleteStaffMember(staff_member_id)
      setStaff((prevStaff) =>
        prevStaff.filter((staff) => staff.user_id !== staff_member_id),
      )
      alert('Staff member deleted successfully')
    } catch (error) {
      console.error('Error deleting staff member:', error)
      alert('Failed to delete staff member')
    }
  }

  const inviteUser = async () => {
    try {
      await RescueService.inviteUser(inviteEmail, rescue!.rescue_id)
      alert('Invitation sent successfully')

      // Add the invited user to the `staff` and `filteredStaff` lists
      const newInvite: StaffWithInvite = {
        user_id: '', // No user ID for an invitation
        first_name: '',
        last_name: '',
        email: inviteEmail,
        role: [], // No roles assigned for invitations
        verified_by_rescue: false,
        isInvite: true,
        invited_on: new Date(), // Set to current date and time
        status: 'Pending', // Initial status for an invitation
      }

      // Update both `staff` and `filteredStaff` states
      setStaff((prevStaff) => [...prevStaff, newInvite])
      setFilteredStaff((prevFiltered) => [...prevFiltered, newInvite])

      // Clear the email input after successful invitation
      setInviteEmail('')
    } catch (error) {
      console.error('Error inviting user:', error)
      alert('Failed to send invitation')
    }
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
      <FormInput label="Invite New Staff by Email">
        <TextInput
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="Enter email to invite"
        />
        <Button type="button" onClick={inviteUser}>
          Send Invite
        </Button>
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
            <th>Invited On</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredStaff.length > 0 ? (
            filteredStaff.map((staff) => (
              <tr key={staff.user_id || staff.email}>
                <td>{staff.isInvite ? '-' : staff.user_id}</td>
                <td>{staff.isInvite ? '-' : staff.first_name}</td>
                <td>{staff.isInvite ? '-' : staff.last_name}</td>
                <td>{staff.email}</td>
                <td>
                  <BadgeWrapper>
                    {staff.isInvite
                      ? 'Pending Invitation'
                      : staff.role.map((role) => (
                          <Badge key={role.role_id} variant="info">
                            {role.role_name.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        ))}
                  </BadgeWrapper>
                </td>
                <td>
                  {staff.isInvite
                    ? '-'
                    : staff.verified_by_rescue
                      ? 'YES'
                      : 'NO'}
                </td>
                <td>
                  {staff.isInvite ? staff.invited_on?.toLocaleString() : '-'}
                </td>
                <td>
                  {staff.isInvite ? (
                    <Badge variant="warning">Pending</Badge>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => deleteStaff(staff.user_id)}
                    >
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8}>No staff or invitations to display</td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  )
}

export default Staff

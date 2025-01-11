// src/components/Staff.tsx

import {
  Badge,
  Button,
  CheckboxInput,
  DateTime,
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
  flex-wrap: wrap;
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

// Allowed roles for selection in the dropdown
const ALLOWED_ROLES: Role[] = [
  Role.RESCUE_MANAGER,
  Role.STAFF_MANAGER,
  Role.PET_MANAGER,
  Role.APPLICATION_MANAGER,
  Role.COMMUNICATIONS_MANAGER,
]

const Staff: React.FC = () => {
  const { rescue, user } = useUser()
  const [staff, setStaff] = useState<StaffWithInvite[]>([])
  const [filteredStaff, setFilteredStaff] = useState<StaffWithInvite[]>([])
  const [searchByEmailName, setSearchByEmailName] = useState<string | null>('')
  const [filterByRole, setFilterByRole] = useState<Role | 'all'>('all')
  const [filterByVerified, setFilterByVerified] = useState<boolean>(false)
  const [inviteEmail, setInviteEmail] = useState<string>('')
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null)

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

  const cancelInvitation = async (email: string) => {
    try {
      if (!rescue) return
      await RescueService.cancelInvitation(email, rescue.rescue_id)

      // Remove the canceled invitation from the lists
      setStaff((prevStaff) =>
        prevStaff.filter((staff) => staff.email !== email || !staff.isInvite),
      )
      setFilteredStaff((prevFiltered) =>
        prevFiltered.filter(
          (staff) => staff.email !== email || !staff.isInvite,
        ),
      )

      alert('Invitation canceled successfully')
    } catch (error) {
      console.error('Error canceling invitation:', error)
      alert('Failed to cancel invitation')
    }
  }

  const handleAddRoleClick = (userId: string) => {
    setShowRoleDropdown(userId === showRoleDropdown ? null : userId)
  }

  const handleRoleSelect = async (userId: string, selectedRole: Role) => {
    try {
      await RescueService.addRoleToUser(rescue!.rescue_id, userId, selectedRole)
      setStaff((prevStaff) =>
        prevStaff.map((member) =>
          member.user_id === userId
            ? {
                ...member,
                role: [
                  ...member.role,
                  { role_id: selectedRole, role_name: selectedRole },
                ],
              }
            : member,
        ),
      )
      setShowRoleDropdown(null)
    } catch (error) {
      console.error('Failed to assign role:', error)
      alert('Failed to assign role')
    }
  }

  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      const role = staff
        .find((member) => member.user_id === userId)
        ?.role.find((r) => r.role_id === roleId)?.role_name

      if (!role || !ALLOWED_ROLES.includes(role as Role)) {
        alert('Role cannot be removed')
        return
      }

      await RescueService.removeRoleFromUser(rescue!.rescue_id, userId, roleId)
      setStaff((prevStaff) =>
        prevStaff.map((member) =>
          member.user_id === userId
            ? {
                ...member,
                role: member.role.filter((r) => r.role_id !== roleId),
              }
            : member,
        ),
      )
    } catch (error) {
      console.error('Failed to remove role:', error)
      alert('Failed to remove role')
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
      <FormInput
        label="Invite New Staff by Email"
        buttonText="Send invite"
        onButtonClick={inviteUser}
      >
        <TextInput
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="Enter email to invite"
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
                    {staff.role.map((role) => (
                      <Badge
                        key={role.role_id}
                        variant="info"
                        onActionClick={
                          user &&
                          user.user_id !== staff.user_id &&
                          ALLOWED_ROLES.includes(role.role_name as Role)
                            ? () =>
                                handleRemoveRole(staff.user_id, role.role_id)
                            : undefined
                        }
                        showAction={
                          user &&
                          user.user_id !== staff.user_id &&
                          ALLOWED_ROLES.includes(role.role_name as Role)
                        }
                      >
                        {role.role_name.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    ))}
                    {user && user.user_id !== staff.user_id && (
                      <>
                        <Badge
                          variant="success"
                          onClick={() => handleAddRoleClick(staff.user_id)}
                        >
                          +
                        </Badge>
                        {showRoleDropdown === staff.user_id && (
                          <SelectInput
                            options={ALLOWED_ROLES.map((role) => ({
                              value: role,
                              label: role.replace(/_/g, ' ').toUpperCase(),
                            }))}
                            placeholder="Choose a role"
                            onChange={(e) =>
                              handleRoleSelect(
                                staff.user_id,
                                e.target.value as Role,
                              )
                            }
                          />
                        )}
                      </>
                    )}
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
                  {staff.isInvite && staff.invited_on ? (
                    <DateTime timestamp={staff.invited_on} />
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  {staff.isInvite ? (
                    <>
                      <Button
                        type="button"
                        onClick={() => cancelInvitation(staff.email)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    user &&
                    user.user_id !== staff.user_id && (
                      <Button
                        type="button"
                        onClick={() => deleteStaff(staff.user_id)}
                      >
                        Delete
                      </Button>
                    )
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

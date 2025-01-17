import React, { useEffect, useState } from 'react'

import {
  Badge,
  Button,
  FilterConfig,
  GenericFilters,
  Table,
} from '@adoptdontshop/components'
import { RescueService } from '@adoptdontshop/libs/rescues'
import { Role } from '@adoptdontshop/permissions'
import { useUser } from 'contexts/auth/UserContext'
import { RoleDisplay } from 'contexts/permissions/Permission'
import styled from 'styled-components'

// Style definitions
const Container = styled.div`
  padding: 1rem;
`

const Title = styled.h1`
  margin-bottom: 2rem;
  font-size: 1.8rem;
`

const TableContainer = styled.div`
  margin-top: 2rem;
`

const BadgeWrapper = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`

// Types
type StaffWithInvite = {
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

// Component
export const Staff: React.FC = () => {
  const { rescue, user } = useUser()
  const [staff, setStaff] = useState<StaffWithInvite[]>([])
  const [filteredStaff, setFilteredStaff] = useState<StaffWithInvite[]>([])
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    verified: 'all',
  })

  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null)

  // Filter configuration
  const filterConfig: FilterConfig[] = [
    {
      name: 'search',
      label: 'Search by name or email',
      type: 'text',
      placeholder: 'Enter name or email',
    },
    {
      name: 'role',
      label: 'Filter by Role',
      type: 'select',
      options: [
        { value: 'all', label: 'All Roles' },
        ...Object.values(Role).map((role) => ({
          value: role,
          label: role.replace(/_/g, ' ').toLowerCase(),
        })),
      ],
    },
    {
      name: 'verified',
      label: 'Verified Only',
      type: 'select',
      options: [
        { value: 'all', label: 'All' },
        { value: 'yes', label: 'Verified' },
        { value: 'no', label: 'Not Verified' },
      ],
    },
  ]

  // Fetch staff
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
        console.error('Failed to fetch staff:', error)
      }
    }
    fetchStaff()
  }, [rescue])

  // Filter staff based on the filters state
  useEffect(() => {
    const filtered = staff.filter((member) => {
      const matchesSearch =
        !filters.search ||
        member.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        member.first_name
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        member.last_name?.toLowerCase().includes(filters.search.toLowerCase())

      const matchesRole =
        filters.role === 'all' ||
        member.role.some((r) => r.role_name === filters.role)

      const matchesVerified =
        filters.verified === 'all' ||
        (filters.verified === 'yes' && member.verified_by_rescue) ||
        (filters.verified === 'no' && !member.verified_by_rescue)

      return matchesSearch && matchesRole && matchesVerified
    })
    setFilteredStaff(filtered)
  }, [filters, staff])

  const handleAddRoleClick = (userId: string) => {
    setShowRoleDropdown(userId === showRoleDropdown ? null : userId)
  }

  const handleRoleSelect = async (userId: string, selectedRole: Role) => {
    try {
      await RescueService.addRoleToUser(rescue!.rescue_id, userId, selectedRole)
      const updatedStaff = staff.map((member) =>
        member.user_id === userId
          ? {
              ...member,
              role: [
                ...member.role,
                { role_id: selectedRole, role_name: selectedRole },
              ],
            }
          : member,
      )
      setStaff(updatedStaff)
      setFilteredStaff(updatedStaff)
      setShowRoleDropdown(null)
    } catch (error) {
      console.error('Failed to assign role:', error)
    }
  }

  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      await RescueService.removeRoleFromUser(rescue!.rescue_id, userId, roleId)
      const updatedStaff = staff.map((member) =>
        member.user_id === userId
          ? {
              ...member,
              role: member.role.filter((r) => r.role_id !== roleId),
            }
          : member,
      )
      setStaff(updatedStaff)
      setFilteredStaff(updatedStaff)
    } catch (error) {
      console.error('Failed to remove role:', error)
    }
  }

  return (
    <Container>
      <Title>Staff</Title>

      <GenericFilters
        filters={filters}
        onFilterChange={(name: string, value: string | boolean) =>
          setFilters((prev) => ({ ...prev, [name]: value }))
        }
        filterConfig={filterConfig}
      />

      <TableContainer>
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
                          user && user.user_id !== staff.user_id
                            ? () =>
                                handleRemoveRole(staff.user_id, role.role_id)
                            : undefined
                        }
                        showAction={user && user.user_id !== staff.user_id}
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
                          <select
                            onChange={(e) =>
                              handleRoleSelect(
                                staff.user_id,
                                e.target.value as Role,
                              )
                            }
                          >
                            {Object.values(Role).map((role) => (
                              <option key={role} value={role}>
                                {role.replace(/_/g, ' ').toUpperCase()}
                              </option>
                            ))}
                          </select>
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
                  {staff.isInvite ? (
                    <Button
                      type="button"
                      onClick={() => console.log('Cancel invitation')}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => console.log('Delete staff')}
                    >
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableContainer>
    </Container>
  )
}

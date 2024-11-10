// src/libs/rescues/RescueService.ts

import { Rescue, StaffMember } from './Rescue'

// Base URL for your API
const API_URL = 'http://localhost:5000/api'

interface Invitation {
  email: string
  invited_on: Date
  status: string // e.g., 'Pending'
}

// Extend StaffMember to include invitations
interface StaffWithInvites extends StaffMember {
  isInvite?: boolean // Flag to differentiate invites
}

// Fetch all rescues
const getRescues = async (): Promise<Rescue[]> => {
  const response = await fetch(`${API_URL}/rescue/rescues`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch rescues: ${response.statusText}`)
  }
  const data = await response.json()
  return data.rescues || []
}

// Fetch a specific rescue by ID
const getRescueById = async (id: string): Promise<Rescue | undefined> => {
  const response = await fetch(`${API_URL}/rescue/rescues/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch rescue with ID ${id}: ${response.statusText}`,
    )
  }
  const data = await response.json()
  return data as Rescue
}

// Fetch all staff members with roles for a specific rescue
const getStaffMembersByRescueId = async (
  rescue_id: string,
): Promise<StaffWithInvites[]> => {
  const response = await fetch(
    `${API_URL}/rescue/rescues/${rescue_id}/staff-with-roles`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error(
      `Failed to fetch staff with roles and invitations for rescue ID ${rescue_id}: ${response.statusText}`,
    )
  }

  const data = await response.json()

  // Destructure with default values to handle cases where invitations might be absent
  const { staffMembers = [], invitations = [] } = data

  // Combine staff members with invitations if they exist
  const staffWithInvites = [
    ...staffMembers.map((staff: StaffMember) => ({
      ...staff,
      isInvite: false, // Mark staff members as non-invite entries
    })),
    ...invitations
      .filter((invite: Invitation) => invite.status != 'Accepted') // Exclude accepted invitations
      .map((invite: Invitation) => ({
        user_id: '', // Empty user_id for invitations
        first_name: '',
        last_name: '',
        email: invite.email,
        role: [], // No roles assigned for invitations
        verified_by_rescue: false, // Unverified for invitations
        isInvite: true,
        invited_on: invite.invited_on,
        status: invite.status,
      })),
  ]

  return staffWithInvites
}

// Delete a specific rescue by ID
const deleteRescue = async (rescue_id: string) => {
  const response = await fetch(`${API_URL}/rescue/rescues/${rescue_id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to delete rescue with ID ${rescue_id}: ${response.statusText}`,
    )
  }
}

const deleteStaffMember = async (userId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/rescue/staff/${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to delete staff member with ID ${userId}: ${response.statusText}`,
    )
  }
}

// Invite a new user to join the rescue by sending an invitation email
const inviteUser = async (email: string, rescueId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/rescue/staff/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ email, rescueId }),
  })

  if (!response.ok) {
    throw new Error(`Failed to send invitation: ${response.statusText}`)
  }
}

const cancelInvitation = async (
  email: string,
  rescueId: string,
): Promise<void> => {
  const response = await fetch(`${API_URL}/rescue/staff/cancel-invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ email, rescueId }),
  })

  if (!response.ok) {
    throw new Error(`Failed to cancel invitation: ${response.statusText}`)
  }
}

export default {
  getRescues,
  getRescueById,
  getStaffMembersByRescueId,
  deleteRescue,
  deleteStaffMember,
  inviteUser,
  cancelInvitation,
}

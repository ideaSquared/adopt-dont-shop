// src/services/RescueService.ts

import { apiService } from '../api-service'
import { Rescue, StaffMember } from './Rescue'

interface Invitation {
  email: string
  invited_on: Date
  status: string // e.g., 'Pending'
}

// Extend StaffMember to include invitations
interface StaffWithInvites extends StaffMember {
  isInvite?: boolean // Flag to differentiate invites
}

/**
 * Fetch all rescues (admin only).
 * @returns Promise resolving to an array of Rescue objects.
 */
export const getRescues = async (): Promise<Rescue[]> => {
  return apiService.get<Rescue[]>('/admin/rescues')
}

/**
 * Fetch a specific rescue by ID.
 * @param id - The ID of the rescue to fetch.
 * @returns Promise resolving to a Rescue object.
 */
export const getRescueById = async (
  id: string,
): Promise<Rescue | undefined> => {
  return apiService.get<Rescue>(`/rescue/${id}`)
}

/**
 * Fetch all staff members with roles for a specific rescue.
 * @param rescue_id - The ID of the rescue.
 * @returns Promise resolving to an array of StaffWithInvites objects.
 */
export const getStaffMembersByRescueId = async (
  rescue_id: string,
): Promise<StaffWithInvites[]> => {
  const data = await apiService.get<{
    staffMembers: StaffMember[]
    invitations: Invitation[]
  }>(`/rescue/${rescue_id}/staff-with-roles`)

  const { staffMembers = [], invitations = [] } = data

  const staffWithInvites: StaffWithInvites[] = [
    ...staffMembers.map((staff) => ({
      ...staff,
      isInvite: false,
    })),
    ...invitations
      .filter((invite) => invite.status !== 'Accepted')
      .map((invite) => ({
        user_id: '',
        first_name: '',
        last_name: '',
        email: invite.email,
        role: [],
        verified_by_rescue: false,
        isInvite: true,
        invited_on: invite.invited_on,
        status: invite.status,
        email_verified: false,
        roles: [],
      })),
  ]

  return staffWithInvites
}

/**
 * Delete a specific rescue by ID.
 * @param rescue_id - The ID of the rescue to delete.
 */
export const deleteRescue = async (rescue_id: string): Promise<void> => {
  await apiService.delete<void>(`/rescue/${rescue_id}`)
}

/**
 * Delete a staff member by user ID.
 * @param userId - The ID of the staff member to delete.
 * @param rescueId - The ID of the rescue.
 */
export const deleteStaffMember = async (
  userId: string,
  rescueId: string,
): Promise<void> => {
  await apiService.delete<void>(`/rescue/${rescueId}/staff/${userId}`)
}

/**
 * Invite a user to join the rescue.
 * @param email - The email address of the user to invite.
 * @param rescueId - The ID of the rescue.
 */
export const inviteUser = async (
  email: string,
  rescueId: string,
): Promise<void> => {
  await apiService.post<{ email: string; rescueId: string }, void>(
    `/rescue/${rescueId}/invite`,
    { email, rescueId },
  )
}

/**
 * Cancel an invitation for a user.
 * @param email - The email address of the user.
 * @param rescueId - The ID of the rescue.
 */
export const cancelInvitation = async (
  email: string,
  rescueId: string,
): Promise<void> => {
  await apiService.post<{ email: string; rescueId: string }, void>(
    `/rescue/${rescueId}/cancel-invite`,
    { email, rescueId },
  )
}

/**
 * Add a role to a staff member.
 * @param rescueId - The ID of the rescue.
 * @param userId - The ID of the user.
 * @param role - The role to assign.
 */
export const addRoleToUser = async (
  rescueId: string,
  userId: string,
  role: string,
): Promise<void> => {
  await apiService.post<{ role: string }, void>(
    `/rescue/${rescueId}/users/${userId}/roles`,
    { role },
  )
}

/**
 * Remove a role from a staff member.
 * @param rescueId - The ID of the rescue.
 * @param userId - The ID of the user.
 * @param roleId - The ID of the role to remove.
 */
export const removeRoleFromUser = async (
  rescueId: string,
  userId: string,
  roleId: string,
): Promise<void> => {
  await apiService.delete<void>(
    `/rescue/${rescueId}/users/${userId}/roles/${roleId}`,
  )
}

/**
 * Update a specific rescue by ID.
 * @param id - The ID of the rescue to update.
 * @param updateData - Partial data to update the rescue.
 * @returns Promise resolving to the updated Rescue object.
 */
export const updateRescue = async (
  id: string,
  updateData: Partial<Rescue>,
): Promise<Rescue | undefined> => {
  return apiService.put<Partial<Rescue>, Rescue>(`/rescue/${id}`, updateData)
}

export default {
  getRescues,
  getRescueById,
  getStaffMembersByRescueId,
  deleteRescue,
  deleteStaffMember,
  inviteUser,
  cancelInvitation,
  addRoleToUser,
  removeRoleFromUser,
  updateRescue,
}

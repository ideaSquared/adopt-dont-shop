import { Rescue, StaffMember } from './Rescue'

// Define the base URL for your API
const API_URL = 'http://localhost:5000/api'

// Fetch all rescues
const getRescues = async (): Promise<Rescue[]> => {
  const response = await fetch(`${API_URL}/rescue/rescues`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`, // Assuming JWT is stored in localStorage
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
      Authorization: `Bearer ${localStorage.getItem('token')}`, // Assuming JWT is stored in localStorage
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

// Fetch all staff members for a specific rescue
const getStaffMembersByRescueId = async (
  rescue_id: string,
): Promise<StaffMember[] | undefined> => {
  const response = await fetch(`${API_URL}/rescue/rescues/${rescue_id}/staff`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`, // Assuming JWT is stored in localStorage
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch staff for rescue ID ${rescue_id}: ${response.statusText}`,
    )
  }
  const data = await response.json()
  return data as StaffMember[]
}

// Fetch a specific staff member by their ID within a specific rescue
const getStaffMemberById = async (
  rescue_id: string,
  staff_id: string,
): Promise<StaffMember | undefined> => {
  const response = await fetch(
    `${API_URL}/rescue/rescues/${rescue_id}/staff/${staff_id}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`, // Assuming JWT is stored in localStorage
      },
    },
  )

  if (!response.ok) {
    throw new Error(
      `Failed to fetch staff member with ID ${staff_id} for rescue ID ${rescue_id}: ${response.statusText}`,
    )
  }
  const data = await response.json()
  return data as StaffMember
}

const deleteRescue = async (rescue_id: string) => {
  console.log(`Delete req for ${rescue_id}`)
}

export default {
  getRescues,
  getRescueById,
  getStaffMembersByRescueId,
  getStaffMemberById,
  deleteRescue,
}

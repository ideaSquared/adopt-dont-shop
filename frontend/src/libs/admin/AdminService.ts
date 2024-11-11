const API_URL = 'http://localhost:5000/api'

const addRoleToUser = async (userId: string, role: string): Promise<void> => {
  const response = await fetch(`${API_URL}/admin/users/${userId}/add-role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ role }),
  })

  if (!response.ok) {
    throw new Error(`Failed to add role: ${response.statusText}`)
  }
}

const removeRoleFromUser = async (
  userId: string,
  roleId: string,
): Promise<void> => {
  console.log('Assigning role:', roleId, 'to user:', userId)
  const response = await fetch(
    `${API_URL}/admin/users/${userId}/roles/${roleId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to remove role: ${response.statusText}`)
  }
}

export default {
  removeRoleFromUser,
  addRoleToUser,
}

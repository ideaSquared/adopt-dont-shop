import { apiService } from '../api-service'

const addRoleToUser = async (userId: string, role: string): Promise<void> => {
  await apiService.post<{ role: string }, void>(
    `/admin/users/${userId}/add-role`,
    { role },
  )
}

const removeRoleFromUser = async (
  userId: string,
  roleId: string,
): Promise<void> => {
  await apiService.delete<void>(`/admin/users/${userId}/roles/${roleId}`)
}

export default {
  addRoleToUser,
  removeRoleFromUser,
}

import { apiService } from '../api-service'
import { AdminDashboardData, RescueDashboardData } from './types'

export const getRescueDashboard = async (): Promise<RescueDashboardData> => {
  return await apiService.get('/dashboard/rescue')
}

export const getAdminDashboard = async (): Promise<AdminDashboardData> => {
  return await apiService.get('/dashboard/admin')
}

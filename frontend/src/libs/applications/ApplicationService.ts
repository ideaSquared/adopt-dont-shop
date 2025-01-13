// src/services/ApplicationService.ts
import { apiService } from '../api-service'
import { Application } from './Application'

const API_BASE_URL = '/applications'

export const getApplications = async (): Promise<Application[]> => {
  return apiService.get<Application[]>(API_BASE_URL)
}

export const getApplicationById = async (
  id: string,
): Promise<Application | undefined> => {
  return apiService.get<Application>(`${API_BASE_URL}/${id}`)
}

export const createApplication = async (
  data: Partial<Application>,
): Promise<Application> => {
  return apiService.post<Partial<Application>, Application>(API_BASE_URL, data)
}

export const updateApplication = async (
  id: string,
  data: Partial<Application>,
): Promise<Application> => {
  return apiService.put<Partial<Application>, Application>(
    `${API_BASE_URL}/${id}`,
    data,
  )
}

export const deleteApplication = async (id: string): Promise<boolean> => {
  await apiService.delete<void>(`${API_BASE_URL}/${id}`)
  return true
}

export const getApplicationsByRescueId = async (
  rescueId: string,
): Promise<Application[]> => {
  return apiService.get<Application[]>(`${API_BASE_URL}/rescue/${rescueId}`)
}

export default {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
  getApplicationsByRescueId,
}

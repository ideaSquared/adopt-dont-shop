// src/services/ApplicationService.ts
import { Application } from './Application'

const API_BASE_URL = 'http://localhost:5000/api/applications'

export const getApplications = async (): Promise<Application[]> => {
  const response = await fetch(API_BASE_URL, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`, // Include token if authentication is required
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch applications')
  }

  return response.json()
}

export const getApplicationById = async (
  id: string,
): Promise<Application | undefined> => {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`, // Include token if authentication is required
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch application by ID')
  }

  return response.json()
}

export const createApplication = async (
  data: Partial<Application>,
): Promise<Application> => {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`, // Include token if authentication is required
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create application')
  }

  return response.json()
}

export const updateApplication = async (
  id: string,
  data: Partial<Application>,
): Promise<Application> => {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`, // Include token if authentication is required
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to update application')
  }

  return response.json()
}

export const deleteApplication = async (id: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`, // Include token if authentication is required
    },
  })

  if (!response.ok) {
    throw new Error('Failed to delete application')
  }

  return true
}

export const getApplicationsByRescueId = async (
  rescueId: string,
): Promise<Application[]> => {
  const response = await fetch(`${API_BASE_URL}/rescue/${rescueId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })
  if (!response.ok) {
    throw new Error('Failed to fetch applications by rescue ID')
  }
  return response.json()
}

export default {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
  getApplicationsByRescueId,
}

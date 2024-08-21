import { AuditLog } from './AuditLogs'

const API_URL = 'http://localhost:5000/api' // Base API URL

const getAuditLogs = async (): Promise<AuditLog[]> => {
  const response = await fetch(`${API_URL}/admin/audit-logs`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`, // Assuming JWT is stored in localStorage
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch audit logs')
  }

  // Assuming the response JSON is structured as { auditLogs: AuditLog[] }
  const data = await response.json()

  return data
}

export default { getAuditLogs }

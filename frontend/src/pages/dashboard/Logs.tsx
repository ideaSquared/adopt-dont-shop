import {
  Badge,
  DateTime,
  FormInput,
  SelectInput,
  Table,
  TextInput,
} from '@adoptdontshop/components'
import { AuditLog, AuditLogsService } from '@adoptdontshop/libs/audit-logs/'
import React, { ChangeEvent, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'

const StyledButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  text-decoration: underline;
  color: blue;
  cursor: pointer;

  &:focus {
    outline: 2px solid #007bff; /* Optional: for better accessibility */
  }
`

const AuditLogs: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [filteredAuditLogs, setFilteredAuditLogs] = useState<AuditLog[]>([])
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [serviceTerm, setServiceTerm] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const rowsPerPage = 10

  // Fetch audit logs for the current page
  const fetchAuditLogs = async (page: number) => {
    try {
      const response = await AuditLogsService.getAuditLogs(page, rowsPerPage)
      setAuditLogs(response.logs) // Assumes API returns { logs, totalPages }
      setTotalPages(response.totalPages)
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    }
  }

  useEffect(() => {
    fetchAuditLogs(currentPage)
  }, [currentPage])

  const filtered = useMemo(() => {
    return auditLogs.filter((log) => {
      const logIdString = String(log.id) // Convert log.id to a string
      const matchesSearch =
        !searchTerm ||
        logIdString.includes(searchTerm) ||
        log.user?.includes(searchTerm) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesService = !serviceTerm || log.service.includes(serviceTerm)

      return matchesSearch && matchesService
    })
  }, [searchTerm, serviceTerm, auditLogs])

  // Update filteredAuditLogs state when filtered changes
  useEffect(() => {
    setFilteredAuditLogs(filtered)
  }, [filtered])

  // Event handlers for input changes
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleServiceFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setServiceTerm(e.target.value)
  }

  // Click handler for user_id and service cells
  const handleUserClick = (userId: string) => {
    setSearchTerm(userId)
  }

  const handleServiceClick = (service: string) => {
    setServiceTerm(service)
  }

  // Generate options for service filter
  const serviceOptions = [
    { value: '', label: 'All Services' },
    ...Array.from(new Set(auditLogs.map((log) => log.service))).map(
      (service) => ({
        value: service,
        label: service,
      }),
    ),
  ]

  // Determine badge variant based on log level
  const getLevelVariant = (
    level: string,
  ): 'info' | 'warning' | 'success' | 'danger' | null => {
    switch (level.toLowerCase()) {
      case 'info':
        return 'info'
      case 'warning':
        return 'warning'
      case 'success':
        return 'success'
      case 'error':
        return 'danger'
      default:
        return null
    }
  }

  return (
    <div>
      <h1>Audit Logs</h1>
      <FormInput label="Search by ID, User ID, or Message">
        <TextInput
          onChange={handleSearchChange}
          type="text"
          value={searchTerm || ''}
        />
      </FormInput>
      <FormInput label="Filter by Service">
        <SelectInput
          onChange={handleServiceFilterChange}
          value={serviceTerm || ''}
          options={serviceOptions}
        />
      </FormInput>
      <Table
        striped
        rowsPerPage={rowsPerPage}
        hasActions
        onPageChange={setCurrentPage}
        currentPage={currentPage}
        totalPages={totalPages}
      >
        <thead>
          <tr>
            <th>ID</th>
            <th>User ID</th>
            <th>Timestamp</th>
            <th>Level</th>
            <th>Service</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredAuditLogs.map((auditLog) => (
            <tr key={auditLog.id}>
              <td>{auditLog.id}</td>
              <td>
                <StyledButton
                  onClick={() => handleUserClick(auditLog.user || '')}
                >
                  {auditLog.user || 'No ID'}
                </StyledButton>
              </td>
              <td>
                <DateTime timestamp={auditLog.timestamp} showTooltip={true} />
              </td>
              <td>
                <Badge variant={getLevelVariant(auditLog.level)}>
                  {auditLog.level.toUpperCase()}
                </Badge>
              </td>
              <td>
                <StyledButton
                  onClick={() => handleServiceClick(auditLog.service)}
                >
                  {auditLog.service}
                </StyledButton>
              </td>
              <td>{auditLog.action}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

export default AuditLogs

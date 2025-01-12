import React, { ChangeEvent, useEffect, useMemo, useState } from 'react'

// Third-party imports
import styled from 'styled-components'

// Internal imports
import {
  Badge,
  DateTime,
  FormInput,
  SelectInput,
  Table,
  TextInput,
} from '@adoptdontshop/components'
import { AuditLog, AuditLogsService } from '@adoptdontshop/libs/audit-logs/'

// Style definitions
const Container = styled.div`
  padding: 2rem;
`

const Title = styled.h1`
  font-size: 2rem;

  margin-bottom: 2rem;
`

const StyledButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  text-decoration: underline;
  color: ${({ theme }) => theme.text.link};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.text.highlight};
  }

  &:focus-visible {
    outline: ${({ theme }) => theme.border.width.normal} solid
      ${({ theme }) => theme.border.color.focus};
    outline-offset: 2px;
  }
`

// Types
type LogsProps = Record<string, never>

type LevelVariant = 'info' | 'warning' | 'success' | 'danger' | null

export const Logs: React.FC<LogsProps> = () => {
  // State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [filteredAuditLogs, setFilteredAuditLogs] = useState<AuditLog[]>([])
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [serviceTerm, setServiceTerm] = useState<string | null>(null)
  const [levelTerm, setLevelTerm] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const rowsPerPage = 10

  // Data fetching
  const fetchAuditLogs = async (page: number) => {
    try {
      const response = await AuditLogsService.getAuditLogs(page, rowsPerPage)
      setAuditLogs(response.logs)
      setTotalPages(response.totalPages)
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    }
  }

  // Effects
  useEffect(() => {
    fetchAuditLogs(currentPage)
  }, [currentPage])

  const filtered = useMemo(() => {
    return auditLogs.filter((log) => {
      const logIdString = String(log.id)
      const matchesSearch =
        !searchTerm ||
        logIdString.includes(searchTerm) ||
        log.user?.includes(searchTerm) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesService = !serviceTerm || log.service.includes(serviceTerm)

      const matchesLevel =
        !levelTerm || log.level.toLowerCase() === levelTerm.toLowerCase()

      return matchesSearch && matchesService && matchesLevel
    })
  }, [searchTerm, serviceTerm, levelTerm, auditLogs])

  useEffect(() => {
    setFilteredAuditLogs(filtered)
  }, [filtered])

  // Event handlers
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleServiceFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setServiceTerm(e.target.value)
  }

  const handleLevelFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setLevelTerm(e.target.value)
  }

  const handleUserClick = (userId: string) => {
    setSearchTerm(userId)
  }

  const handleServiceClick = (service: string) => {
    setServiceTerm(service)
  }

  // Options
  const serviceOptions = [
    { value: '', label: 'All Services' },
    ...Array.from(new Set(auditLogs.map((log) => log.service))).map(
      (service) => ({
        value: service,
        label: service,
      }),
    ),
  ]

  const levelOptions = [
    { value: '', label: 'All Levels' },
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
    { value: 'success', label: 'Success' },
    { value: 'error', label: 'Error' },
  ]

  // Helper functions
  const getLevelVariant = (level: string): LevelVariant => {
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

  // Render
  return (
    <Container>
      <Title>Audit Logs</Title>
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
      <FormInput label="Filter by Level">
        <SelectInput
          onChange={handleLevelFilterChange}
          value={levelTerm || ''}
          options={levelOptions}
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
    </Container>
  )
}

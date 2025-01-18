import { Badge, DateTime, Table } from '@adoptdontshop/components'
import React, { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { FilterConfig, GenericFilters } from '../../components'
import { useDebounce } from '../../hooks'
import {
  AuditLog,
  AuditLogFilters as AuditLogFiltersType,
  AuditLogsService,
} from '../../libs/audit-logs'
import { logger } from '../../utils/logger'

const Container = styled.div`
  padding: 2rem;
`

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 2rem;
`

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.text.danger};
  padding: 1rem;
  margin: 1rem 0;
  background: ${({ theme }) => theme.background.danger};
  border-radius: ${({ theme }) => theme.border.radius.md};
`

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;
  color: ${({ theme }) => theme.text.dim};
`

const MetadataCell = styled.td`
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    white-space: normal;
    word-wrap: break-word;
  }
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
`

const ROWS_PER_PAGE = 10

const levelOptions = [
  { value: '', label: 'All Levels' },
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
]

const auditLogFilterConfig: FilterConfig[] = [
  {
    name: 'search',
    label: 'Search',
    type: 'text',
    placeholder: 'Search actions or services...',
  },
  { name: 'startDate', label: 'Start Date', type: 'date' },
  { name: 'endDate', label: 'End Date', type: 'date' },
  { name: 'level', label: 'Level', type: 'select', options: levelOptions },
  {
    name: 'service',
    label: 'Service',
    type: 'text',
    placeholder: 'Filter by service...',
  },
  {
    name: 'category',
    label: 'Category',
    type: 'text',
    placeholder: 'Filter by category...',
  },
  {
    name: 'user',
    label: 'User',
    type: 'text',
    placeholder: 'Filter by user...',
  },
  {
    name: 'ip_address',
    label: 'IP Address',
    type: 'text',
    placeholder: 'Filter by IP address...',
  },
  {
    name: 'user_agent',
    label: 'User Agent',
    type: 'text',
    placeholder: 'Filter by user agent...',
  },
]

const getLevelVariant = (
  level: string,
): 'info' | 'warning' | 'success' | 'danger' | null => {
  switch (level.toLowerCase()) {
    case 'info':
      return 'info'
    case 'warning':
      return 'warning'
    case 'error':
      return 'danger'
    default:
      return null
  }
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AuditLogFiltersType>({})

  // Debounce filter changes to prevent too many API calls
  const debouncedFilters = useDebounce(filters, 500)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = Object.keys(debouncedFilters).length
        ? await AuditLogsService.getFilteredLogs(debouncedFilters, {
            page: currentPage,
            limit: ROWS_PER_PAGE,
          })
        : await AuditLogsService.getAuditLogs(currentPage, ROWS_PER_PAGE)

      setLogs(response.logs)
      setTotalPages(response.totalPages)
    } catch (err) {
      setError('Failed to fetch audit logs. Please try again later.')
      if (err instanceof Error) {
        logger.error('Error fetching audit logs:', err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedFilters])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleFilterChange = (name: string, value: string | boolean) => {
    setFilters((prev: AuditLogFiltersType) => ({
      ...prev,
      [name]: value || undefined, // Remove empty strings
    }))
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleUserClick = (userId: string) => {
    handleFilterChange('user', userId)
  }

  const handleServiceClick = (service: string) => {
    handleFilterChange('service', service)
  }

  const handleIpAddressClick = (ipAddress: string) => {
    handleFilterChange('ip_address', ipAddress)
  }

  const handleUserAgentClick = (userAgent: string) => {
    handleFilterChange('user_agent', userAgent)
  }

  return (
    <Container>
      <Title>Audit Logs</Title>

      <GenericFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        filterConfig={auditLogFilterConfig}
      />

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Table
        striped
        hasActions
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      >
        <thead>
          <tr>
            <th>ID</th>
            <th>Timestamp</th>
            <th>Level</th>
            <th>Service</th>
            <th>User</th>
            <th>Category</th>
            <th>Action</th>
            <th>Metadata</th>
            <th>IP Address</th>
            <th>User Agent</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.id}</td>
              <td>
                <DateTime timestamp={log.timestamp} showTooltip />
              </td>
              <td>
                <Badge variant={getLevelVariant(log.level)}>{log.level}</Badge>
              </td>
              <td>
                {handleServiceClick ? (
                  <StyledButton onClick={() => handleServiceClick(log.service)}>
                    {log.service}
                  </StyledButton>
                ) : (
                  log.service
                )}
              </td>
              <td>
                {log.user && handleUserClick ? (
                  <StyledButton onClick={() => handleUserClick(log.user!)}>
                    {log.user}
                  </StyledButton>
                ) : (
                  log.user || 'N/A'
                )}
              </td>
              <td>{log.category}</td>
              <td>{log.action}</td>
              <MetadataCell>
                {log.metadata ? JSON.stringify(log.metadata) : 'N/A'}
              </MetadataCell>
              <td>
                {log.ip_address ? (
                  <StyledButton
                    onClick={() => handleIpAddressClick(log.ip_address!)}
                  >
                    {log.ip_address}
                  </StyledButton>
                ) : (
                  'N/A'
                )}
              </td>
              <td>
                {log.user_agent ? (
                  <StyledButton
                    onClick={() => handleUserAgentClick(log.user_agent!)}
                  >
                    {log.user_agent}
                  </StyledButton>
                ) : (
                  'N/A'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {loading && <LoadingWrapper>Loading...</LoadingWrapper>}
    </Container>
  )
}

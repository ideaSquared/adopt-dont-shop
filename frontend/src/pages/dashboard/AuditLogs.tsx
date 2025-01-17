import React, { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { AuditLogFilters as AuditLogFiltersComponent } from '../../components/AuditLogs/AuditLogFilters'
import { AuditLogTable } from '../../components/AuditLogs/AuditLogTable'
import { useDebounce } from '../../hooks'
import {
  AuditLog,
  AuditLogFilters,
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

const ROWS_PER_PAGE = 10

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AuditLogFilters>({})

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

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev: AuditLogFilters) => ({
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

  return (
    <Container>
      <Title>Audit Logs</Title>

      <AuditLogFiltersComponent
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <AuditLogTable
        logs={logs}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onUserClick={handleUserClick}
        onServiceClick={handleServiceClick}
      />

      {loading && <LoadingWrapper>Loading...</LoadingWrapper>}
    </Container>
  )
}

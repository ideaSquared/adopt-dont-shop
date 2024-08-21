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

const AuditLogs: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [filteredAuditLogs, setFilteredAuditLogs] = useState<AuditLog[]>([])
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [serviceTerm, setServiceTerm] = useState<string | null>(null)

  // Fetch audit logs on component mount
  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const fetchedAuditLogs = await AuditLogsService.getAuditLogs()
        setAuditLogs(fetchedAuditLogs)
      } catch (error) {
        console.error('Failed to fetch audit logs:', error)
      }
    }

    fetchAuditLogs()
  }, [])

  // Memoize filtered logs based on searchTerm and serviceTerm
  const filtered = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesSearch =
        !searchTerm ||
        log.log_id.includes(searchTerm) ||
        log.message.toLowerCase().includes(searchTerm.toLowerCase())

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
      <FormInput label="Search by ID or Message">
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
      <Table>
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
            <tr key={auditLog.log_id}>
              <td>{auditLog.log_id}</td>
              <td>{auditLog.user || 'No ID'}</td>
              <td>
                <DateTime timestamp={auditLog.timestamp} showTooltip={true} />
              </td>
              <td>
                <Badge variant={getLevelVariant(auditLog.level)}>
                  {auditLog.level.toUpperCase()}
                </Badge>
              </td>
              <td>
                <Badge variant="content">{auditLog.service}</Badge>
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

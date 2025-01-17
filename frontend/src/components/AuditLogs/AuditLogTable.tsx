import { Badge, DateTime, Table } from '@adoptdontshop/components'
import { AuditLog } from '@adoptdontshop/libs/audit-logs'
import React from 'react'
import styled from 'styled-components'

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

type AuditLogTableProps = {
  logs: AuditLog[]
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onUserClick?: (userId: string) => void
  onServiceClick?: (service: string) => void
}

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

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  logs,
  currentPage,
  totalPages,
  onPageChange,
  onUserClick,
  onServiceClick,
}) => {
  return (
    <Table
      striped
      hasActions
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
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
              {onServiceClick ? (
                <StyledButton onClick={() => onServiceClick(log.service)}>
                  {log.service}
                </StyledButton>
              ) : (
                log.service
              )}
            </td>
            <td>
              {log.user && onUserClick ? (
                <StyledButton onClick={() => onUserClick(log.user!)}>
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
            <td>{log.ip_address || 'N/A'}</td>
            <td>{log.user_agent || 'N/A'}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

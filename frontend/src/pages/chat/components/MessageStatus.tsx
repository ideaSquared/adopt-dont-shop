import React from 'react'
import styled from 'styled-components'
import { Message } from '@adoptdontshop/libs/conversations'

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  font-size: ${(props) => props.theme.typography.size.xs};
  color: ${(props) => props.theme.text.dim};
`

const StatusIcon = styled.span<{ status: 'pending' | 'sent' | 'read' }>`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => {
    switch (props.status) {
      case 'read':
        return props.theme.status.success
      case 'sent':
        return props.theme.text.dim
      default:
        return props.theme.text.dim
    }
  }};
`

interface MessageStatusProps {
  message: Message
  isPending: boolean
}

export const MessageStatus: React.FC<MessageStatusProps> = ({
  message,
  isPending,
}) => {
  const getStatus = () => {
    if (isPending) return 'pending'
    if (message.readStatus?.length) return 'read'
    return 'sent'
  }

  const renderIcon = (status: 'pending' | 'sent' | 'read') => {
    switch (status) {
      case 'read':
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13.3334 4L6.00008 11.3333L2.66675 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )
      case 'sent':
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 8L7.33333 11.3333L12 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )
      default:
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
          </svg>
        )
    }
  }

  const status = getStatus()
  const statusText = {
    pending: 'Sending...',
    sent: 'Sent',
    read: 'Read',
  }[status]

  return (
    <StatusContainer>
      <StatusIcon status={status} aria-hidden="true">
        {renderIcon(status)}
      </StatusIcon>
      <span className="sr-only">{statusText}</span>
    </StatusContainer>
  )
}

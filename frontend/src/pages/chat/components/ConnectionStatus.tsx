import React from 'react'
import styled, { keyframes } from 'styled-components'

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.sm};
  font-size: ${(props) => props.theme.typography.size.sm};
  color: ${(props) => props.theme.text.dim};
  background: ${(props) => props.theme.background.content};
  border-bottom: 1px solid ${(props) => props.theme.border.color.default};
`

const StatusDot = styled.span<{
  status: 'connected' | 'connecting' | 'disconnected'
}>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${(props) => {
    switch (props.status) {
      case 'connected':
        return props.theme.background.success
      case 'connecting':
        return props.theme.background.warning
      case 'disconnected':
        return props.theme.background.danger
      default:
        return props.theme.background.danger
    }
  }};
  animation: ${(props) => (props.status === 'connecting' ? pulse : 'none')} 1.5s
    infinite ease-in-out;
`

const StatusText = styled.span`
  font-weight: ${(props) => props.theme.typography.weight.medium};
`

interface ConnectionStatusProps {
  isConnected: boolean
  isConnecting: boolean
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isConnecting,
}) => {
  const getStatus = () => {
    if (isConnected) return 'connected'
    if (isConnecting) return 'connecting'
    return 'disconnected'
  }

  const getStatusText = () => {
    if (isConnected) return 'Connected'
    if (isConnecting) return 'Connecting...'
    return 'Disconnected'
  }

  const status = getStatus()

  return (
    <StatusContainer role="status" aria-live="polite">
      <StatusDot status={status} aria-hidden="true" />
      <StatusText>{getStatusText()}</StatusText>
    </StatusContainer>
  )
}

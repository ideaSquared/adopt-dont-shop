import React, { useEffect, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { useSocket } from '../../../hooks/useSocket'

const bounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-4px); }
`

const Container = styled.div`
  padding: ${(props) => props.theme.spacing.sm};
  color: ${(props) => props.theme.text.dim};
  font-size: ${(props) => props.theme.typography.size.sm};
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  min-height: 32px;
`

const DotsContainer = styled.div`
  display: flex;
  gap: 2px;
`

const Dot = styled.span<{ delay: number }>`
  width: 4px;
  height: 4px;
  background-color: currentColor;
  border-radius: 50%;
  display: inline-block;
  animation: ${bounce} 1s infinite;
  animation-delay: ${(props) => props.delay}ms;
`

interface TypingUser {
  user_id: string
  first_name: string
  last_name: string
}

interface TypingIndicatorProps {
  chatId: string
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ chatId }) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const { on, emit } = useSocket({
    url: process.env.REACT_APP_SOCKET_URL || '',
    token: localStorage.getItem('token') || '',
  })

  useEffect(() => {
    const handleUserStartTyping = (data: TypingUser) => {
      setTypingUsers((prev) => {
        if (prev.some((user) => user.user_id === data.user_id)) return prev
        return [...prev, data]
      })
    }

    const handleUserStopTyping = (data: { user_id: string }) => {
      setTypingUsers((prev) =>
        prev.filter((user) => user.user_id !== data.user_id),
      )
    }

    const cleanup = [
      on('user_start_typing', handleUserStartTyping),
      on('user_stop_typing', handleUserStopTyping),
    ]

    return () => {
      cleanup.forEach((unsub) => unsub?.())
    }
  }, [on])

  const getTypingText = () => {
    if (typingUsers.length === 0) return ''
    if (typingUsers.length === 1)
      return `${typingUsers[0].first_name} is typing...`
    if (typingUsers.length === 2)
      return `${typingUsers[0].first_name} and ${typingUsers[1].first_name} are typing...`
    return 'Several people are typing...'
  }

  const text = getTypingText()

  if (!text) return null

  return (
    <Container role="status" aria-live="polite">
      {text}
      <DotsContainer aria-hidden="true">
        <Dot delay={0} />
        <Dot delay={200} />
        <Dot delay={400} />
      </DotsContainer>
    </Container>
  )
}

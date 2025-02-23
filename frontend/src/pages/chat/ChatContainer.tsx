import { Message } from '@adoptdontshop/libs/conversations'
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import styled from 'styled-components'
import { Chat } from './Chat'

const Container = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${(props) => props.theme.background.content};
  position: relative;
  height: 100%;
  overflow: hidden;
`

const Header = styled.div`
  padding: ${(props) => props.theme.spacing.md}
    ${(props) => props.theme.spacing.lg};
  border-bottom: ${(props) => props.theme.border.width.thin} solid
    ${(props) => props.theme.border.color.default};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: ${(props) => props.theme.typography.size.lg};
  color: ${(props) => props.theme.text.body};
  font-weight: ${(props) => props.theme.typography.weight.semibold};
`

const ChatStatus = styled.div<{ status: 'active' | 'locked' | 'archived' }>`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.xs}
    ${(props) => props.theme.spacing.sm};
  border-radius: ${(props) => props.theme.border.radius.sm};
  background: ${(props) => {
    switch (props.status) {
      case 'active':
        return props.theme.background.success
      case 'locked':
        return props.theme.background.danger
      case 'archived':
        return props.theme.background.disabled
      default:
        return props.theme.background.disabled
    }
  }};
  color: ${(props) => props.theme.text.light};
  font-size: ${(props) => props.theme.typography.size.sm};
`

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${(props) => props.theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  min-height: 0;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${(props) => props.theme.background.contrast};
    border-radius: ${(props) => props.theme.border.radius.sm};
  }
`

const MessageBubble = styled.div<{ isOwn?: boolean }>`
  max-width: 70%;
  align-self: ${(props) => (props.isOwn ? 'flex-end' : 'flex-start')};
  background: ${(props) =>
    props.isOwn
      ? props.theme.background.highlight
      : props.theme.background.contrast};
  color: ${(props) => props.theme.text.body};
  padding: ${(props) => props.theme.spacing.sm}
    ${(props) => props.theme.spacing.md};
  border-radius: ${(props) => props.theme.border.radius.lg};
  position: relative;
`

const MessageContent = styled.div`
  font-size: ${(props) => props.theme.typography.size.sm};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
  white-space: pre-wrap;
  word-break: break-word;
`

const MessageMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  margin-top: ${(props) => props.theme.spacing.xs};
  font-size: ${(props) => props.theme.typography.size.xs};
  color: ${(props) => props.theme.text.dim};
`

const InputContainer = styled.div`
  padding: ${(props) => props.theme.spacing.md};
  border-top: ${(props) => props.theme.border.width.thin} solid
    ${(props) => props.theme.border.color.default};
  background: ${(props) => props.theme.background.content};
  flex-shrink: 0;
`

const InputWrapper = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
  align-items: flex-end;
`

const StyledTextArea = styled.textarea`
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: ${(props) => props.theme.spacing.sm};
  border: ${(props) => props.theme.border.width.thin} solid
    ${(props) => props.theme.border.color.default};
  border-radius: ${(props) => props.theme.border.radius.md};
  background: ${(props) => props.theme.background.body};
  color: ${(props) => props.theme.text.body};
  font-size: ${(props) => props.theme.typography.size.sm};
  resize: none;
  outline: none;
  transition: ${(props) => props.theme.transitions.fast};

  &:focus {
    border-color: ${(props) => props.theme.border.color.focus};
  }

  &::placeholder {
    color: ${(props) => props.theme.text.dim};
  }
`

const SendButton = styled.button<{ disabled?: boolean }>`
  padding: ${(props) => props.theme.spacing.sm}
    ${(props) => props.theme.spacing.md};
  border: none;
  border-radius: ${(props) => props.theme.border.radius.md};
  background: ${(props) =>
    props.disabled
      ? props.theme.background.disabled
      : props.theme.background.highlight};
  color: ${(props) =>
    props.disabled ? props.theme.text.dim : props.theme.text.dark};
  font-size: ${(props) => props.theme.typography.size.sm};
  font-weight: ${(props) => props.theme.typography.weight.medium};
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: ${(props) => props.theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${(props) => props.theme.background.mouseHighlight};
  }
`

const TypingIndicator = styled.div`
  padding: ${(props) => props.theme.spacing.xs}
    ${(props) => props.theme.spacing.sm};
  color: ${(props) => props.theme.text.dim};
  font-size: ${(props) => props.theme.typography.size.xs};
  font-style: italic;
`

const ErrorMessage = styled.div`
  text-align: center;
  padding: ${(props) => props.theme.spacing.md};
  margin: ${(props) => props.theme.spacing.md};
  background: ${(props) => props.theme.background.danger};
  color: ${(props) => props.theme.text.danger};
  border-radius: ${(props) => props.theme.border.radius.lg};
`

const LoadingMessage = styled.div`
  text-align: center;
  padding: ${(props) => props.theme.spacing.xl};
  color: ${(props) => props.theme.text.dim};
`

const LoadingOverlay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  font-size: ${(props) => props.theme.typography.size.lg};
  color: ${(props) => props.theme.text.dim};
`

type MessageFormat = 'plain' | 'markdown' | 'html'

interface ExtendedMessage extends Message {
  content_format: MessageFormat
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export const ChatContainer: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>()
  const [messages, setMessages] = useState<ExtendedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [chatStatus, setChatStatus] = useState<
    'active' | 'locked' | 'archived'
  >('active')

  // Initialize Socket.IO connection and handle messages
  useEffect(() => {
    if (!conversationId) return

    const token = localStorage.getItem('token')
    if (!token) {
      setError('Not authenticated')
      return
    }

    let newSocket: Socket
    try {
      newSocket = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      newSocket.on('connect', () => {
        console.log('Socket connected')
        setError(null)
        // Join chat room immediately after connection
        newSocket.emit('join_chat', conversationId)
        // Request initial messages
        newSocket.emit('get_messages', { chatId: conversationId })
        // Request chat status
        newSocket.emit('get_chat_status', { chatId: conversationId })
      })

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err)
        setError('Failed to connect to chat server. Please try again.')
      })

      newSocket.on('messages', (data: ExtendedMessage[]) => {
        console.log('Received initial messages:', data)
        setMessages(
          data.map((msg) => ({
            ...msg,
            content_format: msg.content_format || ('plain' as MessageFormat),
          })),
        )
        setLoading(false)
      })

      newSocket.on(
        'chat_status',
        (data: { status: 'active' | 'locked' | 'archived' }) => {
          console.log('Received chat status:', data)
          setChatStatus(data.status)
        },
      )

      newSocket.on('new_message', (message: ExtendedMessage) => {
        console.log('Received new message:', message)
        setMessages((prev) => [
          ...prev,
          {
            ...message,
            content_format:
              message.content_format || ('plain' as MessageFormat),
          },
        ])
      })

      newSocket.on('message_updated', (updatedMessage: ExtendedMessage) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.message_id === updatedMessage.message_id
              ? {
                  ...updatedMessage,
                  content_format: updatedMessage.content_format || 'plain',
                }
              : msg,
          ),
        )
      })

      newSocket.on('message_deleted', (data: { message_id: string }) => {
        setMessages((prev) =>
          prev.filter((msg) => msg.message_id !== data.message_id),
        )
      })

      newSocket.on('error', (error: { message: string }) => {
        console.error('Socket error:', error)
        setError(error.message)
      })

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected')
      })

      setSocket(newSocket)

      return () => {
        console.log('Cleaning up socket connection')
        if (newSocket) {
          newSocket.emit('leave_chat', conversationId)
          newSocket.disconnect()
        }
      }
    } catch (err) {
      console.error('Socket initialization error:', err)
      setError('Failed to initialize chat connection')
      setLoading(false)
    }
  }, [conversationId])

  const handleSendMessage = async (message: ExtendedMessage) => {
    if (chatStatus !== 'active') {
      setError('Cannot send messages in a locked or archived chat')
      return
    }

    if (!socket?.connected) {
      setError('Not connected to chat server')
      return
    }

    try {
      socket.emit('send_message', {
        chat_id: conversationId,
        content: message.content,
        content_format: message.content_format || 'plain',
      })
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    }
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>
  }

  return (
    <Container>
      <Header>
        <HeaderTitle>Chat</HeaderTitle>
        <ChatStatus status={chatStatus}>
          {chatStatus.charAt(0).toUpperCase() + chatStatus.slice(1)}
        </ChatStatus>
      </Header>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Chat
          messages={messages}
          conversationId={conversationId || ''}
          onSendMessage={handleSendMessage}
          status={chatStatus}
        />
      </div>
    </Container>
  )
}

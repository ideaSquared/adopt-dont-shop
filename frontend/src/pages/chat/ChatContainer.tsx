import { Message } from '@adoptdontshop/libs/conversations'
import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import styled from 'styled-components'
import { useUser } from '../../contexts/auth/UserContext'
import { useAlert } from '../../contexts/alert/AlertContext'
import { Chat } from './Chat'
import { useErrorHandler } from '../../hooks/useErrorHandler'
import ChatAnalyticsService from '../../services/ChatAnalyticsService'

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

const LoadingMessage = styled.div`
  text-align: center;
  padding: ${(props) => props.theme.spacing.xl};
  color: ${(props) => props.theme.text.dim};
`

export type MessageFormat = 'plain' | 'markdown' | 'html'

export interface MessageReadStatus {
  user_id: string
  read_at: Date
}

export interface ExtendedMessage extends Message {
  content_format: MessageFormat
  readStatus?: MessageReadStatus[]
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export const ChatContainer: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [messages, setMessages] = useState<ExtendedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [chatStatus, setChatStatus] = useState<
    'active' | 'locked' | 'archived'
  >('active')
  const { user, token } = useUser()
  const { handleError } = useErrorHandler()
  const { showAlert } = useAlert()
  const analyticsService = ChatAnalyticsService.getInstance()

  const handleSocketError = useCallback(
    (message: string, error?: unknown) => {
      showAlert({
        type: 'error',
        message,
      })
      handleError(message, error)
    },
    [showAlert, handleError],
  )

  useEffect(() => {
    if (!conversationId || !token) return

    let newSocket: Socket | null = null
    let isActive = true
    const startTime = Date.now()

    const setupSocket = () => {
      try {
        newSocket = io(SOCKET_URL, {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        })

        newSocket.on('connect', () => {
          if (!isActive) return
          newSocket?.emit('join_chat', conversationId)
          newSocket?.emit('get_messages', { chatId: conversationId })
          newSocket?.emit('get_chat_status', { chatId: conversationId })
          analyticsService.trackPerformanceEvent(
            'socket_connect',
            Date.now() - startTime,
            true,
          )
        })

        newSocket.on('connect_error', (err) => {
          if (!isActive) return
          handleSocketError(
            'Failed to connect to chat server. Please try again.',
            err,
          )
          analyticsService.trackPerformanceEvent(
            'socket_connect',
            Date.now() - startTime,
            false,
            err.message,
          )
        })

        newSocket.on('messages', (data: ExtendedMessage[]) => {
          if (!isActive) return
          setMessages(
            data.map((msg) => ({
              ...msg,
              content_format: msg.content_format || 'plain',
            })),
          )
          setLoading(false)
        })

        newSocket.on(
          'chat_status',
          (data: { status: 'active' | 'locked' | 'archived' }) => {
            if (!isActive) return
            setChatStatus(data.status)
          },
        )

        newSocket.on('new_message', (message: ExtendedMessage) => {
          if (!isActive) return
          setMessages((prev) => [
            ...prev,
            {
              ...message,
              content_format: message.content_format || 'plain',
            },
          ])
        })

        newSocket.on('message_updated', (updatedMessage: ExtendedMessage) => {
          if (!isActive) return
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
          if (!isActive) return
          setMessages((prev) =>
            prev.filter((msg) => msg.message_id !== data.message_id),
          )
        })

        newSocket.on(
          'read_status_updated',
          (data: {
            chat_id: string
            user_id: string
            message_ids: string[]
            read_at: Date
          }) => {
            if (!isActive) return
            setMessages((prev) =>
              prev.map((msg) => {
                if (data.message_ids.includes(msg.message_id)) {
                  return {
                    ...msg,
                    readStatus: [
                      ...(msg.readStatus || []),
                      { user_id: data.user_id, read_at: data.read_at },
                    ],
                  }
                }
                return msg
              }),
            )
          },
        )

        newSocket.on('error', (error: { message: string }) => {
          if (!isActive) return
          handleSocketError(error.message)
        })

        newSocket.on('disconnect', () => {
          if (!isActive) return
          showAlert({
            type: 'warning',
            message: 'Chat connection lost. Attempting to reconnect...',
          })
        })

        setSocket(newSocket)
      } catch (err) {
        if (!isActive) return
        handleSocketError('Failed to initialize chat connection', err)
        setLoading(false)
      }
    }

    setupSocket()

    return () => {
      isActive = false
      if (newSocket) {
        newSocket.emit('leave_chat', conversationId)
        newSocket.disconnect()
      }
    }
  }, [conversationId, token, handleSocketError, analyticsService])

  const handleSendMessage = useCallback(
    async (message: ExtendedMessage) => {
      if (chatStatus !== 'active') {
        showAlert({
          type: 'error',
          message: 'Cannot send messages in a locked or archived chat',
        })
        return
      }

      if (!socket?.connected) {
        showAlert({
          type: 'error',
          message: 'Not connected to chat server',
        })
        return
      }

      const startTime = Date.now()
      try {
        socket.emit('send_message', {
          chat_id: conversationId,
          content: message.content,
          content_format: message.content_format || 'plain',
        })
        analyticsService.trackMessage(message, Date.now() - startTime)
      } catch (err) {
        handleSocketError('Failed to send message', err)
        analyticsService.trackPerformanceEvent(
          'message_send',
          Date.now() - startTime,
          false,
        )
      }
    },
    [
      chatStatus,
      socket,
      conversationId,
      showAlert,
      analyticsService,
      handleSocketError,
    ],
  )

  if (loading) {
    return <LoadingMessage>Loading chat...</LoadingMessage>
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

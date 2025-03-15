import { Message } from '@adoptdontshop/libs/conversations'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import { useAlert } from '../../contexts/alert/AlertContext'
import { useUser } from '../../contexts/auth/UserContext'
import { useErrorHandler } from '../../hooks/useErrorHandler'
import { useSocket } from '../../hooks/useSocket'
import ChatAnalyticsService from '../../services/ChatAnalyticsService'
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
  readStatus: MessageReadStatus[]
  reactions?: Array<{ emoji: string; count: number; users: string[] }>
  attachments?: Array<{
    attachment_id: string
    filename: string
    originalName: string
    mimeType: string
    size: number
    url: string
  }>
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export const ChatContainer: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>()
  const [messages, setMessages] = useState<ExtendedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [chatStatus, setChatStatus] = useState<
    'active' | 'locked' | 'archived'
  >('active')
  const { token } = useUser()
  const { handleError } = useErrorHandler()
  const { showAlert } = useAlert()
  const analyticsService = ChatAnalyticsService.getInstance()
  const startTimeRef = useRef(Date.now())
  const hasJoinedChatRef = useRef(false)

  // Create a connection to the global socket
  const { socket, isConnected, emit, on } = useSocket({
    url: SOCKET_URL,
    token: token || '',
    onConnect: () => {
      // Handle reconnections - don't duplicate join_chat calls
      if (!hasJoinedChatRef.current && conversationId) {
        emit('join_chat', conversationId)
        emit('get_messages', { chatId: conversationId })
        emit('get_chat_status', { chatId: conversationId })
        hasJoinedChatRef.current = true

        try {
          // Track connection time
          const connectionTime = Date.now() - startTimeRef.current
          analyticsService.trackEvent('socket_connect', connectionTime)
        } catch (err) {
          console.error('Failed to track socket connection:', err)
        }
      }
    },
    onError: (error) => {
      handleError('Socket connection error', error)
      setLoading(false)
    },
  })

  // Setup event listeners after connection is established
  useEffect(() => {
    if (!isConnected || !socket) return

    // Handlers for socket events
    const handleMessages = (data: ExtendedMessage[]) => {
      setMessages(
        data.map((msg) => ({
          ...msg,
          content_format: msg.content_format || 'plain',
          readStatus: msg.readStatus || [],
        })),
      )
      setLoading(false)
    }

    const handleChatStatus = (data: {
      status: 'active' | 'locked' | 'archived'
    }) => {
      setChatStatus(data.status)
    }

    const handleNewMessage = (message: ExtendedMessage) => {
      setMessages((prev) => [
        ...prev,
        {
          ...message,
          content_format: message.content_format || 'plain',
          readStatus: message.readStatus || [],
        },
      ])
    }

    const handleMessageUpdate = (updatedMessage: ExtendedMessage) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === updatedMessage.message_id
            ? {
                ...updatedMessage,
                content_format: updatedMessage.content_format || 'plain',
                readStatus: updatedMessage.readStatus || [],
              }
            : msg,
        ),
      )
    }

    const handleMessageDelete = (data: { message_id: string }) => {
      setMessages((prev) =>
        prev.filter((msg) => msg.message_id !== data.message_id),
      )
    }

    const handleReadStatus = (data: {
      chat_id: string
      user_id: string
      message_ids: string[]
      read_at: Date
    }) => {
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
    }

    const handleReactionUpdate = (data: {
      message_id: string
      emoji: string
      user_id: string
      isAdd: boolean
    }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.message_id === data.message_id) {
            const currentReactions = msg.reactions || []
            let updatedReactions = [...currentReactions]

            // Find existing reaction with the same emoji
            const existingReactionIndex = updatedReactions.findIndex(
              (r) => r.emoji === data.emoji,
            )

            if (data.isAdd) {
              // Adding a reaction
              if (existingReactionIndex >= 0) {
                // Update existing reaction
                const reaction = { ...updatedReactions[existingReactionIndex] }
                if (!reaction.users.includes(data.user_id)) {
                  reaction.count += 1
                  reaction.users = [...reaction.users, data.user_id]
                  updatedReactions[existingReactionIndex] = reaction
                }
              } else {
                // Create new reaction
                updatedReactions.push({
                  emoji: data.emoji,
                  count: 1,
                  users: [data.user_id],
                })
              }
            } else {
              // Removing a reaction
              if (existingReactionIndex >= 0) {
                const reaction = { ...updatedReactions[existingReactionIndex] }
                if (reaction.users.includes(data.user_id)) {
                  reaction.count -= 1
                  reaction.users = reaction.users.filter(
                    (id) => id !== data.user_id,
                  )

                  if (reaction.count > 0) {
                    updatedReactions[existingReactionIndex] = reaction
                  } else {
                    // Remove the reaction entirely if count is 0
                    updatedReactions = updatedReactions.filter(
                      (_, i) => i !== existingReactionIndex,
                    )
                  }
                }
              }
            }

            return {
              ...msg,
              reactions: updatedReactions,
            }
          }
          return msg
        }),
      )
    }

    // Register event listeners
    const cleanupFunctions = [
      on('messages', handleMessages),
      on('chat_status', handleChatStatus),
      on('new_message', handleNewMessage),
      on('message_updated', handleMessageUpdate),
      on('message_deleted', handleMessageDelete),
      on('read_status_updated', handleReadStatus),
      on('reaction_updated', handleReactionUpdate),
    ]

    // Cleanup event listeners
    return () => {
      hasJoinedChatRef.current = false
      cleanupFunctions.forEach((cleanup) => cleanup && cleanup())
    }
  }, [isConnected, socket, on, conversationId])

  const handleSendMessage = useCallback(
    async (message: ExtendedMessage) => {
      if (chatStatus !== 'active') {
        showAlert({
          type: 'error',
          message: 'Cannot send messages in a locked or archived chat',
        })
        return
      }

      if (!isConnected) {
        showAlert({
          type: 'error',
          message: 'Not connected to chat server',
        })
        return
      }

      const startTime = Date.now()
      try {
        emit('send_message', {
          chat_id: conversationId,
          content: message.content,
          content_format: message.content_format || 'plain',
        })

        // Track message using the public method
        analyticsService.trackEvent('message_send', Date.now() - startTime)
      } catch (err) {
        handleError('Failed to send message', err)
      }
    },
    [
      chatStatus,
      isConnected,
      conversationId,
      showAlert,
      analyticsService,
      handleError,
      emit,
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
          socketConnection={{
            isConnected: isConnected || false,
            emit: emit,
          }}
        />
      </div>
    </Container>
  )
}

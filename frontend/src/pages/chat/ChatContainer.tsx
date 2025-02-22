import { Message } from '@adoptdontshop/libs/conversations'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import styled from 'styled-components'
import { Chat } from './Chat'

const Container = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
`

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
`

const ErrorMessage = styled.div`
  padding: 1rem;
  background-color: #fee;
  color: #c00;
  text-align: center;
`

type MessageFormat = 'plain' | 'markdown' | 'html'

interface ExtendedMessage extends Message {
  content_format: MessageFormat
}

export const ChatContainer: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>()
  const [messages, setMessages] = useState<ExtendedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/chats/${conversationId}/messages`)
      if (!response.ok) throw new Error('Failed to fetch messages')
      const data = await response.json()
      setMessages(
        data.messages.map((msg: Message) => ({
          ...msg,
          content_format: msg.content_format || ('plain' as MessageFormat),
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(
      import.meta.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
      {
        auth: {
          token: localStorage.getItem('token'),
        },
      },
    )

    newSocket.on('connect', () => {
      newSocket.emit('join_chat', conversationId)
    })

    newSocket.on('new_message', (message: Message) => {
      setMessages((prev) => [
        ...prev,
        { ...message, content_format: message.content_format || 'plain' },
      ])
    })

    newSocket.on('message_updated', (updatedMessage: Message) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.chat_id === updatedMessage.chat_id
            ? {
                ...updatedMessage,
                content_format:
                  updatedMessage.content_format || msg.content_format,
              }
            : msg,
        ),
      )
    })

    newSocket.on('message_deleted', (messageId: string) => {
      setMessages((prev) => prev.filter((msg) => msg.chat_id !== messageId))
    })

    setSocket(newSocket)

    return () => {
      newSocket.emit('leave_chat', conversationId)
      newSocket.disconnect()
    }
  }, [conversationId])

  // Load initial messages
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const handleSendMessage = async (message: ExtendedMessage) => {
    try {
      const formData = new FormData()
      formData.append('content', message.content)
      formData.append('content_format', message.content_format)

      const response = await fetch(`/api/chats/${conversationId}/messages`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) throw new Error('Failed to send message')

      // Socket.IO will handle adding the message to the list via the new_message event
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    }
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>
  }

  return (
    <Container>
      {loading && <LoadingOverlay>Loading messages...</LoadingOverlay>}
      <Chat
        messages={messages}
        conversationId={conversationId || ''}
        onSendMessage={handleSendMessage}
      />
    </Container>
  )
}

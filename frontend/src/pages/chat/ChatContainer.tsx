import { Message } from '@adoptdontshop/libs/conversations'
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import styled from 'styled-components'
import { Chat } from './Chat'

const Container = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: ${(props) => props.theme.background.content};
`

const LoadingOverlay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  font-size: 1.2rem;
  color: ${(props) => props.theme.text.dim};
`

const ErrorMessage = styled.div`
  padding: 1rem;
  margin: 1rem;
  background: ${(props) => props.theme.background.danger};
  color: ${(props) => props.theme.text.danger};
  text-align: center;
  border-radius: 8px;
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

    const newSocket = io(
      import.meta.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
      {
        auth: {
          token: token,
        },
      },
    )

    newSocket.on('connect', () => {
      console.log('Socket connected')
      // Join chat room immediately after connection
      newSocket.emit('join_chat', conversationId)
      // Request initial messages
      newSocket.emit('get_messages', { chatId: conversationId })
      // Request chat status
      newSocket.emit('get_chat_status', { chatId: conversationId })
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
          content_format: message.content_format || ('plain' as MessageFormat),
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
      {loading && <LoadingOverlay>Loading messages...</LoadingOverlay>}
      <Chat
        messages={messages}
        conversationId={conversationId || ''}
        onSendMessage={handleSendMessage}
        status={chatStatus}
      />
    </Container>
  )
}

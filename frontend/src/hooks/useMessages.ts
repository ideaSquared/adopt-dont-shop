import { useState, useCallback, useRef } from 'react'
import { Message } from '@adoptdontshop/libs/conversations'
import { useErrorHandler } from './useErrorHandler'

interface MessageQueue {
  [key: string]: {
    message: Message
    retries: number
    status: 'pending' | 'sending' | 'failed'
  }
}

interface UseMessagesOptions {
  onSend: (message: Message) => Promise<void>
  maxRetries?: number
  retryDelay?: number
}

export const useMessages = ({
  onSend,
  maxRetries = 3,
  retryDelay = 1000,
}: UseMessagesOptions) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [pendingMessages, setPendingMessages] = useState<Message[]>([])
  const messageQueueRef = useRef<MessageQueue>({})
  const { handleError } = useErrorHandler()

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message])
  }, [])

  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === messageId ? { ...msg, ...updates } : msg,
        ),
      )
    },
    [],
  )

  const deleteMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.message_id !== messageId))
  }, [])

  const retryMessage = useCallback(
    async (messageId: string) => {
      const queuedMessage = messageQueueRef.current[messageId]
      if (!queuedMessage || queuedMessage.retries >= maxRetries) {
        return false
      }

      try {
        queuedMessage.status = 'sending'
        await onSend(queuedMessage.message)
        delete messageQueueRef.current[messageId]
        return true
      } catch (error) {
        queuedMessage.status = 'failed'
        queuedMessage.retries += 1
        handleError('Failed to send message', error)

        if (queuedMessage.retries < maxRetries) {
          setTimeout(() => {
            retryMessage(messageId)
          }, retryDelay * queuedMessage.retries) // Exponential backoff
        }
        return false
      }
    },
    [maxRetries, retryDelay, onSend, handleError],
  )

  const sendMessage = useCallback(
    async (message: Message) => {
      // Add to pending messages for optimistic update
      setPendingMessages((prev) => [...prev, message])

      try {
        await onSend(message)
        // Remove from pending on success
        setPendingMessages((prev) =>
          prev.filter((msg) => msg.message_id !== message.message_id),
        )
      } catch (error) {
        // Add to retry queue on failure
        messageQueueRef.current[message.message_id] = {
          message,
          retries: 0,
          status: 'failed',
        }
        handleError('Failed to send message', error)
        retryMessage(message.message_id)
      }
    },
    [onSend, handleError, retryMessage],
  )

  const markMessageAsRead = useCallback(
    (messageId: string, userId: string) => {
      updateMessage(messageId, {
        readStatus: [
          {
            user_id: userId,
            read_at: new Date(),
          },
        ],
      })
    },
    [updateMessage],
  )

  return {
    messages,
    pendingMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    sendMessage,
    retryMessage,
    markMessageAsRead,
  }
}

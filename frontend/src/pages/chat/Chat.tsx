import {
  Message as BaseMessage,
  ConversationService,
} from '@adoptdontshop/libs/conversations'

import React, { useCallback, useEffect, useRef, useState } from 'react'

import styled, { css } from 'styled-components'

import { useUser } from '../../contexts/auth/UserContext'

import { useErrorHandler } from '../../hooks/useErrorHandler'

import { ConnectionStatus } from './components/ConnectionStatus'

import { MessageStatus } from './components/MessageStatus'

import { TypingIndicator } from './components/TypingIndicator'

import { useAlert } from '../../contexts/alert/AlertContext'

import ChatAnalyticsService from '../../services/ChatAnalyticsService'

import { MessageList } from './components/MessageList'

import { FilePreview } from './components/FilePreview'

import { MessageReactions } from './components/MessageReactions'

// Extended Message type to include reactions
interface Message extends BaseMessage {
  reactions?: Array<{
    emoji: string
    count: number
    users: string[]
  }>
  attachments?: Array<{
    attachment_id: string
    filename: string
    originalName: string
    mimeType: string
    size: number
    url: string
  }>
}

// Custom debounce hook

const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,

  delay: number,
) => {
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },

    [callback, delay],
  )

  return {
    callback: debouncedCallback,

    cancel: () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    },
  }
}

// Style definitions

const ChatContainer = styled.div`
  display: flex;

  flex-direction: column;

  height: 100%;

  width: 100%;

  background: ${(props) => props.theme.background.content};

  position: absolute;

  inset: 0;
`

const ChatHeader = styled.div`
  padding: ${(props) => props.theme.spacing.md};

  border-bottom: 1px solid ${(props) => props.theme.border.color.default};

  background: ${(props) => props.theme.background.content};

  display: flex;

  align-items: center;

  gap: ${(props) => props.theme.spacing.md};

  height: 64px;
`

const ChatTitle = styled.h2`
  margin: 0;

  font-size: ${(props) => props.theme.typography.size.lg};

  font-weight: ${(props) => props.theme.typography.weight.medium};

  color: ${(props) => props.theme.text.body};
`

const MessageListWrapper = styled.div`
  flex: 1;

  overflow-y: auto;

  padding: ${(props) => props.theme.spacing.md};

  display: flex;

  flex-direction: column;

  gap: ${(props) => props.theme.spacing.md};

  min-height: 0;

  background-color: ${(props) => props.theme.background.body};

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${(props) => props.theme.background.contrast};

    border-radius: ${(props) => props.theme.border.radius.full};
  }
`

const MessageGroup = styled.div<{ isCurrentUser: boolean }>`
  display: flex;

  flex-direction: column;

  gap: ${(props) => props.theme.spacing.xs};

  align-items: ${(props) => (props.isCurrentUser ? 'flex-end' : 'flex-start')};

  max-width: 85%;

  align-self: ${(props) => (props.isCurrentUser ? 'flex-end' : 'flex-start')};

  margin: ${(props) => props.theme.spacing.sm} 0;

  position: relative;
`

const MessageBubble = styled.div<{ isCurrentUser: boolean }>`
  display: flex;

  flex-direction: column;

  gap: ${(props) => props.theme.spacing.xs};

  max-width: 100%;

  position: relative;
`

const MessageHeader = styled.div<{ isCurrentUser: boolean }>`
  display: flex;

  align-items: center;

  gap: ${(props) => props.theme.spacing.sm};

  padding: 0 ${(props) => props.theme.spacing.sm};

  justify-content: ${(props) =>
    props.isCurrentUser ? 'flex-end' : 'flex-start'};

  margin-bottom: ${(props) => props.theme.spacing.xs};
`

const UserAvatar = styled.div<{ bgColor: string }>`
  width: 28px;

  height: 28px;

  border-radius: 50%;

  background-color: ${(props) => props.bgColor};

  display: flex;

  align-items: center;

  justify-content: center;

  color: white;

  font-size: ${(props) => props.theme.typography.size.sm};

  font-weight: ${(props) => props.theme.typography.weight.medium};

  text-transform: uppercase;
`

const MessageItem = styled.div<MessageItemProps>`
  padding: ${(props) => props.theme.spacing.sm}
    ${(props) => props.theme.spacing.md};

  border-radius: ${(props) =>
    props.isCurrentUser
      ? `${props.theme.border.radius.lg} ${props.theme.border.radius.lg} ${props.theme.border.radius.sm} ${props.theme.border.radius.lg}`
      : `${props.theme.border.radius.lg} ${props.theme.border.radius.lg} ${props.theme.border.radius.lg} ${props.theme.border.radius.sm}`};

  max-width: 100%;

  word-break: break-word;

  font-size: ${(props) => props.theme.typography.size.sm};

  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};

  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

  position: relative;

  ${(props) =>
    props.isCurrentUser
      ? css`
          background-color: ${props.theme.background.highlight};

          color: ${props.theme.text.body};

          margin-left: auto;
        `
      : css`
          background-color: ${props.theme.background.contrast};

          color: ${props.theme.text.body};

          margin-right: auto;
        `}

  &:hover {
    .message-actions {
      opacity: 1;
    }
  }
`

const MessageSender = styled.div`
  font-size: ${(props) => props.theme.typography.size.sm};

  color: ${(props) => props.theme.text.dim};

  font-weight: ${(props) => props.theme.typography.weight.medium};
`

const MessageTime = styled.span`
  font-size: ${(props) => props.theme.typography.size.xs};

  color: ${(props) => props.theme.text.dim};

  margin-top: ${(props) => props.theme.spacing.xs};

  display: inline-block;

  margin-left: auto;
`

const MessageActions = styled.div`
  position: absolute;

  right: ${(props) => props.theme.spacing.sm};

  top: -${(props) => props.theme.spacing.md};

  display: flex;

  gap: ${(props) => props.theme.spacing.xs};

  opacity: 0;

  transition: opacity 0.2s ease;

  background: ${(props) => props.theme.background.content};

  padding: ${(props) => props.theme.spacing.xs};

  border-radius: ${(props) => props.theme.border.radius.md};

  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  z-index: 1;
`

const MessageContent = styled.div`
  img {
    max-width: 100%;

    border-radius: ${(props) => props.theme.border.radius.sm};
  }

  pre,
  code {
    background-color: ${(props) => props.theme.background.contrast};

    padding: ${(props) => props.theme.spacing.xs};

    border-radius: ${(props) => props.theme.border.radius.sm};

    font-family: monospace;

    white-space: pre-wrap;
  }

  p {
    margin: 0;
  }

  ul,
  ol {
    margin: 0;

    padding-left: ${(props) => props.theme.spacing.lg};
  }

  h1,
  h2 {
    margin: 0;

    font-size: inherit;

    font-weight: bold;
  }

  a {
    color: ${(props) => props.theme.text.link};

    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  /* Quill editor content styles */

  .ql-editor {
    padding: 0;
  }
`

const MessageTimestamp = styled.div`
  font-size: ${(props) => props.theme.typography.size.xs};

  color: ${(props) => props.theme.text.dim};

  margin-top: ${(props) => props.theme.spacing.xs};
`

const InputContainer = styled.div`
  padding: ${(props) => props.theme.spacing.md};

  border-top: 1px solid ${(props) => props.theme.border.color.default};

  background: ${(props) => props.theme.background.content};

  flex-shrink: 0;

  display: flex;

  gap: ${(props) => props.theme.spacing.sm};

  align-items: flex-end;
`

const SendButton = styled.button`
  width: 40px;

  height: 40px;

  padding: 0;

  background-color: ${(props) => props.theme.background.highlight};

  color: ${(props) => props.theme.text.dark};

  border: none;

  border-radius: 50%;

  cursor: pointer;

  display: flex;

  align-items: center;

  justify-content: center;

  flex-shrink: 0;

  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: ${(props) => props.theme.background.mouseHighlight};

    transform: scale(1.05);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.6;

    cursor: not-allowed;
  }

  svg {
    width: 20px;

    height: 20px;

    fill: currentColor;
  }
`

const LockedChatMessage = styled.div`
  background-color: ${(props) => props.theme.background.warning};

  color: ${(props) => props.theme.text.warning};

  padding: ${(props) => props.theme.spacing.md};

  margin: ${(props) => props.theme.spacing.md} 0;

  border-radius: ${(props) => props.theme.border.radius.md};

  text-align: center;

  font-weight: ${(props) => props.theme.typography.weight.medium};
`

const ErrorMessage = styled.div`
  padding: ${(props) => props.theme.spacing.md};

  background-color: ${(props) => props.theme.background.warning};

  color: ${(props) => props.theme.text.warning};

  border-radius: ${(props) => props.theme.border.radius.md};

  margin: ${(props) => props.theme.spacing.md} 0;

  text-align: center;
`

const FileButton = styled.button`
  padding: ${(props) => props.theme.spacing.xs};

  background: ${(props) => props.theme.background.content};

  border: 1px solid ${(props) => props.theme.border.color.default};

  border-radius: ${(props) => props.theme.border.radius.sm};

  color: ${(props) => props.theme.text.dim};

  cursor: pointer;

  display: flex;

  align-items: center;

  justify-content: center;

  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => props.theme.background.mouseHighlight};

    color: ${(props) => props.theme.text.body};
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    width: 20px;

    height: 20px;
  }
`

const FileInput = styled.input`
  display: none;
`

const MessageInput = styled.textarea`
  flex: 1;

  padding: ${(props) => props.theme.spacing.sm};

  border: 1px solid ${(props) => props.theme.border.color.default};

  border-radius: ${(props) => props.theme.border.radius.md};

  background: ${(props) => props.theme.background.content};

  color: ${(props) => props.theme.text.body};

  font-size: ${(props) => props.theme.typography.size.sm};

  resize: none;

  min-height: 40px;

  max-height: 120px;

  transition: border-color 0.2s ease;

  &:focus {
    outline: none;

    border-color: ${(props) => props.theme.border.color.focus};
  }

  &::placeholder {
    color: ${(props) => props.theme.text.dim};
  }
`

// Types

type MessageItemProps = {
  isCurrentUser: boolean
}

export interface ChatProps {
  conversationId: string
  onSendMessage: (message: Message) => Promise<void>
  status?: 'active' | 'locked' | 'archived'
  messages: Message[]
  socketConnection?: {
    isConnected: boolean
    emit?: (event: string, data: any) => void
  }
}

type MessageFormat = 'plain' | 'markdown' | 'html'

interface MessageReadStatus {
  user_id: string

  read_at: Date
}

interface ExtendedMessage extends Message {
  content_format: MessageFormat

  readStatus?: MessageReadStatus[]
}

// Custom hook for handling read status

const useReadStatus = (
  conversationId: string,

  messages: ExtendedMessage[],

  isVisible: boolean,
) => {
  const { user } = useUser()

  const [isProcessing, setIsProcessing] = useState(false)

  const processedMessagesRef = useRef<Set<string>>(new Set())

  const lastProcessedTimeRef = useRef<number>(0)

  const markMessagesAsRead = useCallback(async () => {
    if (!user?.user_id || !conversationId || !isVisible || isProcessing) return

    // Prevent rapid repeated calls (debounce for 2 seconds)

    const now = Date.now()

    if (now - lastProcessedTimeRef.current < 2000) return

    lastProcessedTimeRef.current = now

    try {
      setIsProcessing(true)

      const unreadMessages = messages.filter(
        (msg) =>
          msg.sender_id !== user.user_id &&
          !msg.readStatus?.some(
            (status: MessageReadStatus) => status.user_id === user.user_id,
          ) &&
          !processedMessagesRef.current.has(msg.message_id),
      )

      if (unreadMessages.length > 0) {
        await ConversationService.markAllMessagesAsRead(conversationId)

        // Update processed messages set

        unreadMessages.forEach((msg) => {
          processedMessagesRef.current.add(msg.message_id)
        })

        // Dispatch a single update event

        const unreadCounts =
          await ConversationService.getUnreadMessagesForUser()

        window.dispatchEvent(
          new CustomEvent('unreadCountsUpdated', {
            detail: unreadCounts.reduce(
              (acc, { chatId, unreadCount }) => ({
                ...acc,

                [chatId]: unreadCount,
              }),

              {},
            ),
          }),
        )
      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [conversationId, user?.user_id, isVisible, messages, isProcessing])

  // Reset processed messages when conversation changes

  useEffect(() => {
    processedMessagesRef.current = new Set()

    lastProcessedTimeRef.current = 0
  }, [conversationId])

  return { markMessagesAsRead, isProcessing }
}

export const Chat: React.FC<ChatProps> = ({
  conversationId,

  onSendMessage,

  status = 'active',

  messages,

  socketConnection,
}) => {
  const { user } = useUser()

  const { showAlert } = useAlert()

  const { handleError } = useErrorHandler()

  const [messageText, setMessageText] = useState('')

  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const analyticsService = ChatAnalyticsService.getInstance()

  const handleMessageSubmit = async () => {
    if (!messageText.trim() && !selectedFile) return

    try {
      const startTime = Date.now()

      const attachments: any[] = []

      if (selectedFile) {
        // Handle file upload here

        // This is a placeholder - implement your file upload logic

        const formData = new FormData()

        formData.append('file', selectedFile)

        // const uploadResponse = await uploadFile(formData)

        // attachments = [uploadResponse.data]
      }

      const message: Message = {
        message_id: Date.now().toString(),

        chat_id: conversationId,

        sender_id: user?.user_id || '',

        content: messageText,

        content_format: 'plain',

        created_at: new Date().toISOString(),

        updated_at: new Date().toISOString(),

        attachments,

        User: {
          user_id: user?.user_id || '',

          first_name: user?.first_name || '',

          last_name: user?.last_name || '',

          email: user?.email || '',
        },
      }

      await onSendMessage(message)

      // Track message metrics

      analyticsService.trackMessage(message, Date.now() - startTime)

      setMessageText('')

      setSelectedFile(null)
    } catch (error) {
      handleError('Failed to send message', error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit

        showAlert({
          type: 'error',

          message: 'File size must be less than 10MB',
        })

        return
      }

      setSelectedFile(file)
    }
  }

  const handleReaction = async (
    messageId: string,
    emoji: string,
    isAdd: boolean,
  ) => {
    try {
      console.log('Handling reaction:', messageId, emoji, isAdd)
      console.log('Socket connection:', socketConnection)

      if (isAdd) {
        // Add reaction
        if (socketConnection?.emit) {
          console.log('Emitting add_reaction event')
          socketConnection.emit('add_reaction', {
            message_id: messageId,
            emoji,
            chat_id: conversationId,
          })
          analyticsService.trackReaction(messageId, emoji, user?.user_id || '')
        } else {
          console.error('Socket emit function not available')
        }
      } else {
        // Remove reaction
        if (socketConnection?.emit) {
          console.log('Emitting remove_reaction event')
          socketConnection.emit('remove_reaction', {
            message_id: messageId,
            emoji,
            chat_id: conversationId,
          })
        } else {
          console.error('Socket emit function not available')
        }
      }
    } catch (error) {
      handleError('Failed to update reaction', error)
    }
  }

  const renderMessage = useCallback(
    (message: Message) => {
      const isCurrentUser = message.sender_id === user?.user_id

      const initials = message.User
        ? `${message.User.first_name[0]}${message.User.last_name[0]}`.toUpperCase()
        : '??'

      // Generate a consistent color based on the user's ID

      const stringToColor = (str: string) => {
        let hash = 0

        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash)
        }

        const colors = [
          '#4CAF50',

          '#2196F3',

          '#9C27B0',

          '#FF9800',

          '#E91E63',

          '#3F51B5',

          '#009688',

          '#795548',

          '#607D8B',

          '#F44336',
        ]

        return colors[Math.abs(hash) % colors.length]
      }

      const userColor = stringToColor(message.sender_id)

      const timestamp = new Date(message.created_at).toLocaleTimeString([], {
        hour: '2-digit',

        minute: '2-digit',
      })

      return (
        <MessageGroup key={message.message_id} isCurrentUser={isCurrentUser}>
          <MessageBubble isCurrentUser={isCurrentUser}>
            <MessageHeader isCurrentUser={isCurrentUser}>
              {!isCurrentUser && (
                <>
                  <UserAvatar bgColor={userColor}>{initials}</UserAvatar>

                  <MessageSender>
                    {message.User?.first_name} {message.User?.last_name}
                  </MessageSender>
                </>
              )}
            </MessageHeader>

            <MessageItem isCurrentUser={isCurrentUser}>
              <MessageContent>{message.content}</MessageContent>

              <MessageActions className="message-actions">
                <MessageReactions
                  messageId={message.message_id}
                  reactions={message.reactions || []}
                  currentUserId={user?.user_id || ''}
                  onAddReaction={(messageId, emoji) =>
                    handleReaction(messageId, emoji, true)
                  }
                  onRemoveReaction={(messageId, emoji) =>
                    handleReaction(messageId, emoji, false)
                  }
                />

                <MessageStatus message={message} isPending={false} />
              </MessageActions>

              <MessageTime>{timestamp}</MessageTime>
            </MessageItem>

            {message.attachments?.map(
              (attachment: {
                attachment_id: string
                filename: string
                originalName: string
                mimeType: string
                size: number
                url: string
              }) => (
                <FilePreview
                  key={attachment.attachment_id}
                  file={attachment}
                  onImageClick={(url) => {
                    // Implement image preview
                  }}
                />
              ),
            )}
          </MessageBubble>
        </MessageGroup>
      )
    },

    [user?.user_id, handleReaction],
  )

  return (
    <ChatContainer role="region" aria-label="Chat messages">
      <ConnectionStatus
        isConnected={socketConnection?.isConnected || false}
        isConnecting={false}
      />

      <MessageListWrapper>
        <MessageList messages={messages} renderMessage={renderMessage} />
      </MessageListWrapper>

      <TypingIndicator
        chatId={conversationId}
        parentSocketConnection={socketConnection}
      />

      {status === 'locked' && (
        <LockedChatMessage role="alert">
          This chat is locked and no new messages can be sent.
        </LockedChatMessage>
      )}

      {status === 'active' && (
        <InputContainer>
          <FileButton
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M10 4v12M4 10h12"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </FileButton>

          <FileInput
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx"
          />

          <MessageInput
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()

                handleMessageSubmit()
              }
            }}
            rows={1}
            aria-label="Message input"
          />

          <SendButton
            onClick={handleMessageSubmit}
            disabled={!messageText.trim() && !selectedFile}
            aria-label="Send message"
          >
            Send
          </SendButton>
        </InputContainer>
      )}
    </ChatContainer>
  )
}

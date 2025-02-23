import { ConversationService, Message } from '@adoptdontshop/libs/conversations'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styled, { css } from 'styled-components'
import MarkdownEditor from './components/MarkdownEditor/MarkdownEditor'
import { useUser } from '../../contexts/auth/UserContext'
import { useSocket } from '../../hooks/useSocket'
import { useMessages } from '../../hooks/useMessages'
import { useErrorHandler } from '../../hooks/useErrorHandler'
import { ConnectionStatus } from './components/ConnectionStatus'
import { MessageStatus } from './components/MessageStatus'
import { TypingIndicator } from './components/TypingIndicator'
import { VirtualizedMessageList } from './components/VirtualizedMessageList'
import { useAlert } from '../../contexts/alert/AlertContext'
import ChatAnalyticsService from '../../services/ChatAnalyticsService'
import { MessageList } from './components/MessageList'
import { FilePreview } from './components/FilePreview'
import { MessageReactions } from './components/MessageReactions'

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

const MessageGroup = styled.div<{ isCurrentUser: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
  align-items: ${(props) => (props.isCurrentUser ? 'flex-end' : 'flex-start')};
  max-width: 85%;
  align-self: ${(props) => (props.isCurrentUser ? 'flex-end' : 'flex-start')};
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

  ${(props) =>
    props.isCurrentUser
      ? css`
          background-color: ${props.theme.background.highlight};
          color: ${props.theme.text.body};
        `
      : css`
          background-color: ${props.theme.background.contrast};
          color: ${props.theme.text.body};
        `}
`

const MessageSender = styled.div`
  font-size: ${(props) => props.theme.typography.size.sm};
  color: ${(props) => props.theme.text.dim};
  margin-bottom: ${(props) => props.theme.spacing.xs};
  font-weight: ${(props) => props.theme.typography.weight.medium};
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

// Types
type MessageItemProps = {
  isCurrentUser: boolean
}

type ChatProps = {
  conversationId: string
  onSendMessage: (message: Message) => void
  status?: 'active' | 'locked' | 'archived'
  messages: Message[]
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
      let attachments = []

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
      if (isAdd) {
        // Add reaction
        analyticsService.trackReaction(messageId, emoji, user?.user_id || '')
      } else {
        // Remove reaction
        // Implement reaction removal tracking if needed
      }
    } catch (error) {
      handleError('Failed to update reaction', error)
    }
  }

  const renderMessage = useCallback(
    (message: Message) => (
      <div key={message.message_id}>
        <div>{message.content}</div>
        {message.attachments?.map((attachment) => (
          <FilePreview
            key={attachment.attachment_id}
            file={attachment}
            onImageClick={(url) => {
              // Implement image preview
            }}
          />
        ))}
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
      </div>
    ),
    [user?.user_id, handleReaction],
  )

  return (
    <ChatContainer role="region" aria-label="Chat messages">
      <ConnectionStatus isConnected={true} isConnecting={false} />

      <MessageListWrapper>
        <MessageList messages={messages} renderMessage={renderMessage} />
      </MessageListWrapper>

      <TypingIndicator chatId={conversationId} />

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
          />
          <SendButton
            onClick={handleMessageSubmit}
            disabled={!messageText.trim() && !selectedFile}
          >
            Send
          </SendButton>
        </InputContainer>
      )}
    </ChatContainer>
  )
}

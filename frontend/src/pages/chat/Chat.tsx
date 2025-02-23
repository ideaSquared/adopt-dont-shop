import { Message } from '@adoptdontshop/libs/conversations'
import DOMPurify from 'dompurify'
import React, { useEffect, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import RichTextEditor from '../../components/RichTextEditor/RichTextEditor'

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

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${(props) => props.theme.spacing.md};
  background-color: ${(props) => props.theme.background.body};
  scroll-behavior: smooth;
  display: flex;
  flex-direction: column;
  min-height: 0;

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${(props) => props.theme.border.color.default};
    border-radius: ${(props) => props.theme.border.radius.full};
  }
`

const MessagesWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  margin-top: auto; /* Push messages to bottom when not enough content */
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

// Types
type MessageItemProps = {
  isCurrentUser: boolean
}

type ChatProps = {
  messages: ExtendedMessage[]
  conversationId: string
  onSendMessage: (message: ExtendedMessage) => void
  status?: 'active' | 'locked' | 'archived'
}

type MessageFormat = 'plain' | 'markdown' | 'html'

interface ExtendedMessage extends Message {
  content_format: MessageFormat
}

export const Chat: React.FC<ChatProps> = ({
  messages,
  conversationId,
  onSendMessage,
  status = 'active',
}) => {
  const [newMessage, setNewMessage] = useState('')
  const [messageFormat, setMessageFormat] = useState<MessageFormat>('html')
  const messageListRef = useRef<HTMLDivElement>(null)
  const currentUserId = '1' // TODO: Get from auth context
  const isMessageValid = newMessage.trim().length > 0
  const isLocked = status === 'locked' || status === 'archived'

  // Scroll to bottom when messages change or component mounts
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = () => {
    if (newMessage.trim() && !isLocked) {
      const newMsg: ExtendedMessage = {
        message_id: '', // Will be set by the server
        chat_id: conversationId,
        sender_id: currentUserId,
        content: newMessage,
        content_format: messageFormat,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        User: {
          user_id: currentUserId,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
        },
      }

      onSendMessage(newMsg)
      setNewMessage('')
    }
  }

  const renderMessageContent = (message: ExtendedMessage) => {
    const sanitizedContent = DOMPurify.sanitize(message.content)

    if (message.content_format === 'html') {
      return (
        <MessageContent
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      )
    }

    return <MessageContent>{sanitizedContent}</MessageContent>
  }

  // Group messages by sender
  const groupedMessages = messages.reduce(
    (groups: ExtendedMessage[][], message) => {
      const lastGroup = groups[groups.length - 1]

      if (lastGroup && lastGroup[0].sender_id === message.sender_id) {
        lastGroup.push(message)
      } else {
        groups.push([message])
      }

      return groups
    },
    [],
  )

  return (
    <ChatContainer>
      <MessageList ref={messageListRef}>
        <MessagesWrapper>
          {groupedMessages.map((group, groupIndex) => (
            <MessageGroup
              key={groupIndex}
              isCurrentUser={group[0].sender_id === currentUserId}
            >
              <MessageSender>
                {group[0].User.first_name} {group[0].User.last_name}
              </MessageSender>
              {group.map((message) => (
                <MessageItem
                  key={message.message_id}
                  isCurrentUser={message.sender_id === currentUserId}
                >
                  {renderMessageContent(message)}
                  <MessageTimestamp>
                    {new Date(message.created_at).toLocaleTimeString()}
                  </MessageTimestamp>
                </MessageItem>
              ))}
            </MessageGroup>
          ))}
        </MessagesWrapper>
      </MessageList>

      {isLocked && (
        <LockedChatMessage>
          This chat is {status === 'locked' ? 'locked' : 'archived'} and no new
          messages can be sent.
        </LockedChatMessage>
      )}
      {!isLocked && (
        <InputContainer>
          <RichTextEditor
            value={newMessage}
            onChange={(content, format) => {
              setNewMessage(content)
              setMessageFormat(format)
            }}
            placeholder="Type your message..."
          />
          <SendButton
            onClick={handleSendMessage}
            disabled={!isMessageValid}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </SendButton>
        </InputContainer>
      )}
    </ChatContainer>
  )
}

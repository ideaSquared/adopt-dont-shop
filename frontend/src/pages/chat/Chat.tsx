import { Message } from '@adoptdontshop/libs/conversations'
import DOMPurify from 'dompurify'
import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import RichTextEditor from '../../components/RichTextEditor/RichTextEditor'

// Style definitions
const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px;

  @media (min-width: 768px) {
    padding: 0;
  }
`

const MessageList = styled.div`
  flex: 1;
  padding: 10px;
  overflow-y: auto;
  background-color: #f9f9f9;
`

const MessageItem = styled.div<MessageItemProps>`
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 4px;
  background-color: #e1ffc7;
  max-width: 90%;

  ${(props) =>
    props.isCurrentUser
      ? css`
          background-color: #007bff;
          color: #fff;
          margin-left: auto;
          text-align: right;
        `
      : css`
          background-color: #e1ffc7;
          margin-right: auto;
        `}
`

const MessageSender = styled.div`
  font-weight: bold;
  margin-bottom: 5px;
`

const MessageContent = styled.div`
  margin-bottom: 5px;

  img {
    max-width: 100%;
    height: auto;
  }

  pre {
    background-color: #f8f9fa;
    padding: 8px;
    border-radius: 4px;
    overflow-x: auto;
  }

  code {
    font-family: monospace;
    background-color: #f8f9fa;
    padding: 2px 4px;
    border-radius: 2px;
  }

  blockquote {
    border-left: 3px solid #ccc;
    margin: 0;
    padding-left: 1em;
    color: #666;
  }
`

const MessageTimestamp = styled.div`
  font-size: 0.75rem;
  color: #666;
  text-align: right;
`

const InputContainer = styled.div`
  display: flex;
  padding: 10px;
  background-color: #fff;
  border-top: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.1);

  @media (min-width: 768px) {
    padding: 10px;
  }
`

const Input = styled.input`
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`

const Button = styled.button`
  margin-left: 10px;
  padding: 8px 16px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`

// Types
type MessageItemProps = {
  isCurrentUser: boolean
}

type ChatProps = {
  messages: ExtendedMessage[]
  conversationId: string
  onSendMessage: (message: ExtendedMessage) => void
}

type MessageFormat = 'plain' | 'markdown' | 'html'

interface ExtendedMessage extends Message {
  content_format: MessageFormat
}

export const Chat: React.FC<ChatProps> = ({
  messages,
  conversationId,
  onSendMessage,
}) => {
  const [newMessage, setNewMessage] = useState('')
  const [messageFormat, setMessageFormat] = useState<MessageFormat>('html')
  const currentUserId = '1' // TODO: Get from auth context
  const isMessageValid = newMessage.trim().length > 0

  const handleSendMessage = () => {
    if (newMessage.trim()) {
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

  return (
    <ChatContainer>
      <MessageList>
        {messages.map((message) => (
          <MessageItem
            key={message.message_id}
            isCurrentUser={message.sender_id === currentUserId}
          >
            <MessageSender>
              {message.User.first_name} {message.User.last_name}
            </MessageSender>
            {renderMessageContent(message)}
            <MessageTimestamp>
              {new Date(message.created_at).toLocaleTimeString()}
            </MessageTimestamp>
          </MessageItem>
        ))}
      </MessageList>
      <InputContainer>
        <RichTextEditor
          value={newMessage}
          onChange={(content, format) => {
            setNewMessage(content)
            setMessageFormat(format)
          }}
          placeholder="Type your message..."
        />
        <Button onClick={handleSendMessage} disabled={!isMessageValid}>
          Send
        </Button>
      </InputContainer>
    </ChatContainer>
  )
}

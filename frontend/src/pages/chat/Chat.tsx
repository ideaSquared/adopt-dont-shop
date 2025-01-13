import React, { useState } from 'react'

// Third-party imports
import styled, { css } from 'styled-components'

// Internal imports
import { Message } from '@adoptdontshop/libs/conversations'

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

const MessageText = styled.div`
  margin-bottom: 5px;
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
  messages: Message[]
  conversationId: string
  onSendMessage: (message: Message) => void
}

export const Chat: React.FC<ChatProps> = ({
  messages,
  conversationId,
  onSendMessage,
}) => {
  // State
  const [newMessage, setNewMessage] = useState<string>('')

  // Constants
  const currentUserId = '1' // TODO: Get from auth context
  const isMessageValid = newMessage.trim().length > 0

  // Event handlers
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg: Message = {
        sender_id: currentUserId,
        sender_name: 'John Doe',
        message_text: newMessage,
        sent_at: new Date().toISOString(),
        status: 'sent',
        conversation_id: conversationId,
      }

      onSendMessage(newMsg)
      setNewMessage('')
    }
  }

  // Render
  return (
    <ChatContainer>
      <MessageList>
        {messages.map((message, index) => (
          <MessageItem
            key={index}
            isCurrentUser={message.sender_id === currentUserId}
          >
            <MessageSender>{message.sender_name}</MessageSender>
            <MessageText>{message.message_text}</MessageText>
            <MessageTimestamp>
              {new Date(message.sent_at).toLocaleTimeString()}
            </MessageTimestamp>
          </MessageItem>
        ))}
      </MessageList>
      <InputContainer>
        <Input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <Button onClick={handleSendMessage} disabled={!isMessageValid}>
          Send
        </Button>
      </InputContainer>
    </ChatContainer>
  )
}

import { Message } from '@adoptdontshop/libs/conversations'
import React, { useState } from 'react'
import styled, { css } from 'styled-components'

interface ChatProps {
  messages: Message[]
  conversationId: string
  onSendMessage: (message: Message) => void
}

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%; /* Make sure the chat container takes up full height */
`

const MessageList = styled.div`
  flex: 1;
  padding: 10px;
  overflow-y: auto; /* Enable scrolling within the message list */
  background-color: #f9f9f9;
`

interface MessageItemProps {
  isCurrentUser: boolean
}

const MessageItem = styled.div<MessageItemProps>`
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 4px;
  background-color: #e1ffc7;
  max-width: 60%;

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

const Chat: React.FC<ChatProps> = ({
  messages,
  conversationId,
  onSendMessage,
}) => {
  const [newMessage, setNewMessage] = useState<string>('')
  const currentUserId = '1' // Assume the current user has an ID of '1'
  const isMessageValid = newMessage.trim().length > 0

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

export default Chat

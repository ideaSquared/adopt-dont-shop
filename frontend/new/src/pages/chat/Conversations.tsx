import {
  Conversation,
  ConversationService,
  Message,
} from '@adoptdontshop/libs/conversations'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import Chat from './Chat'
import MessageSidebar from './MessageSidebar'

const OuterContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f0f0;
`

const Container = styled.div`
  display: flex;
  width: 75%;
  height: 75%;
  background-color: #fff;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
`

const ChatArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Ensure the chat area doesn't overflow */
`

const MainContainer: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null)
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    const fetchedConversations = ConversationService.getConversations()
    setConversations(fetchedConversations)
  }, [])

  useEffect(() => {
    if (selectedConversationId) {
      const fetchedMessages = ConversationService.getMessagesByConversationId(
        selectedConversationId,
      )
      setMessages(fetchedMessages)
    }
  }, [selectedConversationId])

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id)
  }

  const handleSendMessage = (newMessage: Message) => {
    setMessages((prevMessages) => [...prevMessages, newMessage])
  }

  return (
    <OuterContainer>
      <Container>
        <MessageSidebar
          conversations={conversations}
          onSelectConversation={handleSelectConversation}
        />
        <ChatArea>
          {selectedConversationId && (
            <Chat
              conversationId={selectedConversationId}
              messages={messages}
              onSendMessage={handleSendMessage}
            />
          )}
        </ChatArea>
      </Container>
    </OuterContainer>
  )
}

export default MainContainer

import React, { useEffect, useState } from 'react'

// Third-party imports
import styled from 'styled-components'

// Internal imports
import {
  Conversation,
  ConversationService,
  Message,
} from '@adoptdontshop/libs/conversations'
import { Chat } from './Chat'
import { MessageSidebar } from './MessageSidebar'

// Style definitions
const OuterContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f0f0;
  padding: 10px; /* Add padding for mobile */

  @media (min-width: 768px) {
    padding: 0; /* Remove padding on larger screens */
  }
`

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #fff;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;

  @media (min-width: 768px) {
    flex-direction: row;
    width: 75%;
    height: 75%;
  }
`

const ChatArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

// Types
type ConversationsProps = {
  // No props needed currently
}

export const Conversations: React.FC<ConversationsProps> = () => {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null)
  const [messages, setMessages] = useState<Message[]>([])

  // Effects
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const fetchedConversations =
          await ConversationService.getConversations()
        setConversations(fetchedConversations)
      } catch (error) {
        console.error('Error fetching conversations:', error)
      }
    }

    fetchConversations()
  }, [])

  useEffect(() => {
    const fetchMessages = async () => {
      if (selectedConversationId) {
        try {
          const fetchedMessages =
            await ConversationService.getMessagesByConversationId(
              selectedConversationId,
            )
          setMessages(fetchedMessages)
        } catch (error) {
          console.error('Error fetching messages:', error)
        }
      }
    }

    fetchMessages()
  }, [selectedConversationId])

  // Event handlers
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id)
  }

  const handleSendMessage = (newMessage: Message) => {
    setMessages((prevMessages) => [...prevMessages, newMessage])
  }

  // Render
  return (
    <OuterContainer>
      <Container>
        <MessageSidebar
          selectedConversationId={selectedConversationId}
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

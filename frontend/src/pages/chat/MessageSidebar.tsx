import React from 'react'

// Third-party imports
import styled from 'styled-components'

// Internal imports
import { Conversation } from '@adoptdontshop/libs/conversations'

// Style definitions
const SidebarContainer = styled.div`
  width: 100%;
  height: 200px;
  border-right: none;
  overflow-y: auto;
  border-bottom: 1px solid #ccc;

  @media (min-width: 768px) {
    width: 250px;
    height: 100%;
    border-right: 1px solid #ccc;
  }
`

const ConversationItem = styled.div<{ isSelected: boolean }>`
  padding: 10px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  background-color: ${(props) =>
    props.isSelected ? '#d0e6ff' : 'transparent'};

  &:hover {
    background-color: ${(props) => (props.isSelected ? '#c0d6ff' : '#f5f5f5')};
  }

  @media (min-width: 768px) {
    padding: 15px;
  }
`

const ConversationName = styled.div`
  font-weight: bold;
`

const ConversationLastMessage = styled.div`
  font-size: 0.9rem;
  color: #666;
`

// Types
type MessageSidebarProps = {
  conversations: Conversation[]
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
}

export const MessageSidebar: React.FC<MessageSidebarProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
}) => {
  // Render
  return (
    <SidebarContainer>
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.conversation_id}
          isSelected={conversation.conversation_id === selectedConversationId}
          onClick={() => onSelectConversation(conversation.conversation_id)}
        >
          <ConversationName>{conversation.started_by}</ConversationName>
          <ConversationLastMessage>
            {conversation.last_message}
          </ConversationLastMessage>
        </ConversationItem>
      ))}
    </SidebarContainer>
  )
}

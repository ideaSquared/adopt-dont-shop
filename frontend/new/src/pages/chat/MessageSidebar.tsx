import { Conversation } from '@adoptdontshop/libs/conversations'
import React from 'react'
import styled from 'styled-components'

const SidebarContainer = styled.div`
  width: 250px;
  height: 100%;
  border-right: 1px solid #ccc;
  overflow-y: auto;
  border-bottom: 1px solid #ccc;
`

const ConversationItem = styled.div`
  padding: 15px;
  border-bottom: 1px solid #eee;
  cursor: pointer;

  &:hover {
    background-color: #f5f5f5;
  }
`

const ConversationName = styled.div`
  font-weight: bold;
`

const ConversationLastMessage = styled.div`
  font-size: 0.9rem;
  color: #666;
`

interface MessageSidebarProps {
  conversations: Conversation[]
  onSelectConversation: (id: string) => void
}

const MessageSidebar: React.FC<MessageSidebarProps> = ({
  conversations,
  onSelectConversation,
}) => {
  return (
    <SidebarContainer>
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.conversation_id}
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

export default MessageSidebar

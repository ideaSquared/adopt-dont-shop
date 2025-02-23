import { DateTime } from '@adoptdontshop/components'
import { ConversationService } from '@adoptdontshop/libs/conversations'
import type { Conversation } from '@adoptdontshop/libs/conversations/Conversation'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { useUser } from '../../contexts/auth/UserContext'
import { ChatContainer } from './ChatContainer'

const PageContainer = styled.div`
  display: flex;
  height: calc(100vh - 64px);
  background: #2f3136;
`

const Sidebar = styled.div`
  width: 350px;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  background: #2f3136;
`

const SidebarHeader = styled.div`
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`

const Title = styled.h1`
  font-size: 1.25rem;
  color: #ffffff;
  margin: 0;
  font-weight: 600;
`

const ConversationList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
`

const ConversationCard = styled.div<{ isSelected?: boolean }>`
  padding: 0.75rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  background: ${(props) =>
    props.isSelected ? 'rgba(255, 255, 255, 0.05)' : 'transparent'};
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.isSelected
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.02)'};
  }
`

const ParticipantList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin-bottom: 0.25rem;
`

const ParticipantRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const ParticipantName = styled.span`
  font-weight: 500;
  color: #dcddde;
  font-size: 0.875rem;
`

const MessagePreview = styled.div`
  color: #8e9297;
  font-size: 0.8125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const StatusIndicator = styled.span<{
  status: 'active' | 'locked' | 'archived'
}>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 0.5rem;
  background: ${(props) => {
    switch (props.status) {
      case 'active':
        return '#3ba55c'
      case 'locked':
        return '#ed4245'
      case 'archived':
        return '#747f8d'
      default:
        return '#747f8d'
    }
  }};
`

const TimeStamp = styled.span`
  font-size: 0.6875rem;
  color: #8e9297;
  margin-left: 0.5rem;
`

const MainContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #36393f;
  color: #8e9297;
`

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #8e9297;
`

const ErrorMessage = styled.div`
  text-align: center;
  padding: 1rem;
  margin: 1rem;
  background: rgba(237, 66, 69, 0.1);
  color: #ed4245;
  border-radius: 4px;
`

const NoConversationsMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #8e9297;
`

const RoleChip = styled.span`
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  background: rgba(79, 84, 92, 0.3);
  color: #b9bbbe;
  border-radius: 3px;
  margin-left: 0.25rem;
`

export const UserConversations: React.FC = () => {
  const navigate = useNavigate()
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useUser()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true)
        const response = await ConversationService.getUserConversations()
        setConversations(response || [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load conversations',
        )
      } finally {
        setLoading(false)
      }
    }

    if (user?.user_id) {
      fetchConversations()
    }
  }, [user?.user_id])

  const handleSelectChat = (chatId: string) => {
    navigate(`/chat/${chatId}`)
  }

  if (!user?.user_id) {
    return (
      <PageContainer>
        <ErrorMessage>You must be logged in to view conversations</ErrorMessage>
      </PageContainer>
    )
  }

  if (loading) {
    return (
      <PageContainer>
        <LoadingMessage>Loading your conversations...</LoadingMessage>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorMessage>{error}</ErrorMessage>
      </PageContainer>
    )
  }

  const renderSidebar = () => (
    <Sidebar>
      <SidebarHeader>
        <Title>Messages</Title>
      </SidebarHeader>
      <ConversationList>
        {!conversations.length ? (
          <NoConversationsMessage>
            You don&apos;t have any conversations yet.
          </NoConversationsMessage>
        ) : (
          conversations.map((conversation) => {
            const otherParticipants = conversation.participants.filter(
              (p) => p.participant.user_id !== user.user_id,
            )
            const latestMessage = conversation.Messages?.[0]

            return (
              <ConversationCard
                key={conversation.chat_id}
                onClick={() => handleSelectChat(conversation.chat_id)}
                isSelected={conversation.chat_id === conversationId}
                tabIndex={0}
                role="listitem"
                aria-current={conversation.chat_id === conversationId}
                aria-label={`Chat with ${otherParticipants
                  .map(
                    (p) =>
                      `${p.participant.first_name} ${p.participant.last_name}`,
                  )
                  .join(', ')}`}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <StatusIndicator status={conversation.status} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <ParticipantList>
                        {otherParticipants.map((participant) => (
                          <ParticipantRow key={participant.participant.user_id}>
                            <ParticipantName>
                              {participant.participant.first_name}
                            </ParticipantName>
                            <RoleChip>
                              {participant.role
                                .replace(/_/g, ' ')
                                .toLowerCase()}
                            </RoleChip>
                          </ParticipantRow>
                        ))}
                      </ParticipantList>
                      {latestMessage && (
                        <MessagePreview>{latestMessage.content}</MessagePreview>
                      )}
                    </div>
                  </div>
                  <TimeStamp>
                    <DateTime timestamp={conversation.updated_at} />
                  </TimeStamp>
                </div>
              </ConversationCard>
            )
          })
        )}
      </ConversationList>
    </Sidebar>
  )

  return (
    <PageContainer>
      {renderSidebar()}
      <MainContent>
        {conversationId ? (
          <ChatContainer />
        ) : (
          <div>Select a conversation to start chatting</div>
        )}
      </MainContent>
    </PageContainer>
  )
}

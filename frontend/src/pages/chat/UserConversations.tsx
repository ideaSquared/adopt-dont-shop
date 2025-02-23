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
  height: 100vh;
  background: ${(props) => props.theme.background.body};
`

const Sidebar = styled.div`
  width: 350px;
  min-width: 350px;
  border-right: ${(props) => props.theme.border.width.thin} solid
    ${(props) => props.theme.border.color.default};
  display: flex;
  flex-direction: column;
  background: ${(props) => props.theme.background.content};
`

const SidebarHeader = styled.div`
  padding: ${(props) => props.theme.spacing.md}
    ${(props) => props.theme.spacing.lg};
  border-bottom: ${(props) => props.theme.border.width.thin} solid
    ${(props) => props.theme.border.color.default};
`

const Title = styled.h1`
  font-size: ${(props) => props.theme.typography.size.xl};
  color: ${(props) => props.theme.text.body};
  margin: 0;
  font-weight: ${(props) => props.theme.typography.weight.semibold};
`

const ConversationList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${(props) => props.theme.spacing.sm};
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};

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

const ConversationCard = styled.div<{ isSelected?: boolean }>`
  padding: ${(props) => props.theme.spacing.md}
    ${(props) => props.theme.spacing.md};
  border-radius: ${(props) => props.theme.border.radius.md};
  cursor: pointer;
  background: ${(props) =>
    props.isSelected ? props.theme.background.contrast : 'transparent'};
  transition: ${(props) => props.theme.transitions.fast};

  &:hover {
    background: ${(props) =>
      props.isSelected
        ? props.theme.background.contrast
        : props.theme.background.mouseHighlight};
  }
`

const ParticipantList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
  margin-bottom: ${(props) => props.theme.spacing.xs};
`

const ParticipantRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
`

const ParticipantName = styled.span`
  font-weight: ${(props) => props.theme.typography.weight.medium};
  color: ${(props) => props.theme.text.body};
  font-size: ${(props) => props.theme.typography.size.sm};
`

const MessagePreview = styled.div`
  color: ${(props) => props.theme.text.dim};
  font-size: ${(props) => props.theme.typography.size.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const StatusIndicator = styled.span<{
  status: 'active' | 'locked' | 'archived'
}>`
  width: 6px;
  height: 6px;
  border-radius: ${(props) => props.theme.border.radius.full};
  display: inline-block;
  margin-right: ${(props) => props.theme.spacing.sm};
  background: ${(props) => {
    switch (props.status) {
      case 'active':
        return props.theme.background.success
      case 'locked':
        return props.theme.background.danger
      case 'archived':
        return props.theme.background.disabled
      default:
        return props.theme.background.disabled
    }
  }};
`

const TimeStamp = styled.span`
  font-size: ${(props) => props.theme.typography.size.xs};
  color: ${(props) => props.theme.text.dim};
  margin-left: ${(props) => props.theme.spacing.sm};
`

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const LoadingMessage = styled.div`
  text-align: center;
  padding: ${(props) => props.theme.spacing.xl};
  color: ${(props) => props.theme.text.dim};
`

const ErrorMessage = styled.div`
  text-align: center;
  padding: ${(props) => props.theme.spacing.md};
  margin: ${(props) => props.theme.spacing.md};
  background: ${(props) => props.theme.background.danger};
  color: ${(props) => props.theme.text.danger};
  border-radius: ${(props) => props.theme.border.radius.lg};
`

const NoConversationsMessage = styled.div`
  text-align: center;
  padding: ${(props) => props.theme.spacing.xl};
  color: ${(props) => props.theme.text.dim};
`

const RoleChip = styled.span`
  font-size: ${(props) => props.theme.typography.size.xs};
  padding: ${(props) => props.theme.spacing.xs}
    ${(props) => props.theme.spacing.sm};
  background: ${(props) => props.theme.background.contrast};
  color: ${(props) => props.theme.text.dim};
  border-radius: ${(props) => props.theme.border.radius.sm};
  margin-left: ${(props) => props.theme.spacing.xs};
`

const EmptyStateContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${(props) => props.theme.spacing.xl};
  color: ${(props) => props.theme.text.dim};
`

const EmptyStateText = styled.div`
  font-size: ${(props) => props.theme.typography.size.xl};
  font-weight: ${(props) => props.theme.typography.weight.semibold};
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
          <EmptyStateContainer>
            <EmptyStateText>
              Select a conversation to start chatting
            </EmptyStateText>
          </EmptyStateContainer>
        )}
      </MainContent>
    </PageContainer>
  )
}

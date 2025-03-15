import { DateTime } from '@adoptdontshop/components'
import { ConversationService } from '@adoptdontshop/libs/conversations'
import type { Conversation } from '@adoptdontshop/libs/conversations/Conversation'
import React, { useEffect, useRef, useState } from 'react'
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
  background: ${(props) => {
    const role = props.children?.toString().toLowerCase() || ''
    if (role.includes('rescue')) {
      return props.theme.background.success + '75' // Light green with 20% opacity
    }
    return props.theme.background.contrast
  }};
  color: ${(props) => {
    const role = props.children?.toString().toLowerCase() || ''
    if (role.includes('rescue')) {
      return props.theme.text.success
    }
    return props.theme.text.dim
  }};
  border: 1px solid
    ${(props) => {
      const role = props.children?.toString().toLowerCase() || ''
      if (role.includes('rescue')) {
        return props.theme.border.color.success + '40' // Border with 40% opacity
      }
      return 'transparent'
    }};
  border-radius: ${(props) => props.theme.border.radius.sm};
  margin-left: ${(props) => props.theme.spacing.xs};
  font-weight: ${(props) => props.theme.typography.weight.medium};
  text-transform: capitalize;
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

const UnreadBadge = styled.span`
  background-color: ${(props) => props.theme.background.danger};
  color: white;
  border-radius: ${(props) => props.theme.border.radius.full};
  padding: 2px 8px;
  font-size: ${(props) => props.theme.typography.size.xs};
  font-weight: ${(props) => props.theme.typography.weight.medium};
  margin-left: ${(props) => props.theme.spacing.sm};
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const ConversationHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${(props) => props.theme.spacing.xs};
`

const LatestMessage = styled.div`
  color: ${(props) => props.theme.text.dim};
  font-size: ${(props) => props.theme.typography.size.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: ${(props) => props.theme.spacing.xs};
`

export const UserConversations: React.FC = () => {
  const navigate = useNavigate()
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useUser()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const lastFetchRef = useRef<number>(0)

  // Initial data fetch and socket setup
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Prevent rapid repeated fetches
        const now = Date.now()
        if (now - lastFetchRef.current < 5000) return
        lastFetchRef.current = now

        setLoading(true)
        const [conversationsResponse, unreadMessages] = await Promise.all([
          ConversationService.getUserConversations(),
          ConversationService.getUnreadMessagesForUser(),
        ])

        setConversations(conversationsResponse || [])
        const counts = unreadMessages.reduce(
          (acc, { chatId, unreadCount }) => ({
            ...acc,
            [chatId]: unreadCount,
          }),
          {},
        )
        setUnreadCounts(counts)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load conversations',
        )
      } finally {
        setLoading(false)
      }
    }

    if (user?.user_id) {
      fetchData()
    }

    // Set up interval to periodically check for new messages
    // Increased interval to reduce unnecessary requests
    const interval = setInterval(fetchData, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [user?.user_id])

  const handleSelectChat = (chatId: string) => {
    // Only update if selecting a different chat
    if (chatId === conversationId) return

    // Optimistically update the UI
    setUnreadCounts((prev) => ({
      ...prev,
      [chatId]: 0,
    }))

    // Navigate to the chat
    navigate(`/chat/${chatId}`)

    // Mark messages as read in the background
    ConversationService.markAllMessagesAsRead(chatId).catch((error) => {
      console.error('Failed to mark messages as read:', error)
      // Only revert the optimistic update on error
      setUnreadCounts((prev) => ({
        ...prev,
        [chatId]: prev[chatId] || 0,
      }))
    })
  }

  // Handle unread counts updates from socket events
  useEffect(() => {
    const handleUnreadCountsUpdate = (
      event: CustomEvent<Record<string, number>>,
    ) => {
      setUnreadCounts((prev) => ({
        ...prev,
        ...event.detail,
      }))
    }

    window.addEventListener(
      'unreadCountsUpdated',
      handleUnreadCountsUpdate as EventListener,
    )

    return () => {
      window.removeEventListener(
        'unreadCountsUpdated',
        handleUnreadCountsUpdate as EventListener,
      )
    }
  }, [])

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

  const renderConversationCard = (conversation: Conversation) => {
    const otherParticipants = conversation.participants.filter(
      (p) => p.participant.user_id !== user?.user_id,
    )
    const latestMessage = conversation.Messages?.[0]
    const unreadCount = unreadCounts[conversation.chat_id] || 0

    return (
      <ConversationCard
        key={conversation.chat_id}
        onClick={() => handleSelectChat(conversation.chat_id)}
        isSelected={conversation.chat_id === conversationId}
        tabIndex={0}
        role="listitem"
        aria-current={conversation.chat_id === conversationId}
        aria-label={`Chat with ${otherParticipants
          .map((p) => `${p.participant.first_name} ${p.participant.last_name}`)
          .join(
            ', ',
          )}${unreadCount > 0 ? `. ${unreadCount} unread messages` : ''}`}
      >
        <div>
          <ConversationHeader>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <StatusIndicator status={conversation.status} />
              <div>
                {otherParticipants.map((participant) => (
                  <ParticipantRow key={participant.participant.user_id}>
                    <ParticipantName>
                      {participant.participant.first_name}{' '}
                      {participant.participant.last_name}
                    </ParticipantName>
                    <RoleChip>
                      {participant.role.replace(/_/g, ' ').toLowerCase()}
                    </RoleChip>
                  </ParticipantRow>
                ))}
              </div>
            </div>
            {unreadCount > 0 && <UnreadBadge>{unreadCount}</UnreadBadge>}
          </ConversationHeader>
          {latestMessage && (
            <LatestMessage>
              {latestMessage.content.length > 100
                ? `${latestMessage.content.substring(0, 100)}...`
                : latestMessage.content}
            </LatestMessage>
          )}
          <TimeStamp>
            <DateTime timestamp={conversation.updated_at} />
          </TimeStamp>
        </div>
      </ConversationCard>
    )
  }

  return (
    <PageContainer>
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
            conversations.map(renderConversationCard)
          )}
        </ConversationList>
      </Sidebar>
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

import {
  Badge,
  BaseSidebar,
  Button,
  DateTime,
  FormInput,
  SelectInput,
  Table,
  TextInput,
} from '@adoptdontshop/components'
import { ConversationService } from '@adoptdontshop/libs/conversations'
import type {
  Conversation,
  ConversationStatus,
  Message,
} from '@adoptdontshop/libs/conversations/Conversation'
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { useUser } from '../../contexts/auth/UserContext'

// Style definitions
const ParticipantsTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
`

const ParticipantsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`

const MessagesTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 500;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
`

const MessageList = styled.ul`
  list-style-type: none;
  padding: 1rem;
  margin: 0;
  max-height: 500px;
  overflow-y: auto;
  background-color: ${(props) => props.theme.background.body};
  border-radius: 0.5rem;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
`

const MessageItem = styled.li`
  background-color: ${(props) => props.theme.background.contrast};
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease;

  &:hover {
    transform: translateX(2px);
  }

  &:last-child {
    margin-bottom: 0;
  }
`

const MessageContent = styled.div`
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0.5rem 0;
  white-space: pre-wrap;
  word-break: break-word;
`

const MessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`

const SenderInfo = styled.div`
  font-weight: 600;
  color: ${(props) => props.theme.text.body};
`

const TimeStamp = styled.p`
  font-size: 0.75rem;
  color: ${(props) => props.theme.text.dim};
  margin: 0;
`

const MessageActions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;

  button {
    padding: 0.25rem 0.75rem;
    font-size: 0.85rem;
  }
`

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`

// Remove all type definitions here and keep only the component props type

type ConversationsProps = {
  isAdminView?: boolean
}

export const Conversations: React.FC<ConversationsProps> = ({
  isAdminView = false,
}) => {
  const navigate = useNavigate()
  const { user, rescue } = useUser()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true)
        let fetchedConversations
        if (isAdminView) {
          fetchedConversations = await ConversationService.getAllConversations()
        } else if (rescue?.rescue_id) {
          fetchedConversations =
            await ConversationService.getConversationsByRescueId()
        }
        setConversations(fetchedConversations || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (isAdminView || rescue?.rescue_id) {
      fetchConversations()
    }
  }, [isAdminView, rescue?.rescue_id])

  const filteredConversations = useMemo(() => {
    if (!conversations) return []
    return conversations.filter((conversation) => {
      const matchesSearch =
        !searchTerm ||
        conversation.participants.some(
          (participant) =>
            participant.participant.email
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            `${participant.participant.first_name} ${participant.participant.last_name}`
              .toLowerCase()
              .includes(searchTerm.toLowerCase()),
        )
      const matchesStatus =
        !filterStatus || conversation.status === filterStatus

      return matchesSearch && matchesStatus
    })
  }, [searchTerm, filterStatus, conversations])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleStatusFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setFilterStatus(e.target.value)
  }

  const handleViewConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setIsSidebarOpen(true)

    try {
      const response = await ConversationService.getMessagesByConversationId(
        conversation.chat_id,
      )
      // Extract messages from the response
      const fetchedMessages = Array.isArray(response)
        ? response
        : (response as any).messages || []
      setMessages(fetchedMessages)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      setMessages([])
    }
  }

  const handleJoinChat = (conversationId: string) => {
    navigate(`/chat/${conversationId}`)
  }

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false)
    setSelectedConversation(null)
    setMessages([])
  }

  const handleUpdateStatus = async (
    chatId: string,
    newStatus: ConversationStatus,
  ) => {
    try {
      await ConversationService.updateConversationStatus(
        chatId,
        newStatus,
        isAdminView ? undefined : rescue?.rescue_id,
      )

      // Refresh conversations after status update
      const updatedConversations = isAdminView
        ? await ConversationService.getAllConversations()
        : await ConversationService.getConversationsByRescueId()

      setConversations(updatedConversations)
    } catch (error) {
      console.error('Failed to update conversation status:', error)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await ConversationService.deleteMessage(
        messageId,
        isAdminView ? undefined : rescue?.rescue_id,
      )

      // Refresh messages after deletion
      if (selectedConversation) {
        const updatedMessages =
          await ConversationService.getMessagesByConversationId(
            selectedConversation.chat_id,
          )
        setMessages(updatedMessages)
      }
    } catch (error) {
      console.error('Failed to delete message:', error)
    }
  }

  const canDeleteMessage = (message: Message) => {
    if (isAdminView) return true
    if (!rescue) return false
    return message.sender_id === user?.user_id
  }

  const filterOptions = [
    { value: '', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
  ]

  return (
    <div>
      <h1>{isAdminView ? 'All Conversations' : 'Rescue Conversations'}</h1>
      <FormInput label="Search by participant name or email">
        <TextInput
          value={searchTerm}
          type="text"
          onChange={handleSearchChange}
          placeholder="Search conversations..."
        />
      </FormInput>
      <FormInput label="Filter by status">
        <SelectInput
          options={filterOptions}
          value={filterStatus}
          onChange={handleStatusFilterChange}
        />
      </FormInput>
      <Table hasActions>
        <thead>
          <tr>
            <th>ID</th>
            <th>Started By</th>
            <th>Created At</th>
            <th>Last Message</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                Loading conversations...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td
                colSpan={6}
                style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#dc3545',
                }}
              >
                {error}
              </td>
            </tr>
          ) : filteredConversations.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                No conversations found
              </td>
            </tr>
          ) : (
            filteredConversations.map((conversation) => (
              <tr key={conversation.chat_id}>
                <td>{conversation.chat_id}</td>
                <td>
                  {conversation.participants.find((p) => p.role === 'user')
                    ?.participant.first_name || 'Unknown'}
                </td>
                <td>
                  <DateTime timestamp={conversation.created_at} />
                </td>
                <td>{conversation.Messages[0]?.content || 'No messages'}</td>
                <td>
                  <Badge
                    variant={
                      conversation.status === 'active' ? 'success' : 'danger'
                    }
                  >
                    {conversation.status}
                  </Badge>
                </td>
                <td>
                  <ActionButtons>
                    {!isAdminView && (
                      <Button
                        variant="success"
                        onClick={() => handleJoinChat(conversation.chat_id)}
                      >
                        Join Chat
                      </Button>
                    )}
                    <Button
                      variant="info"
                      onClick={() => handleViewConversation(conversation)}
                    >
                      View Details
                    </Button>
                    {!isAdminView && conversation.status === 'active' && (
                      <Button
                        variant="warning"
                        onClick={() =>
                          handleUpdateStatus(conversation.chat_id, 'archived')
                        }
                      >
                        Archive
                      </Button>
                    )}
                  </ActionButtons>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <BaseSidebar
        show={isSidebarOpen}
        handleClose={handleCloseSidebar}
        title="Conversation Details"
        size="33%"
      >
        {selectedConversation && (
          <div>
            <ParticipantsTitle>Participants</ParticipantsTitle>
            <ParticipantsContainer>
              {selectedConversation.participants.map((participant) => (
                <Badge key={participant.chat_participant_id} variant="info">
                  {participant.participant.first_name}{' '}
                  {participant.participant.last_name} (
                  {participant.participant.email})
                </Badge>
              ))}
            </ParticipantsContainer>
            <MessagesTitle>Messages</MessagesTitle>
            {messages.length === 0 ? (
              <p>No messages found.</p>
            ) : (
              <MessageList>
                {[...messages]
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime(),
                  )
                  .map((message) => (
                    <MessageItem key={message.message_id}>
                      <MessageHeader>
                        <SenderInfo>
                          {message.User.first_name} {message.User.last_name}
                        </SenderInfo>
                        <TimeStamp>
                          {new Date(message.created_at).toLocaleString()}
                        </TimeStamp>
                      </MessageHeader>
                      <MessageContent>{message.content}</MessageContent>
                      {canDeleteMessage(message) && (
                        <MessageActions>
                          <Button
                            variant="danger"
                            onClick={() =>
                              handleDeleteMessage(message.message_id)
                            }
                          >
                            Delete
                          </Button>
                        </MessageActions>
                      )}
                    </MessageItem>
                  ))}
              </MessageList>
            )}
          </div>
        )}
      </BaseSidebar>
    </div>
  )
}

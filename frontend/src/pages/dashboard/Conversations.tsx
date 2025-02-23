import {
  Badge,
  BaseSidebar,
  Button,
  DateTime,
  DropdownButton,
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

import { useAlert } from '../../contexts/alert/AlertContext'
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

const MessageActionsWrapper = styled.div`
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

const MessageItemHeader = styled(MessageHeader)`
  display: flex;

  justify-content: space-between;

  align-items: center;
`

const MessageHeaderLeft = styled.div`
  display: flex;

  align-items: center;

  gap: 1rem;
`

const MessageHeaderRight = styled.div`
  display: flex;

  align-items: center;

  gap: 0.5rem;
`

const MessageActionsContainer = styled.div`
  display: inline-flex;
  align-items: center;
`

// Remove all type definitions here and keep only the component props type

type ConversationsProps = {
  isAdminView?: boolean
}

interface MessageResponse {
  messages: Message[]
}

// Add type for status

const getBadgeVariant = (
  status: ConversationStatus,
): 'success' | 'warning' | 'danger' => {
  switch (status) {
    case 'active':
      return 'success'

    case 'archived':
      return 'danger'

    default:
      return 'danger'
  }
}

export const Conversations: React.FC<ConversationsProps> = ({
  isAdminView = false,
}) => {
  const navigate = useNavigate()

  const { user, rescue } = useUser()
  const { showAlert } = useAlert()

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
        : (response as MessageResponse).messages || []

      setMessages(fetchedMessages)
    } catch (error) {
      setError('Failed to fetch messages')

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
      if (isAdminView) {
        await ConversationService.updateChatStatusAdmin(chatId, newStatus)
      } else {
        await ConversationService.updateConversationStatus(chatId, newStatus)
      }
      showAlert('Chat status updated successfully', 'success')
      handleRefreshConversations()
    } catch (error) {
      showAlert('Failed to update chat status', 'error')
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      await ConversationService.deleteChat(chatId)
      showAlert('Chat deleted successfully', 'success')
      handleRefreshConversations()
    } catch (error) {
      showAlert('Failed to delete chat', 'error')
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      if (isAdminView) {
        await ConversationService.deleteMessageAdmin(messageId)
      } else {
        await ConversationService.deleteMessage(messageId)
      }
      showAlert('Message deleted successfully', 'success')
      if (selectedConversation) {
        const response = await ConversationService.getMessagesByConversationId(
          selectedConversation.chat_id,
        )
        // Handle both array and object response formats
        const updatedMessages = Array.isArray(response)
          ? response
          : (response as MessageResponse).messages || []
        setMessages(updatedMessages)
      }
    } catch (error) {
      showAlert('Failed to delete message', 'error')
    }
  }

  const renderMessageActions = (message: Message) => {
    const canDelete = isAdminView || message.sender_id === user?.user_id

    if (!isAdminView && !canDelete) {
      return null
    }

    if (!isAdminView) {
      return (
        <Button
          variant="danger"
          onClick={() => handleDeleteMessage(message.message_id)}
        >
          Delete
        </Button>
      )
    }

    return (
      <MessageActionsContainer>
        <DropdownButton
          triggerLabel="Actions"
          items={[
            {
              label: 'Delete Message',
              onClick: () => handleDeleteMessage(message.message_id),
            },
          ]}
        />
      </MessageActionsContainer>
    )
  }

  const filterOptions = [
    { value: '', label: 'All' },

    { value: 'active', label: 'Active' },

    { value: 'archived', label: 'Archived' },
  ]

  const handleRefreshConversations = async () => {
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

  return (
    <div>
      <h1>{isAdminView ? 'All Conversations' : 'Rescue Conversations'}</h1>

      <div style={{ marginBottom: '1rem' }}>
        <TextInput
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={handleSearchChange}
        />

        <SelectInput
          value={filterStatus}
          onChange={handleStatusFilterChange}
          options={filterOptions}
        />
      </div>

      <Table>
        <thead>
          <tr>
            <th>ID</th>

            <th>User</th>

            <th>Created</th>

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
                  <Badge variant={getBadgeVariant(conversation.status)}>
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

                    {isAdminView ? (
                      <DropdownButton
                        triggerLabel="Actions"
                        items={[
                          ...(conversation.status !== 'active'
                            ? [
                                {
                                  label: 'Activate Chat',
                                  onClick: () =>
                                    handleUpdateStatus(
                                      conversation.chat_id,
                                      'active',
                                    ),
                                },
                              ]
                            : []),
                          ...(conversation.status !== 'locked'
                            ? [
                                {
                                  label: 'Lock Chat',
                                  onClick: () =>
                                    handleUpdateStatus(
                                      conversation.chat_id,
                                      'locked',
                                    ),
                                },
                              ]
                            : []),
                          ...(conversation.status !== 'archived'
                            ? [
                                {
                                  label: 'Archive Chat',
                                  onClick: () =>
                                    handleUpdateStatus(
                                      conversation.chat_id,
                                      'archived',
                                    ),
                                },
                              ]
                            : []),
                          {
                            label: 'Delete Chat',
                            onClick: () =>
                              handleDeleteChat(conversation.chat_id),
                          },
                        ]}
                      />
                    ) : (
                      conversation.status === 'active' && (
                        <Button
                          variant="warning"
                          onClick={() =>
                            handleUpdateStatus(conversation.chat_id, 'archived')
                          }
                        >
                          Archive
                        </Button>
                      )
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
                      <MessageItemHeader>
                        <MessageHeaderLeft>
                          <SenderInfo>
                            {message.User.first_name} {message.User.last_name}
                          </SenderInfo>

                          <TimeStamp>
                            {new Date(message.created_at).toLocaleString()}
                          </TimeStamp>
                        </MessageHeaderLeft>

                        <MessageHeaderRight>
                          {renderMessageActions(message)}
                        </MessageHeaderRight>
                      </MessageItemHeader>

                      <MessageContent>{message.content}</MessageContent>
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

import React, { useEffect, useMemo, useState } from 'react'

// Third-party imports
import styled from 'styled-components'

// Internal imports
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
import {
  Conversation,
  ConversationService,
  Message,
} from '@adoptdontshop/libs/conversations/'

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
  padding: 0;
  margin: 0;
`

const MessageItem = styled.li`
  background-color: ${(props) => props.theme.background.contrast};
  padding: 0.5rem;
  border-radius: 0.25rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`

const TimeStamp = styled.p`
  font-size: 0.75rem;
  color: ${(props) => props.theme.text.dim};
  margin-top: 0.25rem;
`

// Types
type ConversationsProps = Record<string, never>

export const Conversations: React.FC<ConversationsProps> = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

  // Fetch conversations on component mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const fetchedConversations =
          await ConversationService.getConversations()
        setConversations(fetchedConversations)
      } catch (error) {
        console.error('Failed to fetch conversations:', error)
      }
    }

    fetchConversations()
  }, [])

  const filteredConversations = useMemo(() => {
    if (!conversations) return []
    return conversations.filter((conversation) => {
      const matchesSearch =
        !searchTerm ||
        conversation.participants.some(
          (participant) =>
            participant.email
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            participant.name.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      const matchesStatus =
        !filterStatus || conversation.status === filterStatus

      return matchesSearch && matchesStatus
    })
  }, [searchTerm, filterStatus, conversations])

  // Event handlers for input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleStatusFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setFilterStatus(e.target.value)
  }

  // Handle viewing a conversation and fetching related messages
  const handleViewConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setIsSidebarOpen(true)

    try {
      const fetchedMessages =
        await ConversationService.getMessagesByConversationId(
          conversation.conversation_id,
        )
      setMessages(fetchedMessages)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false)
    setSelectedConversation(null)
    setMessages([])
  }

  const filterOptions = [
    { value: '', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
  ]

  return (
    <div>
      <h1>Conversations</h1>
      <FormInput label="Search by participant name or email">
        <TextInput
          value={searchTerm || ''}
          type="text"
          onChange={handleSearchChange}
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
            <th>Unread Messages</th>
            <th>Participants</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredConversations.map((conversation) => (
            <tr key={conversation.conversation_id}>
              <td>{conversation.conversation_id}</td>
              <td>{conversation.started_by}</td>
              <td>
                <DateTime timestamp={conversation.created_at} />
              </td>
              <td>{conversation.last_message}</td>
              <td>{conversation.status}</td>
              <td>{conversation.unread_messages}</td>
              <td>
                <div>
                  {conversation.participants &&
                  conversation.participants.length > 0
                    ? conversation.participants
                        .map((p) => `${p.name} (${p.email})`)
                        .join(', ')
                    : 'No participants'}
                </div>
              </td>
              <td>
                <Button
                  type="button"
                  onClick={() => handleViewConversation(conversation)}
                >
                  View
                </Button>
                <Button type="button">Close</Button>
              </td>
            </tr>
          ))}
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
              {selectedConversation.participants.map((participant, index) => (
                <Badge key={index} variant="info">
                  {participant.name} ({participant.email})
                </Badge>
              ))}
            </ParticipantsContainer>
            <MessagesTitle>Messages</MessagesTitle>
            {messages.length === 0 ? (
              <p>No messages found.</p>
            ) : (
              <MessageList>
                {messages
                  .sort(
                    (a, b) =>
                      new Date(b.sent_at).getTime() -
                      new Date(a.sent_at).getTime(),
                  )
                  .map((message, index) => (
                    <MessageItem key={index}>
                      <p>
                        <strong>{message.sender_name}:</strong>{' '}
                        {message.message_text}
                      </p>
                      <TimeStamp>
                        {new Date(message.sent_at).toLocaleString()}
                      </TimeStamp>
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

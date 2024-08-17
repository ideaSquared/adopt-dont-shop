import { Conversation } from '@adoptdontshop/libs/conversations'
import { fireEvent, render, screen } from '@testing-library/react'
import MessageSidebar from './MessageSidebar'

describe('MessageSidebar Component', () => {
  const mockConversations: Conversation[] = [
    {
      conversation_id: '123',
      started_by: 'Alice',
      last_message: 'See you tomorrow!',
      started_at: '',
      last_message_at: '',
      last_message_by: '',
      pet_id: '',
      status: '',
      unread_messages: 0,
      messages_count: 0,
      created_at: '',
      updated_at: '',
      participant_emails: [],
      participant_rescues: [],
      started_by_email: '',
      last_message_by_email: '',
    },
    {
      conversation_id: '456',
      started_by: 'Bob',
      last_message: 'Can we reschedule?',
      started_at: '',
      last_message_at: '',
      last_message_by: '',
      pet_id: '',
      status: '',
      unread_messages: 0,
      messages_count: 0,
      created_at: '',
      updated_at: '',
      participant_emails: [],
      participant_rescues: [],
      started_by_email: '',
      last_message_by_email: '',
    },
  ]

  const mockOnSelectConversation = jest.fn()

  afterEach(() => {
    jest.clearAllMocks() // Clear any previous mock calls
  })

  it('should render conversations', () => {
    render(
      <MessageSidebar
        conversations={mockConversations}
        onSelectConversation={mockOnSelectConversation}
      />,
    )

    // Check that each conversation's name and last message are rendered
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('See you tomorrow!')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Can we reschedule?')).toBeInTheDocument()
  })

  it('should call onSelectConversation with the correct id when a conversation is clicked', () => {
    render(
      <MessageSidebar
        conversations={mockConversations}
        onSelectConversation={mockOnSelectConversation}
      />,
    )

    // Simulate a click on the first conversation
    fireEvent.click(screen.getByText('Alice'))

    expect(mockOnSelectConversation).toHaveBeenCalledTimes(1)
    expect(mockOnSelectConversation).toHaveBeenCalledWith('123')

    // Simulate a click on the second conversation
    fireEvent.click(screen.getByText('Bob'))

    expect(mockOnSelectConversation).toHaveBeenCalledTimes(2)
    expect(mockOnSelectConversation).toHaveBeenCalledWith('456')
  })
})

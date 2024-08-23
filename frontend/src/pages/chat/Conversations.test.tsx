import {
  Conversation,
  ConversationService,
  Message,
} from '@adoptdontshop/libs/conversations'
import { fireEvent, render, screen } from '@testing-library/react'
import MainContainer from './Conversations'

// Mocking the ConversationService methods
jest.mock('@adoptdontshop/libs/conversations', () => ({
  ...jest.requireActual('@adoptdontshop/libs/conversations'),
  ConversationService: {
    getConversations: jest.fn(),
    getMessagesByConversationId: jest.fn(),
  },
}))

describe('MainContainer Component', () => {
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
      participants: [],
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
      participants: [],
      started_by_email: '',
      last_message_by_email: '',
    },
  ]

  const mockMessages: Message[] = [
    {
      sender_id: '1',
      sender_name: 'Alice',
      message_text: 'Hello!',
      sent_at: new Date().toISOString(),
      status: 'sent',
      conversation_id: '123',
    },
  ]

  beforeEach(() => {
    ;(ConversationService.getConversations as jest.Mock).mockReturnValue(
      mockConversations,
    )
    ;(
      ConversationService.getMessagesByConversationId as jest.Mock
    ).mockImplementation((id: string) => (id === '123' ? mockMessages : []))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render sidebar with conversations', () => {
    render(<MainContainer />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('should display messages when a conversation is selected', () => {
    render(<MainContainer />)

    // Simulate clicking on a conversation
    fireEvent.click(screen.getByText('Alice'))

    // Check that the correct messages are displayed
    expect(screen.getByText('Hello!')).toBeInTheDocument()
  })

  it('should add a new message when send button is clicked', () => {
    render(<MainContainer />)

    // Simulate clicking on a conversation
    fireEvent.click(screen.getByText('Alice'))

    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')

    // Simulate typing a message and sending it
    fireEvent.change(input, { target: { value: 'New message' } })
    fireEvent.click(sendButton)

    // Check that the new message is added to the chat
    expect(screen.getByText('New message')).toBeInTheDocument()
  })
})

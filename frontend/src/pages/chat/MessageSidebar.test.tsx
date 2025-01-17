import { fireEvent, render, screen } from '@testing-library/react'
import { MessageSidebar } from './MessageSidebar'

// ! This is feature flagged off for now, unsure it's going to be in MVP skipping
describe.skip('MessageSidebar Component', () => {
  // const mockConversations: Conversation[] = [
  //   {
  //     conversation_id: '123',
  //     started_by: 'Alice',
  //     last_message: 'See you tomorrow!',
  //     started_at: '',
  //     last_message_at: '',
  //     last_message_by: '',
  //     pet_id: '',
  //     status: '',
  //     unread_messages: 0,
  //     messages_count: 0,
  //     created_at: '',
  //     updated_at: '',
  //     participant_emails: [],
  //     participant_rescues: [],
  //     started_by_email: '',
  //     last_message_by_email: '',
  //   },
  //   {
  //     conversation_id: '456',
  //     started_by: 'Bob',
  //     last_message: 'Can we reschedule?',
  //     started_at: '',
  //     last_message_at: '',
  //     last_message_by: '',
  //     pet_id: '',
  //     status: '',
  //     unread_messages: 0,
  //     messages_count: 0,
  //     created_at: '',
  //     updated_at: '',
  //     participant_rescues: [],
  //     started_by_email: '',
  //     last_message_by_email: '',
  //   },
  // ]

  const mockOnSelectConversation = jest.fn()

  afterEach(() => {
    jest.clearAllMocks() // Clear any previous mock calls
  })

  it('should render conversations', () => {
    render(
      <MessageSidebar
        conversations={[]}
        selectedConversationId={null}
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
        conversations={[]}
        selectedConversationId={null}
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

  // TODO: Fix
  it.skip('should highlight the selected conversation', () => {
    render(
      <MessageSidebar
        conversations={[]}
        selectedConversationId={'123'}
        onSelectConversation={mockOnSelectConversation}
      />,
    )

    // Check that the selected conversation has the highlighted background color
    const selectedConversation = screen.getByText('Alice').closest('div')
    expect(selectedConversation).toHaveStyle('background-color: #d0e6ff')

    // Ensure the other conversation does not have the highlighted background color
    const otherConversation = screen.getByText('Bob').closest('div')
    expect(otherConversation).not.toHaveStyle('background-color: #d0e6ff')
  })
})

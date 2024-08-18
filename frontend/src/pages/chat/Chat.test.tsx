import { Message } from '@adoptdontshop/libs/conversations'
import { fireEvent, render, screen } from '@testing-library/react'
import Chat from './Chat'

describe('Chat Component', () => {
  const mockMessages: Message[] = [
    {
      sender_id: '1',
      sender_name: 'John Doe',
      message_text: 'Hello!',
      sent_at: new Date().toISOString(),
      status: 'sent',
      conversation_id: '12345',
    },
    {
      sender_id: '2',
      sender_name: 'Jane Smith',
      message_text: 'Hi there!',
      sent_at: new Date().toISOString(),
      status: 'sent',
      conversation_id: '12345',
    },
  ]

  const mockOnSendMessage = jest.fn()

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render messages', () => {
    render(
      <Chat
        messages={mockMessages}
        conversationId="12345"
        onSendMessage={mockOnSendMessage}
      />,
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Hello!')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('should call onSendMessage with the correct message when send button is clicked', () => {
    render(
      <Chat
        messages={mockMessages}
        conversationId="12345"
        onSendMessage={mockOnSendMessage}
      />,
    )

    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')

    // Simulate user typing a message
    fireEvent.change(input, { target: { value: 'This is a test message' } })
    fireEvent.click(sendButton)

    expect(mockOnSendMessage).toHaveBeenCalledTimes(1)
    expect(mockOnSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        sender_name: 'John Doe',
        message_text: 'This is a test message',
        conversation_id: '12345',
      }),
    )

    // Ensure input is cleared after sending
    expect(input).toHaveValue('')
  })

  it('should not send an empty message', () => {
    render(
      <Chat
        messages={mockMessages}
        conversationId="12345"
        onSendMessage={mockOnSendMessage}
      />,
    )

    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')

    // Simulate user clicking send with empty input
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(sendButton)

    expect(mockOnSendMessage).not.toHaveBeenCalled()
  })
})

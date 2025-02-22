import { Message } from '@adoptdontshop/libs/conversations'
import { fireEvent, render, screen } from '@testing-library/react'
import { Chat } from './Chat'

type MessageFormat = 'plain' | 'markdown' | 'html'

interface ExtendedMessage extends Message {
  content_format: MessageFormat
}

describe('Chat', () => {
  const mockMessages: ExtendedMessage[] = [
    {
      message_id: '1',
      chat_id: '123',
      sender_id: '1',
      content: 'Hello!',
      content_format: 'plain',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      User: {
        user_id: '1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      },
    },
    {
      message_id: '2',
      chat_id: '123',
      sender_id: '2',
      content: '<p>Hi there!</p>',
      content_format: 'html',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      User: {
        user_id: '2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
      },
    },
  ]

  const mockOnSendMessage = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders message list', () => {
    render(
      <Chat
        messages={mockMessages}
        conversationId="123"
        onSendMessage={mockOnSendMessage}
      />,
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Hello!')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('handles sending new message', () => {
    render(
      <Chat
        messages={mockMessages}
        conversationId="123"
        onSendMessage={mockOnSendMessage}
      />,
    )

    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')

    fireEvent.change(input, { target: { value: 'New message' } })
    fireEvent.click(sendButton)

    expect(mockOnSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        chat_id: '123',
        content: 'New message',
        content_format: 'html',
      }),
    )
  })

  it('disables send button when message is empty', () => {
    render(
      <Chat
        messages={mockMessages}
        conversationId="123"
        onSendMessage={mockOnSendMessage}
      />,
    )

    const sendButton = screen.getByText('Send')
    expect(sendButton).toBeDisabled()
  })

  it('renders messages with correct styling based on sender', () => {
    render(
      <Chat
        messages={mockMessages}
        conversationId="123"
        onSendMessage={mockOnSendMessage}
      />,
    )

    const currentUserMessage = screen.getByText('Hello!').closest('div')
    const otherUserMessage = screen.getByText('Hi there!').closest('div')

    expect(currentUserMessage).toHaveStyle({ backgroundColor: '#007bff' })
    expect(otherUserMessage).toHaveStyle({ backgroundColor: '#e1ffc7' })
  })

  it('sanitizes HTML content in messages', () => {
    const messagesWithMaliciousContent: ExtendedMessage[] = [
      {
        ...mockMessages[0],
        content: '<script>alert("xss")</script><p>Safe content</p>',
        content_format: 'html',
      },
    ]

    render(
      <Chat
        messages={messagesWithMaliciousContent}
        conversationId="123"
        onSendMessage={mockOnSendMessage}
      />,
    )

    expect(screen.queryByText('alert("xss")')).not.toBeInTheDocument()
    expect(screen.getByText('Safe content')).toBeInTheDocument()
  })

  it('displays message timestamps', () => {
    const now = new Date()
    const messagesWithTime: ExtendedMessage[] = [
      {
        ...mockMessages[0],
        created_at: now.toISOString(),
      },
    ]

    render(
      <Chat
        messages={messagesWithTime}
        conversationId="123"
        onSendMessage={mockOnSendMessage}
      />,
    )

    expect(screen.getByText(now.toLocaleTimeString())).toBeInTheDocument()
  })
})

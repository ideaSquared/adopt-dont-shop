import { Message } from '@adoptdontshop/libs/conversations'
import { act, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { io } from 'socket.io-client'
import { ChatContainer } from './ChatContainer'

jest.mock('socket.io-client')

type MessageFormat = 'plain' | 'markdown' | 'html'

interface ExtendedMessage extends Message {
  content_format: MessageFormat
}

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
]

const server = setupServer(
  http.get('/api/chats/:conversationId/messages', () => {
    return HttpResponse.json({ messages: mockMessages })
  }),
  http.post('/api/chats/:conversationId/messages', () => {
    return new HttpResponse(null, { status: 201 })
  }),
)

const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
}

beforeAll(() => {
  server.listen()
  ;(io as jest.Mock).mockImplementation(() => mockSocket)
})

afterEach(() => {
  server.resetHandlers()
  jest.clearAllMocks()
})

afterAll(() => server.close())

const renderWithRouter = (conversationId = '123') => {
  render(
    <MemoryRouter initialEntries={[`/chat/${conversationId}`]}>
      <Routes>
        <Route path="/chat/:conversationId" element={<ChatContainer />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ChatContainer', () => {
  it('fetches and displays messages', async () => {
    renderWithRouter()

    expect(screen.getByText('Loading messages...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('Loading messages...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Hello!')).toBeInTheDocument()
  })

  it('handles fetch error', async () => {
    server.use(
      http.get('/api/chats/:conversationId/messages', () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch messages')).toBeInTheDocument()
    })
  })

  it('sets up socket connection', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: expect.any(Object),
        }),
      )
    })

    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith(
      'new_message',
      expect.any(Function),
    )
    expect(mockSocket.on).toHaveBeenCalledWith(
      'message_updated',
      expect.any(Function),
    )
    expect(mockSocket.on).toHaveBeenCalledWith(
      'message_deleted',
      expect.any(Function),
    )
  })

  it('handles new message from socket', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument()
    })

    const newMessage: ExtendedMessage = {
      message_id: '2',
      chat_id: '123',
      sender_id: '2',
      content: 'Hi there!',
      content_format: 'plain',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      User: {
        user_id: '2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
      },
    }

    // Find the 'new_message' handler and call it
    const [[, connectHandler], [, newMessageHandler]] = mockSocket.on.mock.calls
    act(() => {
      connectHandler()
      newMessageHandler(newMessage)
    })

    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('handles message update from socket', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument()
    })

    const updatedMessage: ExtendedMessage = {
      ...mockMessages[0],
      content: 'Updated message',
    }

    const [[, connectHandler], , [, updateHandler]] = mockSocket.on.mock.calls
    act(() => {
      connectHandler()
      updateHandler(updatedMessage)
    })

    expect(screen.getByText('Updated message')).toBeInTheDocument()
    expect(screen.queryByText('Hello!')).not.toBeInTheDocument()
  })

  it('handles message deletion from socket', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument()
    })

    const [[, connectHandler], , , [, deleteHandler]] = mockSocket.on.mock.calls
    act(() => {
      connectHandler()
      deleteHandler(mockMessages[0].chat_id)
    })

    expect(screen.queryByText('Hello!')).not.toBeInTheDocument()
  })

  it('cleans up socket connection on unmount', async () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/chat/123']}>
        <Routes>
          <Route path="/chat/:conversationId" element={<ChatContainer />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument()
    })

    unmount()

    expect(mockSocket.emit).toHaveBeenCalledWith('leave_chat', '123')
    expect(mockSocket.disconnect).toHaveBeenCalled()
  })
})

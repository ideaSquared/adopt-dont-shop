import { Message } from '@adoptdontshop/libs/conversations'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

const ListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${(props) => props.theme.spacing.md};
  background-color: ${(props) => props.theme.background.body};
  scroll-behavior: smooth;
  display: flex;
  flex-direction: column;
  min-height: 0;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${(props) => props.theme.border.color.default};
    border-radius: ${(props) => props.theme.border.radius.full};
  }
`

const MessageGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  margin-top: auto;
`

const DateSeparator = styled.div`
  text-align: center;
  color: ${(props) => props.theme.text.dim};
  margin: 1rem 0;
  font-size: ${(props) => props.theme.typography.size.sm};
  position: sticky;
  top: 0;
  background: ${(props) => props.theme.background.body};
  padding: ${(props) => props.theme.spacing.xs} 0;
  z-index: 1;
`

interface MessageListProps {
  messages: Message[]
  renderMessage: (message: Message) => React.ReactNode
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  renderMessage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 })
  const scrollToBottomRef = useRef<HTMLDivElement>(null)

  // Group messages by date
  const groupedMessages = messages.reduce<{ [key: string]: Message[] }>(
    (groups, message) => {
      const date = new Date(message.created_at).toLocaleDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
      return groups
    },
    {},
  )

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const { scrollTop, clientHeight } = containerRef.current
    const bufferSize = 20 // Number of items to render above and below visible area

    // Calculate visible range based on scroll position
    const itemHeight = 100 // Estimated average height of a message
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize)
    const end = Math.min(
      messages.length,
      Math.ceil((scrollTop + clientHeight) / itemHeight) + bufferSize,
    )

    setVisibleRange({ start, end })
  }, [messages.length])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollToBottomRef.current) {
      scrollToBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      handleScroll() // Initial calculation
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
    }
  }, [messages.length, handleScroll])

  return (
    <ListContainer ref={containerRef}>
      <MessageGroup>
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <React.Fragment key={date}>
            <DateSeparator role="separator" aria-label={date}>
              {date}
            </DateSeparator>
            {dateMessages
              .slice(visibleRange.start, visibleRange.end)
              .map((message) => (
                <div key={message.message_id}>{renderMessage(message)}</div>
              ))}
          </React.Fragment>
        ))}
      </MessageGroup>
      <div ref={scrollToBottomRef} />
    </ListContainer>
  )
}

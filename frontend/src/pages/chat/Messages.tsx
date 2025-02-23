import React from 'react'
import styled from 'styled-components'

const MessagesWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`

const MessagesHeader = styled.div`
  padding: ${(props) => props.theme.spacing.md};
  border-bottom: 1px solid ${(props) => props.theme.border.color.default};
  background: ${(props) => props.theme.background.content};
`

const Title = styled.h2`
  margin: 0;
  font-size: ${(props) => props.theme.typography.size.lg};
  font-weight: ${(props) => props.theme.typography.weight.medium};
  color: ${(props) => props.theme.text.body};
`

const MessagesList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${(props) => props.theme.spacing.sm};

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

const MessageItem = styled.div<{ isActive?: boolean }>`
  padding: ${(props) => props.theme.spacing.md};
  border-radius: ${(props) => props.theme.border.radius.md};
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-bottom: ${(props) => props.theme.spacing.sm};
  background: ${(props) =>
    props.isActive
      ? props.theme.background.selected
      : props.theme.background.content};

  &:hover {
    background: ${(props) =>
      props.isActive
        ? props.theme.background.selected
        : props.theme.background.hover};
  }
`

type MessagesProps = {
  // Add any props you need
}

export const Messages: React.FC<MessagesProps> = () => {
  return (
    <MessagesWrapper>
      <MessagesHeader>
        <Title>Messages</Title>
      </MessagesHeader>
      <MessagesList>
        {/* Add your message items here */}
        <MessageItem>Message 1</MessageItem>
        <MessageItem isActive>Message 2</MessageItem>
        <MessageItem>Message 3</MessageItem>
      </MessagesList>
    </MessagesWrapper>
  )
}

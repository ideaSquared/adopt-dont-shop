import { Button, DropdownMenu } from '@adoptdontshop/components'
import { ConversationService } from '@adoptdontshop/libs/conversations'
import React from 'react'
import styled from 'styled-components'
import { useAlert } from '../../../contexts/alert/AlertContext'

const ActionsContainer = styled.div`
  display: inline-flex;
  align-items: center;
`

type MessageActionsProps = {
  messageId: string
  onMessageDeleted: () => void
  isAdmin?: boolean
  canDelete?: boolean
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  onMessageDeleted,
  isAdmin = false,
  canDelete = false,
}) => {
  const { showAlert } = useAlert()

  const handleDeleteMessage = async () => {
    try {
      if (isAdmin) {
        await ConversationService.deleteMessageAdmin(messageId)
      } else {
        await ConversationService.deleteMessage(messageId)
      }
      showAlert('Message deleted successfully', 'success')
      onMessageDeleted()
    } catch (error) {
      showAlert('Failed to delete message', 'error')
    }
  }

  if (!isAdmin && !canDelete) {
    return null
  }

  if (!isAdmin) {
    return (
      <Button variant="danger" onClick={handleDeleteMessage}>
        Delete
      </Button>
    )
  }

  const items = [
    {
      label: 'Delete Message',
      onClick: handleDeleteMessage,
    },
  ]

  return (
    <ActionsContainer>
      <DropdownMenu triggerLabel="Actions" items={items} />
    </ActionsContainer>
  )
}

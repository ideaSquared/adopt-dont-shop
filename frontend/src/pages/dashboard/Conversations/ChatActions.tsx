import { Button, DropdownMenu } from '@adoptdontshop/components'
import { ConversationService } from '@adoptdontshop/libs/conversations'
import React from 'react'
import styled from 'styled-components'
import { useAlert } from '../../../contexts/alert/AlertContext'

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

type ChatActionsProps = {
  chatId: string
  status: 'active' | 'locked' | 'archived'
  onStatusChange: () => void
  isAdmin?: boolean
}

export const ChatActions: React.FC<ChatActionsProps> = ({
  chatId,
  status,
  onStatusChange,
  isAdmin = false,
}) => {
  const { showAlert } = useAlert()

  const handleStatusChange = async (
    newStatus: 'active' | 'locked' | 'archived',
  ) => {
    try {
      await ConversationService.updateChatStatus(chatId, newStatus)
      showAlert('Chat status updated successfully', 'success')
      onStatusChange()
    } catch (error) {
      showAlert('Failed to update chat status', 'error')
    }
  }

  const handleDeleteChat = async () => {
    try {
      await ConversationService.deleteChat(chatId)
      showAlert('Chat deleted successfully', 'success')
      onStatusChange()
    } catch (error) {
      showAlert('Failed to delete chat', 'error')
    }
  }

  const getAdminItems = () => {
    const items = []

    if (status !== 'active') {
      items.push({
        label: 'Activate Chat',
        onClick: () => handleStatusChange('active'),
      })
    }

    if (status !== 'locked') {
      items.push({
        label: 'Lock Chat',
        onClick: () => handleStatusChange('locked'),
      })
    }

    if (status !== 'archived') {
      items.push({
        label: 'Archive Chat',
        onClick: () => handleStatusChange('archived'),
      })
    }

    items.push({
      label: 'Delete Chat',
      onClick: handleDeleteChat,
    })

    return items
  }

  if (!isAdmin) {
    if (status === 'active') {
      return (
        <Button
          variant="warning"
          onClick={() => handleStatusChange('archived')}
        >
          Archive
        </Button>
      )
    }
    return null
  }

  return (
    <ActionsContainer>
      <DropdownMenu triggerLabel="Actions" items={getAdminItems()} />
    </ActionsContainer>
  )
}

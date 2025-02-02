import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Button, Card, Table } from '../../../components'
import { useAlert } from '../../../contexts/alert/AlertContext'
import {
  deleteQuestionConfig,
  getAllQuestionConfigs,
} from '../../../services/applicationQuestionConfigService'
import { QuestionConfig } from '../../../types/applicationTypes'

const Container = styled.div`
  padding: 2rem;

  margin: 0 auto;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`

const Title = styled.h2`
  margin: 0;
  color: ${(props) => props.theme.text.body};
`

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
`

export const AdminQuestionConfigList: React.FC = () => {
  const [configs, setConfigs] = useState<QuestionConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10
  const navigate = useNavigate()
  const { showAlert } = useAlert()

  const fetchConfigs = useCallback(async () => {
    try {
      const response = await getAllQuestionConfigs()
      setConfigs(response)
    } catch (error) {
      showAlert('Failed to fetch question configurations', 'error')
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  const handleEdit = (configId: string) => {
    navigate(`/admin/applications/questions/${configId}`)
  }

  const handleDelete = async (configId: string) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      try {
        await deleteQuestionConfig(configId)
        showAlert('Question configuration deleted successfully', 'success')
        fetchConfigs()
      } catch (error) {
        showAlert('Failed to delete question configuration', 'error')
      }
    }
  }

  const handleCreate = () => {
    navigate('/admin/applications/questions/create')
  }

  if (loading) {
    return <div>Loading...</div>
  }

  const totalPages = Math.ceil(configs.length / rowsPerPage)

  return (
    <Container>
      <Card title="Application Question Configurations">
        <Header>
          <Button onClick={handleCreate} variant="content">
            Create New Configuration
          </Button>
        </Header>

        <Table
          striped
          hasActions
          rowsPerPage={rowsPerPage}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        >
          <thead>
            <tr>
              <th>Rescue ID</th>
              <th>Category</th>
              <th>Question Key</th>
              <th>Question Text</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config) => (
              <tr key={config.config_id}>
                <td>{config.rescue_id}</td>
                <td>{config.category}</td>
                <td>{config.question_key}</td>
                <td>{config.question_text}</td>
                <td>{config.question_type}</td>
                <td>{config.is_enabled ? 'Enabled' : 'Disabled'}</td>
                <td>
                  <ActionButtons>
                    <Button
                      onClick={() => handleEdit(config.config_id)}
                      variant="content"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(config.config_id)}
                      variant="danger"
                    >
                      Delete
                    </Button>
                  </ActionButtons>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </Container>
  )
}

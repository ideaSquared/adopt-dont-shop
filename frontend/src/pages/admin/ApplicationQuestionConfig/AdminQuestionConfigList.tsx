import { Button, Table, Tooltip } from '@adoptdontshop/components'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { Modal } from '../../../components'
import {
  CoreApplicationQuestion,
  QuestionUsageStats,
} from '../../../libs/applications/applicationTypes'
import * as coreQuestionService from '../../../libs/applications/coreQuestionService'

const Container = styled.div`
  padding: 1rem;
`

const Title = styled.h1`
  margin-bottom: 2rem;
  font-size: 1.8rem;
`

const TableContainer = styled.div`
  margin-top: 2rem;
`

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`

const CategoryBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background-color: ${(props) => props.theme.background.info};
  color: ${(props) => props.theme.text.info};
  font-size: 0.875rem;
`

const TypeBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background-color: ${(props) => props.theme.background.success};
  color: ${(props) => props.theme.text.success};
  font-size: 0.875rem;
`

const UsageStats = styled.div`
  font-size: 0.875rem;
  color: ${(props) => props.theme.text.dim};
`

const ErrorMessage = styled.div`
  color: ${(props) => props.theme.text.danger};
  margin-bottom: 1rem;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`

export const AdminQuestionConfigList: React.FC = () => {
  const [questions, setQuestions] = useState<CoreApplicationQuestion[]>([])
  const [usageStats, setUsageStats] = useState<
    Record<string, QuestionUsageStats>
  >({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedQuestion, setSelectedQuestion] =
    useState<CoreApplicationQuestion | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedQuestions = await coreQuestionService.getAllCoreQuestions()
      setQuestions(fetchedQuestions)

      // Fetch usage stats for each question
      const stats: Record<string, QuestionUsageStats> = {}
      await Promise.all(
        fetchedQuestions.map(async (question) => {
          const usage = await coreQuestionService.getCoreQuestionUsage(
            question.question_key,
          )
          stats[question.question_key] = usage
        }),
      )
      setUsageStats(stats)
    } catch (err) {
      setError('Failed to fetch questions')
      console.error('Error fetching questions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [])

  const handleDelete = async () => {
    if (!selectedQuestion) return

    try {
      setDeleteError(null)
      await coreQuestionService.deleteCoreQuestion(
        selectedQuestion.question_key,
      )
      await fetchQuestions()
      setDeleteDialogOpen(false)
      setSelectedQuestion(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setDeleteError(
        errorMessage.includes('in use by rescues')
          ? 'Cannot delete question that is being used by rescues'
          : 'Failed to delete question',
      )
    }
  }

  if (loading) {
    return <div>Loading questions...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <Container>
      <Title>Application Questions</Title>

      <Link to="/admin/applications/questions/new">
        <Button variant="success">Create New Question</Button>
      </Link>

      <TableContainer>
        <Table hasActions>
          <thead>
            <tr>
              <th>Question</th>
              <th>Category</th>
              <th>Type</th>
              <th>Usage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => {
              const usage = usageStats[question.question_key]
              return (
                <tr key={question.question_key}>
                  <td>{question.question_text}</td>
                  <td>
                    <CategoryBadge>
                      {question.category.replace(/_/g, ' ')}
                    </CategoryBadge>
                  </td>
                  <td>
                    <TypeBadge>{question.question_type}</TypeBadge>
                  </td>
                  <td>
                    <UsageStats>
                      Used by {usage?.total_rescues || 0} rescues
                      <br />
                      Enabled: {usage?.enabled_count || 0}
                      <br />
                      Required: {usage?.required_count || 0}
                    </UsageStats>
                  </td>
                  <td>
                    <ActionButtons>
                      <Link
                        to={`/admin/applications/questions/${question.question_key}/edit`}
                      >
                        <Button variant="info">Edit</Button>
                      </Link>
                      <Button
                        variant="danger"
                        onClick={() => {
                          setSelectedQuestion(question)
                          setDeleteDialogOpen(true)
                        }}
                        disabled={usage?.total_rescues > 0}
                      >
                        <Tooltip
                          content={
                            usage?.total_rescues > 0
                              ? 'Cannot delete question that is in use'
                              : 'Delete question'
                          }
                        >
                          <span>Delete</span>
                        </Tooltip>
                      </Button>
                    </ActionButtons>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </TableContainer>

      <Modal
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setSelectedQuestion(null)
          setDeleteError(null)
        }}
        title="Delete Question"
      >
        <div>
          <p>
            Are you sure you want to delete the question "
            {selectedQuestion?.question_text}"?
          </p>
          {deleteError && <ErrorMessage>{deleteError}</ErrorMessage>}
          <ButtonGroup>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
            <Button
              variant="info"
              onClick={() => {
                setDeleteDialogOpen(false)
                setSelectedQuestion(null)
                setDeleteError(null)
              }}
            >
              Cancel
            </Button>
          </ButtonGroup>
        </div>
      </Modal>
    </Container>
  )
}

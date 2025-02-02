import { Alert, Badge, Button, Card, DateTime } from '@adoptdontshop/components'
import {
  Application,
  ApplicationAnswers,
  QuestionCategory,
  ApplicationQuestionConfig as QuestionConfig,
} from '@adoptdontshop/libs/applications'
import ApplicationQuestionConfigService from '@adoptdontshop/libs/applications/ApplicationQuestionConfigService'
import ApplicationService from '@adoptdontshop/libs/applications/ApplicationService'
import { useUser } from 'contexts/auth/UserContext'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

type ApplicationReviewProps = {
  applicationId: string
}

type AnswerValue = string | boolean | string[] | number | undefined

interface DynamicAnswers extends ApplicationAnswers {
  [key: string]: AnswerValue
}

const Container = styled.div`
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
`

const Header = styled.div`
  margin-bottom: 2rem;
`

const ApplicationMeta = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
  padding: 1rem;
  background-color: ${({ theme }) => theme.background.content};
  border-radius: ${({ theme }) => theme.border.radius.md};
  border: 1px solid ${({ theme }) => theme.border.color.default};
`

const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const MetaLabel = styled.span`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.text.dim};
`

const MetaValue = styled.span`
  font-weight: 600;
`

const CategorySection = styled.section`
  margin-bottom: 2rem;
`

const CategoryTitle = styled.h2`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.text.body};
  font-size: 1.5rem;
  font-weight: 600;
`

const Separator = styled.hr`
  margin-bottom: 1rem;
  border: none;
  border-top: 1px solid ${({ theme }) => theme.border.color.default};
`

const QuestionCard = styled(Card)`
  margin-bottom: 1rem;
  padding: 1rem;
`

const QuestionText = styled.div`
  font-weight: bold;
  margin-bottom: 0.5rem;
`

const AnswerText = styled.div`
  white-space: pre-wrap;
  color: ${({ theme }) => theme.text.body};
  line-height: 1.5;
`

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`

const StatusBadge = styled(Badge)`
  text-transform: capitalize;
  font-size: 1rem;
  padding: 0.5rem 1rem;
`

const LoadingText = styled.p`
  color: ${({ theme }) => theme.text.body};
  text-align: center;
  padding: 2rem;
`

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const ModalContent = styled.div`
  background-color: ${({ theme }) => theme.background.content};
  padding: 2rem;
  border-radius: ${({ theme }) => theme.border.radius.md};
  max-width: 500px;
  width: 90%;
`

const formatCategoryName = (category: QuestionCategory): string => {
  return category
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

const formatDate = (date: string | Date | undefined): string => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatAnswer = (
  value: AnswerValue,
  type: QuestionConfig['question_type'],
): string => {
  if (value === undefined) {
    return 'No answer provided'
  }

  switch (type) {
    case 'BOOLEAN':
      return value ? 'Yes' : 'No'
    case 'MULTI_SELECT':
      return Array.isArray(value) ? value.join(', ') : String(value)
    default:
      return String(value)
  }
}

export const ApplicationReview: React.FC<ApplicationReviewProps> = ({
  applicationId,
}) => {
  const [application, setApplication] = useState<Application | null>(null)
  const [questions, setQuestions] = useState<QuestionConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const { user } = useUser()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // First fetch the application data
        const applicationData =
          await ApplicationService.getApplicationById(applicationId)
        if (!applicationData) {
          setError('Application not found')
          return
        }

        setApplication(applicationData)

        // Then fetch the question configs using the rescue_id from the application
        try {
          const questionsData =
            await ApplicationQuestionConfigService.getQuestionConfigsByRescueId(
              applicationData.rescue_id,
            )
          setQuestions(questionsData)
        } catch (questionsError) {
          console.error('Failed to load question configs:', questionsError)
          // Don't set error here as we still want to show the application data
        }
      } catch (error) {
        console.error('Failed to load application:', error)
        setError('Failed to load application details')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [applicationId])

  const handleStatusUpdate = async (newStatus: 'approved' | 'rejected') => {
    if (!application || !user) return

    setUpdating(true)
    try {
      const updatedApplication = await ApplicationService.updateApplication(
        applicationId,
        {
          status: newStatus,
          actioned_by: user.user_id,
        } as Partial<Application>,
      )

      setApplication(updatedApplication)
      setShowRejectModal(false)
    } catch (error) {
      console.error(`Failed to ${newStatus} application:`, error)
      setError(`Failed to ${newStatus} application`)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <LoadingText role="status" aria-live="polite">
        Loading application details...
      </LoadingText>
    )
  }

  if (error) {
    return (
      <Container>
        <Alert variant="error">{error}</Alert>
      </Container>
    )
  }

  if (!application) {
    return (
      <Container>
        <Alert variant="error">Application not found</Alert>
      </Container>
    )
  }

  const questionsByCategory = questions.reduce(
    (acc, question) => {
      if (!acc[question.category]) {
        acc[question.category] = []
      }
      acc[question.category].push(question)
      return acc
    },
    {} as Record<QuestionCategory, QuestionConfig[]>,
  )

  const answers = application.answers as DynamicAnswers

  return (
    <Container role="main" aria-labelledby="application-review-title">
      <Header>
        <h1 id="application-review-title">Application Review</h1>
        {error && <Alert variant="error">{error}</Alert>}
        <ApplicationMeta>
          <MetaItem>
            <MetaLabel>Status</MetaLabel>
            <StatusBadge
              variant={
                application.status === 'approved'
                  ? 'success'
                  : application.status === 'rejected'
                    ? 'danger'
                    : 'warning'
              }
            >
              {application.status}
            </StatusBadge>
          </MetaItem>
          <MetaItem>
            <MetaLabel>Applicant</MetaLabel>
            <MetaValue>{application.applicant_first_name || 'N/A'}</MetaValue>
          </MetaItem>
          <MetaItem>
            <MetaLabel>Pet Name</MetaLabel>
            <MetaValue>{application.pet_name || 'N/A'}</MetaValue>
          </MetaItem>
          <MetaItem>
            <MetaLabel>Submitted</MetaLabel>
            <MetaValue>
              <DateTime timestamp={application.created_at || 'N/A'} />
            </MetaValue>
          </MetaItem>
          {application.actioned_by && (
            <>
              <MetaItem>
                <MetaLabel>Reviewed By</MetaLabel>
                <MetaValue>
                  {application.actioned_by_first_name || 'N/A'}
                </MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaLabel>Review Date</MetaLabel>
                <MetaValue>
                  <DateTime timestamp={application.updated_at || 'N/A'} />
                </MetaValue>
              </MetaItem>
            </>
          )}
        </ApplicationMeta>

        {application.status === 'pending' && (
          <ActionButtons>
            <Button
              variant="success"
              onClick={() => handleStatusUpdate('approved')}
              disabled={updating}
            >
              {updating ? 'Approving...' : 'Approve Application'}
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowRejectModal(true)}
              disabled={updating}
            >
              {updating ? 'Rejecting...' : 'Reject Application'}
            </Button>
          </ActionButtons>
        )}
      </Header>

      {questions.length > 0 ? (
        Object.entries(questionsByCategory).map(
          ([category, categoryQuestions]) => (
            <CategorySection
              key={category}
              role="region"
              aria-labelledby={`category-${category}`}
            >
              <CategoryTitle id={`category-${category}`}>
                {formatCategoryName(category as QuestionCategory)}
              </CategoryTitle>
              <Separator />

              {categoryQuestions.map((question) => (
                <QuestionCard
                  key={question.config_id}
                  title={question.question_text}
                >
                  <QuestionText id={`question-${question.config_id}`}>
                    {question.question_text}
                    {question.is_required && (
                      <span style={{ color: 'red', marginLeft: '0.25rem' }}>
                        *
                      </span>
                    )}
                  </QuestionText>
                  <AnswerText>
                    {formatAnswer(
                      answers[question.question_key],
                      question.question_type,
                    )}
                  </AnswerText>
                </QuestionCard>
              ))}
            </CategorySection>
          ),
        )
      ) : (
        <Alert variant="warning">
          No question configuration found. The answers are shown below:
          <pre style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(answers, null, 2)}
          </pre>
        </Alert>
      )}

      {showRejectModal && (
        <Modal role="dialog" aria-modal="true">
          <ModalContent>
            <h2 id="reject-modal-title">Confirm Rejection</h2>
            <p id="reject-modal-description">
              Are you sure you want to reject this application? This action
              cannot be undone.
            </p>
            <ActionButtons>
              <Button
                variant="danger"
                onClick={() => handleStatusUpdate('rejected')}
                disabled={updating}
              >
                {updating ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
              <Button variant="info" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
            </ActionButtons>
          </ModalContent>
        </Modal>
      )}
    </Container>
  )
}

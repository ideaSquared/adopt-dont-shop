import { Badge, Button, Card } from '@adoptdontshop/components'
import {
  Application,
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

const Container = styled.div`
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
`

const CategorySection = styled.section`
  margin-bottom: 2rem;
`

const CategoryTitle = styled.h2`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.5rem;
  font-weight: 600;
`

const Separator = styled.hr`
  margin-bottom: 1rem;
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
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
`

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`

const StatusBadge = styled(Badge)`
  text-transform: capitalize;
`

const LoadingText = styled.p`
  color: ${({ theme }) => theme.colors.text};
`

const formatCategoryName = (category: QuestionCategory): string => {
  return category
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

export const ApplicationReview: React.FC<ApplicationReviewProps> = ({
  applicationId,
}) => {
  const [application, setApplication] = useState<Application | null>(null)
  const [questions, setQuestions] = useState<QuestionConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const { user } = useUser()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [applicationData, questionsData] = await Promise.all([
          ApplicationService.getApplicationById(applicationId),
          ApplicationQuestionConfigService.getQuestionConfigsByRescueId(
            application?.rescue_id || '',
          ),
        ])

        if (applicationData) {
          setApplication(applicationData)
          setQuestions(questionsData)
        }
      } catch (error) {
        console.error('Failed to load application details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [applicationId, application?.rescue_id])

  const handleStatusUpdate = async (newStatus: 'approved' | 'rejected') => {
    if (!application || !user) return

    setUpdating(true)
    try {
      const updatedApplication = await ApplicationService.updateApplication(
        applicationId,
        {
          status: newStatus,
          actioned_by: user.user_id,
        },
      )

      setApplication(updatedApplication)
      console.log(`Application ${newStatus} successfully`)
      setShowRejectModal(false)
    } catch (error) {
      console.error(`Failed to ${newStatus} application:`, error)
    } finally {
      setUpdating(false)
    }
  }

  if (loading || !application) {
    return (
      <LoadingText role="status" aria-live="polite">
        Loading application details...
      </LoadingText>
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

  return (
    <Container role="main" aria-labelledby="application-review-title">
      <h1 id="application-review-title">Application Review</h1>

      <p>
        Reviewing application for {application.pet_name} from{' '}
        {application.applicant_first_name}
      </p>

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

      {Object.entries(questionsByCategory).map(
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
                </QuestionText>
                <AnswerText>
                  {question.question_type === 'BOOLEAN'
                    ? application.answers[question.question_key]
                      ? 'Yes'
                      : 'No'
                    : question.question_type === 'MULTI_SELECT'
                      ? (application.answers[question.question_key] || []).join(
                          ', ',
                        )
                      : application.answers[question.question_key] ||
                        'No answer provided'}
                </AnswerText>
              </QuestionCard>
            ))}
          </CategorySection>
        ),
      )}

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

      {showRejectModal && (
        <div
          role="dialog"
          aria-labelledby="reject-modal-title"
          aria-describedby="reject-modal-description"
        >
          <h2 id="reject-modal-title">Confirm Rejection</h2>
          <p id="reject-modal-description">
            Are you sure you want to reject this application? This action cannot
            be undone.
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
        </div>
      )}
    </Container>
  )
}

import { Alert, Button, Card, CheckboxInput } from '@adoptdontshop/components'
import { useUser } from 'contexts/auth/UserContext'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import {
  QuestionCategory,
  RescueQuestionConfig,
} from '../../libs/applications/applicationTypes'
import * as RescueQuestionConfigService from '../../libs/applications/RescueQuestionConfigService'

type ApplicationQuestionConfigProps = {
  rescueId: string
}

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`

const Header = styled.div`
  margin-bottom: 2rem;
`

const Title = styled.h1`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.text.body};
  font-size: 1.8rem;
`

const Description = styled.p`
  color: ${({ theme }) => theme.text.dim};
  margin-bottom: 2rem;
`

const CategorySection = styled.section`
  margin-bottom: 3rem;
  background: ${({ theme }) => theme.background.content};
  padding: 2rem;
  border-radius: ${({ theme }) => theme.border.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.md};
`

const CategoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`

const CategoryTitle = styled.h2`
  color: ${({ theme }) => theme.text.body};
  font-size: 1.4rem;
  font-weight: 600;
`

const CategoryDescription = styled.p`
  color: ${({ theme }) => theme.text.dim};
  margin-bottom: 1.5rem;
`

const QuestionCard = styled(Card)`
  margin-bottom: 1rem;
  padding: 1.5rem;
  border: 1px solid ${({ theme }) => theme.border.color.default};
  transition: all 0.2s ease-in-out;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`

const QuestionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 2rem;
`

const QuestionText = styled.div`
  flex: 1;
  font-weight: 600;
  color: ${({ theme }) => theme.text.body};
`

const QuestionControls = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: center;
`

const QuestionMeta = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text.dim};
  margin-top: 0.5rem;
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  color: ${({ theme }) => theme.text.body};
`

const SaveButton = styled(Button)`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 10;
  padding: 1rem 2rem;
  font-size: 1.1rem;
`

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  color: ${({ theme }) => theme.text.dim};
`

const getCategoryDescription = (category: QuestionCategory): string => {
  switch (category) {
    case 'PERSONAL_INFORMATION':
      return 'Basic information about the applicant'
    case 'HOUSEHOLD_INFORMATION':
      return 'Details about the living situation and home environment'
    case 'PET_OWNERSHIP_EXPERIENCE':
      return 'Past and current experience with pets'
    case 'LIFESTYLE_COMPATIBILITY':
      return 'Information about daily routines and lifestyle'
    case 'PET_CARE_COMMITMENT':
      return 'Understanding of pet care responsibilities'
    case 'REFERENCES_VERIFICATION':
      return 'References and verification details'
    case 'FINAL_ACKNOWLEDGMENTS':
      return 'Final agreements and acknowledgments'
    default:
      return ''
  }
}

const formatCategoryName = (category: QuestionCategory): string => {
  return category
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

export const ApplicationQuestionConfig: React.FC<
  ApplicationQuestionConfigProps
> = ({ rescueId }) => {
  const [questions, setQuestions] = useState<RescueQuestionConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { rescue } = useUser()

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true)
        setError(null)
        const configs =
          await RescueQuestionConfigService.getRescueQuestionConfigs(rescueId)
        setQuestions(configs)
      } catch (error) {
        setError('Failed to load application questions')
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [rescueId])

  const handleQuestionChange = (
    configId: string,
    field: 'is_enabled' | 'is_required',
    value: boolean,
  ) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.config_id === configId ? { ...q, [field]: value } : q,
      ),
    )
    setHasChanges(true)
    setSuccessMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const updates = questions.map((q) => ({
        question_key: q.question_key,
        is_enabled: q.is_enabled,
        is_required: q.is_required,
      }))

      const results =
        await RescueQuestionConfigService.bulkUpdateRescueQuestionConfigs(
          rescueId,
          updates,
        )

      const allSuccessful = results.every((r) => r.success)
      if (allSuccessful) {
        setSuccessMessage('Questions updated successfully')
        setHasChanges(false)
      } else {
        setError('Some questions failed to update')
      }
    } catch (err) {
      setError('Failed to update application questions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <LoadingContainer role="status" aria-live="polite">
        Loading questions...
      </LoadingContainer>
    )
  }

  const questionsByCategory = questions.reduce(
    (acc, question) => {
      const category = question.rescueCoreQuestion.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(question)
      return acc
    },
    {} as Record<QuestionCategory, RescueQuestionConfig[]>,
  )

  return (
    <Container>
      <Header>
        <Title>Application Questions Configuration</Title>
        <Description>
          Customize your adoption application by enabling or disabling questions
          and marking them as required or optional. Changes will be applied to
          all new applications.
        </Description>
        {error && <Alert variant="error">{error}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}
      </Header>

      {Object.entries(questionsByCategory).map(
        ([category, categoryQuestions]) => (
          <CategorySection
            key={category}
            role="region"
            aria-labelledby={`category-${category}`}
          >
            <CategoryHeader>
              <div>
                <CategoryTitle id={`category-${category}`}>
                  {formatCategoryName(category as QuestionCategory)}
                </CategoryTitle>
                <CategoryDescription>
                  {getCategoryDescription(category as QuestionCategory)}
                </CategoryDescription>
              </div>
            </CategoryHeader>

            {categoryQuestions.map((question) => (
              <QuestionCard
                key={question.config_id}
                title={question.rescueCoreQuestion.question_text}
              >
                <QuestionHeader>
                  <QuestionText>
                    {question.rescueCoreQuestion.question_text}
                  </QuestionText>
                  <QuestionControls>
                    <CheckboxLabel>
                      <CheckboxInput
                        checked={question.is_enabled}
                        onChange={(e) =>
                          handleQuestionChange(
                            question.config_id,
                            'is_enabled',
                            e.target.checked,
                          )
                        }
                        aria-label={`Enable ${question.rescueCoreQuestion.question_text}`}
                      />
                      Enable
                    </CheckboxLabel>
                    {question.is_enabled && (
                      <CheckboxLabel>
                        <CheckboxInput
                          checked={question.is_required}
                          onChange={(e) =>
                            handleQuestionChange(
                              question.config_id,
                              'is_required',
                              e.target.checked,
                            )
                          }
                          aria-label={`Make ${question.rescueCoreQuestion.question_text} required`}
                        />
                        Required
                      </CheckboxLabel>
                    )}
                  </QuestionControls>
                </QuestionHeader>
                <QuestionMeta>
                  Type: {question.rescueCoreQuestion.question_type}
                  {question.rescueCoreQuestion.options &&
                    ` (Options: ${question.rescueCoreQuestion.options.join(', ')})`}
                </QuestionMeta>
              </QuestionCard>
            ))}
          </CategorySection>
        ),
      )}

      {hasChanges && (
        <SaveButton
          onClick={handleSave}
          disabled={saving}
          variant="success"
          aria-live="polite"
        >
          {saving ? 'Saving Changes...' : 'Save Changes'}
        </SaveButton>
      )}
    </Container>
  )
}

export default ApplicationQuestionConfig

import {
  QuestionCategory,
  ApplicationQuestionConfig as QuestionConfig,
} from '@adoptdontshop/libs/applications'
import ApplicationQuestionConfigService from '@adoptdontshop/libs/applications/ApplicationQuestionConfigService'
import { useUser } from 'contexts/auth/UserContext'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { Alert, Button, Card, CheckboxInput } from '../../components'

type ApplicationQuestionConfigProps = {
  rescueId: string
}

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`

const CategorySection = styled.section`
  margin-bottom: 2rem;
`

const QuestionCard = styled(Card)`
  margin-bottom: 1rem;
  padding: 1rem;
`

const QuestionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`

const QuestionControls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
`

const SaveButton = styled(Button)`
  margin-top: 2rem;
`

const CategoryHeading = styled.h2`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.primary};
`

const formatCategoryName = (category: QuestionCategory): string => {
  return category
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

export const ApplicationQuestionConfig: React.FC<
  ApplicationQuestionConfigProps
> = ({ rescueId }) => {
  const [questions, setQuestions] = useState<QuestionConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { rescue } = useUser()

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const configs =
          await ApplicationQuestionConfigService.getQuestionConfigsByRescueId(
            rescueId,
          )
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
      prev.map((q: QuestionConfig) =>
        q.config_id === configId ? { ...q, [field]: value } : q,
      ),
    )
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = questions.map((q: QuestionConfig) => ({
        question_key: q.question_key,
        is_enabled: q.is_enabled,
        is_required: q.is_required,
      }))

      const results =
        await ApplicationQuestionConfigService.bulkUpdateQuestionConfigs(
          rescueId,
          updates,
        )

      const allSuccessful = results.every(
        (r: { success: boolean }) => r.success,
      )
      if (allSuccessful) {
        setError(null)
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
    return <div>Loading questions...</div>
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
    <Container>
      <h1>Application Questions Configuration</h1>
      <p>
        Configure which questions to include in your adoption application and
        whether they are required.
      </p>

      {error && <Alert variant="error">{error}</Alert>}

      {Object.entries(questionsByCategory).map(
        ([category, categoryQuestions]) => (
          <CategorySection key={category}>
            <h2>{formatCategoryName(category as QuestionCategory)}</h2>
            <hr />

            {categoryQuestions.map((question) => (
              <Card key={question.config_id} title={question.question_text}>
                <QuestionHeader>
                  <div>{question.question_text}</div>
                  <QuestionControls>
                    <CheckboxLabel>
                      <CheckboxInput
                        checked={question.is_enabled}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleQuestionChange(
                            question.config_id,
                            'is_enabled',
                            e.target.checked,
                          )
                        }
                      />
                      Enabled
                    </CheckboxLabel>
                    {question.is_enabled && (
                      <CheckboxLabel>
                        <CheckboxInput
                          checked={question.is_required}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleQuestionChange(
                              question.config_id,
                              'is_required',
                              e.target.checked,
                            )
                          }
                        />
                        Required
                      </CheckboxLabel>
                    )}
                  </QuestionControls>
                </QuestionHeader>
                <small>
                  Type: {question.question_type}
                  {question.options && ` (${question.options.join(', ')})`}
                </small>
              </Card>
            ))}
          </CategorySection>
        ),
      )}

      {hasChanges && (
        <SaveButton onClick={handleSave} disabled={saving} variant="success">
          {saving ? 'Saving...' : 'Save Changes'}
        </SaveButton>
      )}
    </Container>
  )
}

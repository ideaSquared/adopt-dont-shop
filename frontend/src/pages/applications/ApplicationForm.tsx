import {
  Alert,
  Button,
  CheckboxInput,
  FormInput,
  SelectInput,
  TextInput,
} from '@adoptdontshop/components'
import ApplicationService from '@adoptdontshop/libs/applications/ApplicationService'
import { useUser } from 'contexts/auth/UserContext'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import {
  QuestionCategory,
  RescueQuestionConfig,
} from '../../libs/applications/applicationTypes'
import * as RescueQuestionConfigService from '../../libs/applications/rescueQuestionConfigService'

type ApplicationFormProps = {
  rescueId: string
  petId: string
}

type FormAnswers = Record<string, any>

const Container = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`

const CategorySection = styled.section`
  margin-bottom: 2rem;
`

const CategoryHeading = styled.h2`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.text.body};
`

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
`

const ErrorText = styled.span`
  color: ${({ theme }) => theme.text.danger};
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
`

const formatCategoryName = (category: QuestionCategory): string => {
  return category
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  rescueId,
  petId,
}) => {
  const [questions, setQuestions] = useState<RescueQuestionConfig[]>([])
  const [answers, setAnswers] = useState<FormAnswers>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<
    Array<{
      question_key: string
      question_text: string
    }>
  >([])
  const { user } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const configs =
          await RescueQuestionConfigService.getRescueQuestionConfigs(rescueId)
        setQuestions(configs.filter((q) => q.is_enabled))
      } catch (error) {
        setError('Failed to load application questions')
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [rescueId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setValidationErrors([])

    try {
      // Validate answers
      const validation =
        await RescueQuestionConfigService.validateApplicationAnswers(
          rescueId,
          answers,
        )

      if (!validation.isValid) {
        setValidationErrors(validation.missingRequiredAnswers)
        return
      }

      // Create application
      const application = await ApplicationService.createApplication({
        rescue_id: rescueId,
        pet_id: petId,
        answers,
      })

      // Navigate to success page
      navigate(`/applications/${application.application_id}`)
    } catch (error: any) {
      if (error.response?.data?.missingRequiredAnswers) {
        setValidationErrors(error.response.data.missingRequiredAnswers)
      } else {
        setError('Failed to submit application')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleAnswerChange = (questionKey: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionKey]: value,
    }))
  }

  const renderQuestionInput = (question: RescueQuestionConfig) => {
    if (!question.rescueCoreQuestion) {
      console.error('Missing rescueCoreQuestion data for question:', question)
      return null
    }

    switch (question.rescueCoreQuestion.question_type) {
      case 'TEXT':
        return (
          <FormInput label={question.rescueCoreQuestion.question_text}>
            <TextInput
              type="text"
              value={answers[question.question_key] || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleAnswerChange(question.question_key, e.target.value)
              }
            />
          </FormInput>
        )
      case 'EMAIL':
        return (
          <FormInput label={question.rescueCoreQuestion.question_text}>
            <TextInput
              type="email"
              value={answers[question.question_key] || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleAnswerChange(question.question_key, e.target.value)
              }
            />
          </FormInput>
        )
      case 'PHONE':
        return (
          <FormInput label={question.rescueCoreQuestion.question_text}>
            <TextInput
              type="tel"
              value={answers[question.question_key] || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleAnswerChange(question.question_key, e.target.value)
              }
            />
          </FormInput>
        )
      case 'NUMBER':
        return (
          <FormInput label={question.rescueCoreQuestion.question_text}>
            <TextInput
              type="number"
              value={answers[question.question_key] || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleAnswerChange(question.question_key, e.target.value)
              }
            />
          </FormInput>
        )
      case 'BOOLEAN':
        return (
          <FormInput label={question.rescueCoreQuestion.question_text}>
            <CheckboxInput
              checked={Boolean(answers[question.question_key])}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleAnswerChange(question.question_key, e.target.checked)
              }
            />
          </FormInput>
        )
      case 'SELECT':
        return (
          <FormInput label={question.rescueCoreQuestion.question_text}>
            <SelectInput
              options={
                question.rescueCoreQuestion.options?.map((option: string) => ({
                  value: option,
                  label: option,
                })) || []
              }
              value={answers[question.question_key] || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                handleAnswerChange(question.question_key, e.target.value)
              }
              placeholder="Select an option"
            />
          </FormInput>
        )
      case 'MULTI_SELECT':
        return (
          <FormInput label={question.rescueCoreQuestion.question_text}>
            <div>
              {question.rescueCoreQuestion.options?.map((option: string) => (
                <div key={option}>
                  <CheckboxInput
                    checked={(answers[question.question_key] || []).includes(
                      option,
                    )}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const currentValues = answers[question.question_key] || []
                      const newValues = e.target.checked
                        ? [...currentValues, option]
                        : currentValues.filter((v: string) => v !== option)
                      handleAnswerChange(question.question_key, newValues)
                    }}
                  />
                  <span>{option}</span>
                </div>
              ))}
            </div>
          </FormInput>
        )
      default:
        return null
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  const questionsByCategory = questions.reduce<
    Record<QuestionCategory, RescueQuestionConfig[]>
  >(
    (acc, question) => {
      if (!question.rescueCoreQuestion) {
        console.error('Missing rescueCoreQuestion data for question:', question)
        return acc
      }

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
      <h1>Pet Adoption Application</h1>
      <p>
        Please fill out all required fields in this application form. Your
        responses will help us ensure the best possible match between you and
        your potential pet.
      </p>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        {validationErrors.length > 0 && (
          <Alert variant="error">
            Please fill in the following required fields:
            <ul>
              {validationErrors.map((error) => (
                <li key={error.question_key}>{error.question_text}</li>
              ))}
            </ul>
          </Alert>
        )}

        {Object.entries(questionsByCategory).map(
          ([category, categoryQuestions]) => (
            <CategorySection key={category}>
              <CategoryHeading>
                {formatCategoryName(category as QuestionCategory)}
              </CategoryHeading>
              <hr />

              {categoryQuestions.map((question) => (
                <FormGroup key={question.question_key}>
                  {question.rescueCoreQuestion ? (
                    <label>
                      {question.rescueCoreQuestion.question_text}
                      {question.is_required && ' *'}
                    </label>
                  ) : (
                    <Alert variant="error">Missing question data</Alert>
                  )}
                  {renderQuestionInput(question)}
                </FormGroup>
              ))}
            </CategorySection>
          ),
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Application'}
        </Button>
      </form>
    </Container>
  )
}

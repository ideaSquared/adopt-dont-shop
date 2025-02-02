import {
  Alert,
  Button,
  CheckboxInput,
  FormInput,
  SelectInput,
  TextInput,
} from '@adoptdontshop/components'
import {
  Application,
  ApplicationAnswers as IApplicationAnswers,
  QuestionCategory,
  ApplicationQuestionConfig as QuestionConfig,
} from '@adoptdontshop/libs/applications'
import ApplicationQuestionConfigService from '@adoptdontshop/libs/applications/ApplicationQuestionConfigService'
import ApplicationService from '@adoptdontshop/libs/applications/ApplicationService'
import { useUser } from 'contexts/auth/UserContext'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

type ApplicationFormProps = {
  rescueId: string
  petId: string
}

type FormAnswers = {
  [key: string]: string | boolean | string[] | number
}

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
  const [questions, setQuestions] = useState<QuestionConfig[]>([])
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
          await ApplicationQuestionConfigService.getQuestionConfigsByRescueId(
            rescueId,
          )
        setQuestions(configs.filter((q) => q.is_enabled))
      } catch (error) {
        setError('Failed to load application questions')
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [rescueId])

  const handleAnswerChange = (
    questionKey: string,
    value: string | boolean | string[] | number,
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionKey]: value,
    }))
    setValidationErrors((prev) =>
      prev.filter((error) => error.question_key !== questionKey),
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Validate answers
      const validation =
        await ApplicationQuestionConfigService.validateApplicationAnswers(
          rescueId,
          answers,
        )

      if (!validation.isValid) {
        setValidationErrors(validation.missingRequiredAnswers)
        setError('Please fill in all required fields')
        return
      }

      // Submit application
      await ApplicationService.createApplication({
        rescue_id: rescueId,
        pet_id: petId,
        user_id: user!.user_id,
        answers: answers as unknown as IApplicationAnswers,
        status: 'pending',
      } as Partial<Application>)

      // Redirect to applications list
      navigate('/applications')
    } catch (err) {
      setError('Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const renderQuestionInput = (question: QuestionConfig) => {
    switch (question.question_type) {
      case 'TEXT':
        return (
          <FormInput label={question.question_text}>
            <TextInput
              type="text"
              value={answers[question.question_key]?.toString() || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleAnswerChange(question.question_key, e.target.value)
              }
              required={question.is_required}
            />
          </FormInput>
        )
      case 'EMAIL':
        return (
          <FormInput label={question.question_text}>
            <TextInput
              type="email"
              value={answers[question.question_key]?.toString() || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleAnswerChange(question.question_key, e.target.value)
              }
              required={question.is_required}
            />
          </FormInput>
        )
      case 'PHONE':
        return (
          <FormInput label={question.question_text}>
            <TextInput
              type="tel"
              value={answers[question.question_key]?.toString() || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleAnswerChange(question.question_key, e.target.value)
              }
              required={question.is_required}
            />
          </FormInput>
        )
      case 'NUMBER':
        return (
          <FormInput label={question.question_text}>
            <TextInput
              type="number"
              value={answers[question.question_key]?.toString() || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleAnswerChange(
                  question.question_key,
                  parseInt(e.target.value, 10),
                )
              }
              required={question.is_required}
            />
          </FormInput>
        )
      case 'BOOLEAN':
        return (
          <CheckboxLabel>
            <CheckboxInput
              checked={Boolean(answers[question.question_key])}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleAnswerChange(question.question_key, e.target.checked)
              }
            />
            {question.question_text}
          </CheckboxLabel>
        )
      case 'SELECT':
        return (
          <FormInput label={question.question_text}>
            <SelectInput
              options={
                question.options?.map((option) => ({
                  value: option,
                  label: option,
                })) || []
              }
              value={answers[question.question_key]?.toString() || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                handleAnswerChange(question.question_key, e.target.value)
              }
              required={question.is_required}
              placeholder="Select an option"
            />
          </FormInput>
        )
      case 'MULTI_SELECT':
        return question.options?.map((option) => (
          <CheckboxLabel key={option}>
            <CheckboxInput
              checked={(
                (answers[question.question_key] as string[]) || []
              ).includes(option)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const currentValues =
                  (answers[question.question_key] as string[]) || []
                const newValues = e.target.checked
                  ? [...currentValues, option]
                  : currentValues.filter((v) => v !== option)
                handleAnswerChange(question.question_key, newValues)
              }}
            />
            {option}
          </CheckboxLabel>
        ))
      default:
        return null
    }
  }

  if (loading) {
    return <div>Loading application form...</div>
  }

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
        {Object.entries(
          questions.reduce(
            (acc, question) => {
              if (!acc[question.category]) {
                acc[question.category] = []
              }
              acc[question.category].push(question)
              return acc
            },
            {} as Record<QuestionCategory, QuestionConfig[]>,
          ),
        ).map(([category, categoryQuestions]) => (
          <CategorySection key={category}>
            <CategoryHeading>
              {formatCategoryName(category as QuestionCategory)}
            </CategoryHeading>
            <hr />

            {categoryQuestions.map((question) => (
              <FormGroup key={question.config_id}>
                {renderQuestionInput(question)}
                {validationErrors.some(
                  (error) => error.question_key === question.question_key,
                ) && <ErrorText>This field is required</ErrorText>}
              </FormGroup>
            ))}
          </CategorySection>
        ))}

        <Button type="submit" disabled={submitting} variant="success">
          {submitting ? 'Submitting...' : 'Submit Application'}
        </Button>
      </form>
    </Container>
  )
}

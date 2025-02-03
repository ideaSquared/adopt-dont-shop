import {
  Button,
  FormInput,
  SelectInput,
  TextInput,
} from '@adoptdontshop/components'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { useAlert } from '../../../contexts/alert/AlertContext'
import {
  QuestionCategory,
  QuestionType,
} from '../../../libs/applications/applicationTypes'
import * as coreQuestionService from '../../../libs/applications/coreQuestionService'

const Container = styled.div`
  padding: 1rem;
`

const Title = styled.h1`
  margin-bottom: 2rem;
  font-size: 1.8rem;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 600px;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
`

const OptionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const OptionRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const ErrorMessage = styled.div`
  color: ${(props) => props.theme.text.danger};
  margin-top: 0.5rem;
  font-size: 0.875rem;
`

const CATEGORY_OPTIONS = [
  { value: 'PERSONAL_INFORMATION', label: 'Personal Information' },
  { value: 'HOUSEHOLD_INFORMATION', label: 'Household Information' },
  { value: 'PET_OWNERSHIP_EXPERIENCE', label: 'Pet Ownership Experience' },
  { value: 'LIFESTYLE_COMPATIBILITY', label: 'Lifestyle Compatibility' },
  { value: 'PET_CARE_COMMITMENT', label: 'Pet Care Commitment' },
  { value: 'REFERENCES_VERIFICATION', label: 'References & Verification' },
  { value: 'FINAL_ACKNOWLEDGMENTS', label: 'Final Acknowledgments' },
]

const TYPE_OPTIONS = [
  { value: 'TEXT', label: 'Text' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Yes/No' },
  { value: 'SELECT', label: 'Single Select' },
  { value: 'MULTI_SELECT', label: 'Multi Select' },
  { value: 'ADDRESS', label: 'Address' },
]

export const AdminQuestionConfigForm: React.FC = () => {
  const { questionKey } = useParams<{ questionKey: string }>()
  const navigate = useNavigate()
  const { showAlert } = useAlert()
  const isEditing = !!questionKey

  const [formData, setFormData] = useState<{
    category: QuestionCategory
    question_type: QuestionType
    question_text: string
    options: string[]
  }>({
    category: 'PERSONAL_INFORMATION',
    question_type: 'TEXT',
    question_text: '',
    options: [''],
  })

  const [loading, setLoading] = useState(isEditing)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchQuestion = async () => {
      if (!questionKey) return

      try {
        setLoading(true)
        setError(null)
        const question =
          await coreQuestionService.getCoreQuestionByKey(questionKey)
        setFormData({
          category: question.category,
          question_type: question.question_type,
          question_text: question.question_text,
          options: question.options || [''],
        })
      } catch (err) {
        setError('Failed to fetch question')
        console.error('Error fetching question:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchQuestion()
  }, [questionKey])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (saving) return

    try {
      setSaving(true)
      setError(null)

      const data = {
        ...formData,
        options:
          formData.question_type === 'SELECT' ||
          formData.question_type === 'MULTI_SELECT'
            ? formData.options.filter(Boolean)
            : undefined,
      }

      if (isEditing) {
        await coreQuestionService.updateCoreQuestion(questionKey, data)
        showAlert('Question updated successfully', 'success')
      } else {
        await coreQuestionService.createCoreQuestion(data)
        showAlert('Question created successfully', 'success')
      }

      navigate('/admin/applications/questions')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      showAlert('Failed to save question', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value

    // Add new empty option if last option is being filled
    if (index === newOptions.length - 1 && value.trim() !== '') {
      newOptions.push('')
    }

    // Remove empty options except the last one
    if (index < newOptions.length - 1 && value.trim() === '') {
      newOptions.splice(index, 1)
    }

    setFormData((prev) => ({
      ...prev,
      options: newOptions,
    }))
  }

  if (loading) {
    return <div>Loading question...</div>
  }

  return (
    <Container>
      <Title>{isEditing ? 'Edit Question' : 'Create New Question'}</Title>

      <Form onSubmit={handleSubmit}>
        <FormInput label="Category">
          <SelectInput
            value={formData.category}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormData((prev) => ({
                ...prev,
                category: e.target.value as QuestionCategory,
              }))
            }
            options={CATEGORY_OPTIONS}
          />
        </FormInput>

        <FormInput label="Question Type">
          <SelectInput
            value={formData.question_type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormData((prev) => ({
                ...prev,
                question_type: e.target.value as QuestionType,
                options: [''],
              }))
            }
            options={TYPE_OPTIONS}
          />
        </FormInput>

        <FormInput label="Question Text">
          <TextInput
            value={formData.question_text}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev) => ({
                ...prev,
                question_text: e.target.value,
              }))
            }
            placeholder="Enter your question here"
            type="text"
            required
          />
        </FormInput>

        {(formData.question_type === 'SELECT' ||
          formData.question_type === 'MULTI_SELECT') && (
          <FormInput label="Options">
            <OptionsContainer>
              {formData.options.map((option, index) => (
                <OptionRow key={index}>
                  <TextInput
                    value={option}
                    type="text"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleOptionChange(index, e.target.value)
                    }
                    placeholder={`Option ${index + 1}`}
                  />
                  {index < formData.options.length - 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => {
                        const newOptions = [...formData.options]
                        newOptions.splice(index, 1)
                        setFormData((prev) => ({
                          ...prev,
                          options: newOptions,
                        }))
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </OptionRow>
              ))}
            </OptionsContainer>
          </FormInput>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ButtonGroup>
          <Button type="submit" variant="success" disabled={saving}>
            {saving
              ? 'Saving...'
              : isEditing
                ? 'Update Question'
                : 'Create Question'}
          </Button>
          <Button
            type="button"
            variant="info"
            onClick={() => navigate('/admin/applications/questions')}
          >
            Cancel
          </Button>
        </ButtonGroup>
      </Form>
    </Container>
  )
}

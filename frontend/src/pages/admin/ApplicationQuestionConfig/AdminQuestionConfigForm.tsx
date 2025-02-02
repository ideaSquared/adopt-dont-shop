import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import {
  Button,
  Card,
  CheckboxInput,
  FormInput,
  SelectInput,
  TextInput,
} from '../../../components'
import { useAlert } from '../../../contexts/alert/AlertContext'
import {
  createQuestionConfig,
  getQuestionConfigById,
  updateQuestionConfig,
} from '../../../services/applicationQuestionConfigService'
import { QuestionCategory, QuestionType } from '../../../types/applicationTypes'

const Container = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 0.5rem;
  border: 1px solid ${(props) => props.theme.border.color.default};
  border-radius: 0.25rem;
  font-size: 1rem;
  line-height: 1.5;
  color: ${(props) => props.theme.text.body};
  background-color: ${(props) => props.theme.background.content};

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.border.color.focus};
  }
`

const questionCategories = [
  {
    value: 'PERSONAL_INFORMATION' as QuestionCategory,
    label: 'Personal Information',
  },
  {
    value: 'HOUSEHOLD_INFORMATION' as QuestionCategory,
    label: 'Household Information',
  },
  {
    value: 'PET_OWNERSHIP_EXPERIENCE' as QuestionCategory,
    label: 'Pet Ownership Experience',
  },
  {
    value: 'LIFESTYLE_COMPATIBILITY' as QuestionCategory,
    label: 'Lifestyle Compatibility',
  },
  {
    value: 'PET_CARE_COMMITMENT' as QuestionCategory,
    label: 'Pet Care Commitment',
  },
  {
    value: 'REFERENCES_VERIFICATION' as QuestionCategory,
    label: 'References Verification',
  },
  {
    value: 'FINAL_ACKNOWLEDGMENTS' as QuestionCategory,
    label: 'Final Acknowledgments',
  },
]

const questionTypes = [
  { value: 'TEXT' as QuestionType, label: 'Text' },
  { value: 'EMAIL' as QuestionType, label: 'Email' },
  { value: 'PHONE' as QuestionType, label: 'Phone' },
  { value: 'NUMBER' as QuestionType, label: 'Number' },
  { value: 'BOOLEAN' as QuestionType, label: 'Boolean' },
  { value: 'SELECT' as QuestionType, label: 'Select' },
  { value: 'MULTI_SELECT' as QuestionType, label: 'Multi Select' },
  { value: 'ADDRESS' as QuestionType, label: 'Address' },
]

type FormData = {
  rescue_id: string
  question_key: string
  question_text: string
  category: QuestionCategory
  question_type: QuestionType
  is_enabled: boolean
  is_required: boolean
  options?: string[]
}

const initialFormData: FormData = {
  rescue_id: '',
  question_key: '',
  question_text: '',
  category: 'PERSONAL_INFORMATION',
  question_type: 'TEXT',
  is_enabled: true,
  is_required: false,
  options: [],
}

export const AdminQuestionConfigForm: React.FC = () => {
  const { configId } = useParams<{ configId: string }>()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(configId ? true : false)
  const { showAlert } = useAlert()

  useEffect(() => {
    const fetchConfig = async () => {
      if (configId) {
        try {
          const config = await getQuestionConfigById(configId)
          setFormData({
            rescue_id: config.rescue_id,
            question_key: config.question_key,
            question_text: config.question_text,
            category: config.category,
            question_type: config.question_type,
            is_enabled: config.is_enabled,
            is_required: config.is_required,
            options: config.options || [],
          })
        } catch (err) {
          showAlert('Failed to fetch question configuration', 'error')
          navigate('/admin/applications/questions')
        } finally {
          setLoading(false)
        }
      }
    }

    fetchConfig()
  }, [configId, navigate, showAlert])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (configId) {
        await updateQuestionConfig(configId, formData)
        showAlert('Question configuration updated successfully', 'success')
      } else {
        await createQuestionConfig(formData)
        showAlert('Question configuration created successfully', 'success')
      }
      navigate('/admin/applications/questions')
    } catch (err) {
      showAlert(
        configId
          ? 'Failed to update question configuration'
          : 'Failed to create question configuration',
        'error',
      )
    }
  }

  const handleChange = (name: string, value: string | boolean) => {
    if (name === 'category') {
      setFormData((prev) => ({ ...prev, [name]: value as QuestionCategory }))
    } else if (name === 'question_type') {
      setFormData((prev) => ({ ...prev, [name]: value as QuestionType }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleOptionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const options = e.target.value.split('\n').filter((option) => option.trim())
    setFormData((prev) => ({ ...prev, options }))
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Container>
      <Card
        title={
          configId
            ? 'Edit Question Configuration'
            : 'Create Question Configuration'
        }
      >
        <Form onSubmit={handleSubmit}>
          <FormInput label="Rescue ID">
            <TextInput
              type="text"
              name="rescue_id"
              value={formData.rescue_id}
              onChange={(e) => handleChange('rescue_id', e.target.value)}
              placeholder="Enter rescue ID"
              required
            />
          </FormInput>

          <FormInput label="Question Key">
            <TextInput
              type="text"
              name="question_key"
              value={formData.question_key}
              onChange={(e) => handleChange('question_key', e.target.value)}
              placeholder="Enter question key"
              required
            />
          </FormInput>

          <FormInput label="Question Text">
            <TextArea
              name="question_text"
              value={formData.question_text}
              onChange={(e) => handleChange('question_text', e.target.value)}
              placeholder="Enter question text"
              required
            />
          </FormInput>

          <FormInput label="Category">
            <SelectInput
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              options={questionCategories}
              required
            />
          </FormInput>

          <FormInput label="Question Type">
            <SelectInput
              value={formData.question_type}
              onChange={(e) => handleChange('question_type', e.target.value)}
              options={questionTypes}
              required
            />
          </FormInput>

          {(formData.question_type === 'SELECT' ||
            formData.question_type === 'MULTI_SELECT') && (
            <FormInput label="Options (one per line)">
              <TextArea
                value={formData.options?.join('\n') || ''}
                onChange={handleOptionsChange}
                placeholder="Enter options (one per line)"
                required
              />
            </FormInput>
          )}

          <FormInput label="Enabled">
            <CheckboxInput
              checked={formData.is_enabled}
              onChange={(e) => handleChange('is_enabled', e.target.checked)}
            />
          </FormInput>

          <FormInput label="Required">
            <CheckboxInput
              checked={formData.is_required}
              onChange={(e) => handleChange('is_required', e.target.checked)}
            />
          </FormInput>

          <ButtonGroup>
            <Button
              type="button"
              variant="content"
              onClick={() => navigate('/admin/applications/questions')}
            >
              Cancel
            </Button>
            <Button type="submit" variant="content">
              {configId ? 'Update' : 'Create'}
            </Button>
          </ButtonGroup>
        </Form>
      </Card>
    </Container>
  )
}

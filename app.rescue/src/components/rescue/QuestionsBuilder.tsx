import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Button, Card, Alert, SelectInput } from '@adopt-dont-shop/lib.components';
import { apiService } from '../../services/libraryServices';
import { getApiBaseUrl } from '../../utils/env';

// ─── Types ───────────────────────────────────────────────────────────────────

type QuestionType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'address'
  | 'date'
  | 'file';

type QuestionCategory =
  | 'personal_information'
  | 'household_information'
  | 'pet_ownership_experience'
  | 'lifestyle_compatibility'
  | 'pet_care_commitment'
  | 'references_verification'
  | 'final_acknowledgments';

type ConditionalLogic = {
  showWhen: {
    questionKey: string;
    operator: 'equals' | 'not_equals' | 'is_true' | 'is_false';
    value?: string | boolean | number;
  };
};

type Question = {
  questionId: string;
  rescueId: string | null;
  questionKey: string;
  scope: 'core' | 'rescue_specific';
  category: QuestionCategory;
  questionType: QuestionType;
  questionText: string;
  helpText: string | null;
  placeholder: string | null;
  options: string[] | null;
  validationRules: Record<string, unknown> | null;
  displayOrder: number;
  isEnabled: boolean;
  isRequired: boolean;
  conditionalLogic: ConditionalLogic | null;
};

type QuestionFormData = {
  questionKey: string;
  category: QuestionCategory;
  questionType: QuestionType;
  questionText: string;
  helpText: string;
  placeholder: string;
  isRequired: boolean;
  options: string;
  conditionalLogic: string;
};

type QuestionsBuilderProps = {
  rescueId: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  personal_information: 'Personal Information',
  household_information: 'Household Information',
  pet_ownership_experience: 'Pet Ownership Experience',
  lifestyle_compatibility: 'Lifestyle Compatibility',
  pet_care_commitment: 'Pet Care Commitment',
  references_verification: 'References & Verification',
  final_acknowledgments: 'Final Acknowledgments',
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Text (short answer)',
  email: 'Email address',
  phone: 'Phone number',
  number: 'Number',
  boolean: 'Yes / No',
  select: 'Single choice',
  multi_select: 'Multiple choice',
  address: 'Address',
  date: 'Date',
  file: 'File upload',
};

const QUESTION_TEMPLATES: Array<{ label: string; data: Partial<QuestionFormData> }> = [
  {
    label: 'Years of pet experience',
    data: {
      questionText: 'How many years of experience do you have owning pets?',
      questionType: 'number',
      category: 'pet_ownership_experience',
      isRequired: true,
    },
  },
  {
    label: 'Current living situation',
    data: {
      questionText: 'What is your current living situation?',
      questionType: 'text',
      category: 'household_information',
      placeholder: 'e.g. house with garden, apartment, shared rental',
      isRequired: true,
    },
  },
  {
    label: 'Hours alone per day',
    data: {
      questionText: 'How many hours per day would the pet be left alone?',
      questionType: 'number',
      category: 'lifestyle_compatibility',
      isRequired: true,
    },
  },
  {
    label: 'Vet reference file',
    data: {
      questionText: 'Please upload a reference from your current or previous veterinarian',
      questionType: 'file',
      category: 'references_verification',
      helpText: 'PDF or image files accepted',
      isRequired: false,
    },
  },
  {
    label: 'Acknowledgment of responsibilities',
    data: {
      questionText: 'Do you understand and accept the responsibilities of pet ownership?',
      questionType: 'boolean',
      category: 'final_acknowledgments',
      isRequired: true,
    },
  },
];

// ─── Styled Components ───────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }
`;

const QuestionCard = styled(Card)<{ $isCore?: boolean }>`
  padding: 1rem 1.25rem;
  background: ${props => (props.$isCore ? '#f9fafb' : '#ffffff')};
  border: 1px solid ${props => (props.$isCore ? '#d1d5db' : '#e5e7eb')};
  margin-bottom: 0.5rem;
  opacity: ${props => (props.$isCore ? 0.85 : 1)};
`;

const QuestionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
`;

const QuestionText = styled.div`
  flex: 1;

  p {
    margin: 0 0 0.25rem 0;
    font-size: 0.9375rem;
    font-weight: 500;
    color: #111827;
  }

  span {
    font-size: 0.8125rem;
    color: #6b7280;
  }
`;

const QuestionMeta = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
`;

const Badge = styled.span<{ $variant?: 'required' | 'optional' | 'type' | 'core' | 'disabled' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;

  ${props => {
    switch (props.$variant) {
      case 'required':
        return 'background: #fee2e2; color: #991b1b;';
      case 'optional':
        return 'background: #e5e7eb; color: #6b7280;';
      case 'type':
        return 'background: #eff6ff; color: #1d4ed8;';
      case 'core':
        return 'background: #fef9c3; color: #854d0e;';
      case 'disabled':
        return 'background: #f3f4f6; color: #9ca3af;';
      default:
        return 'background: #e5e7eb; color: #374151;';
    }
  }}
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
`;

const OrderControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const OrderButton = styled.button`
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
  cursor: pointer;
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    color: #374151;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const CategorySection = styled.div`
  margin-bottom: 2rem;

  h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 0.75rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e5e7eb;
  }
`;

const EmptyCategory = styled.div`
  padding: 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 0.5rem;
`;

const FormContainer = styled(Card)`
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 2px solid #3b82f6;
`;

const FormTitle = styled.h3`
  font-size: 1.0625rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1.25rem 0;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;

  &.full-width {
    grid-column: 1 / -1;
  }
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`;

const Input = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #1f2937;
  outline: none;

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const TextArea = styled.textarea`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #1f2937;
  outline: none;
  resize: vertical;
  min-height: 80px;

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #1f2937;
  outline: none;
  background: white;

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`;

const TemplatesSection = styled.div`
  margin-bottom: 1.5rem;

  h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 0.75rem 0;
  }
`;

const TemplateGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const TemplateButton = styled.button`
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  color: #374151;
  background: white;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
`;

const HelpText = styled.p`
  font-size: 0.8125rem;
  color: #6b7280;
  margin: 0.25rem 0 0 0;
`;

const ErrorText = styled.p`
  font-size: 0.8125rem;
  color: #dc2626;
  margin: 0.25rem 0 0 0;
`;

// ─── Default Form Values ──────────────────────────────────────────────────────

const defaultFormData: QuestionFormData = {
  questionKey: '',
  category: 'household_information',
  questionType: 'text',
  questionText: '',
  helpText: '',
  placeholder: '',
  isRequired: false,
  options: '',
  conditionalLogic: '',
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 100);

const parseOptions = (rawOptions: string): string[] | null => {
  if (!rawOptions.trim()) return null;
  return rawOptions
    .split('\n')
    .map(o => o.trim())
    .filter(Boolean);
};

const parseConditionalLogic = (raw: string): ConditionalLogic | null => {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as ConditionalLogic;
  } catch {
    return null;
  }
};

const questionsByCategory = (questions: Question[]): Map<QuestionCategory, Question[]> => {
  const map = new Map<QuestionCategory, Question[]>();
  const order: QuestionCategory[] = [
    'personal_information',
    'household_information',
    'pet_ownership_experience',
    'lifestyle_compatibility',
    'pet_care_commitment',
    'references_verification',
    'final_acknowledgments',
  ];
  for (const cat of order) {
    map.set(cat, []);
  }
  for (const q of questions) {
    const bucket = map.get(q.category) ?? [];
    bucket.push(q);
    map.set(q.category, bucket);
  }
  for (const [cat, qs] of map) {
    map.set(
      cat,
      [...qs].sort((a, b) => a.displayOrder - b.displayOrder)
    );
  }
  return map;
};

// ─── Component ────────────────────────────────────────────────────────────────

const QuestionsBuilder: React.FC<QuestionsBuilderProps> = ({ rescueId }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(defaultFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof QuestionFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const apiBase = getApiBaseUrl();

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get<{ questions: Question[] }>(
        `${apiBase}/api/v1/rescues/${rescueId}/questions`
      );
      setQuestions(response.questions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [rescueId, apiBase]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof QuestionFormData, string>> = {};

    if (!formData.questionText.trim() || formData.questionText.trim().length < 5) {
      errors.questionText = 'Question text must be at least 5 characters';
    }
    if (!formData.questionKey.trim()) {
      errors.questionKey = 'Question key is required';
    } else if (!/^[a-z0-9_]+$/.test(formData.questionKey)) {
      errors.questionKey = 'Only lowercase letters, numbers, and underscores allowed';
    }

    const needsOptions =
      formData.questionType === 'select' || formData.questionType === 'multi_select';
    if (needsOptions && !formData.options.trim()) {
      errors.options = 'Options are required for select question types';
    }

    if (formData.conditionalLogic.trim()) {
      try {
        JSON.parse(formData.conditionalLogic);
      } catch {
        errors.conditionalLogic = 'Must be valid JSON';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setFormData(defaultFormData);
    setFormErrors({});
    setShowForm(true);
  };

  const handleOpenEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      questionKey: question.questionKey,
      category: question.category,
      questionType: question.questionType,
      questionText: question.questionText,
      helpText: question.helpText ?? '',
      placeholder: question.placeholder ?? '',
      isRequired: question.isRequired,
      options: question.options ? question.options.join('\n') : '',
      conditionalLogic: question.conditionalLogic
        ? JSON.stringify(question.conditionalLogic, null, 2)
        : '',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingQuestion(null);
    setFormData(defaultFormData);
    setFormErrors({});
  };

  const handleFieldChange = (
    field: keyof QuestionFormData,
    value: string | boolean | QuestionType | QuestionCategory
  ) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'questionText' && !editingQuestion) {
        updated.questionKey = slugify(String(value));
      }
      return updated;
    });
    setFormErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleApplyTemplate = (template: (typeof QUESTION_TEMPLATES)[0]) => {
    setFormData(prev => ({
      ...prev,
      ...template.data,
      questionKey: slugify(template.data.questionText ?? ''),
      options: '',
      conditionalLogic: '',
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      questionKey: formData.questionKey,
      category: formData.category,
      questionType: formData.questionType,
      questionText: formData.questionText,
      helpText: formData.helpText || null,
      placeholder: formData.placeholder || null,
      isRequired: formData.isRequired,
      options: parseOptions(formData.options),
      conditionalLogic: parseConditionalLogic(formData.conditionalLogic),
    };

    try {
      if (editingQuestion) {
        await apiService.put(
          `${apiBase}/api/v1/rescues/${rescueId}/questions/${editingQuestion.questionId}`,
          payload
        );
        setSuccess('Question updated successfully');
      } else {
        await apiService.post(`${apiBase}/api/v1/rescues/${rescueId}/questions`, payload);
        setSuccess('Question created successfully');
      }
      handleCancel();
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (question: Question) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the question "${question.questionText}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setError(null);
    try {
      await apiService.delete(
        `${apiBase}/api/v1/rescues/${rescueId}/questions/${question.questionId}`
      );
      setSuccess('Question deleted successfully');
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete question');
    }
  };

  const handleToggleEnabled = async (question: Question) => {
    setError(null);
    try {
      await apiService.put(
        `${apiBase}/api/v1/rescues/${rescueId}/questions/${question.questionId}`,
        { isEnabled: !question.isEnabled }
      );
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update question');
    }
  };

  const handleMoveQuestion = async (
    question: Question,
    direction: 'up' | 'down',
    categoryQuestions: Question[]
  ) => {
    const currentIndex = categoryQuestions.findIndex(q => q.questionId === question.questionId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === categoryQuestions.length - 1)
    ) {
      return;
    }

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const swapQuestion = categoryQuestions[swapIndex];

    const reorderEntries = [
      { questionId: question.questionId, displayOrder: swapQuestion.displayOrder },
      { questionId: swapQuestion.questionId, displayOrder: question.displayOrder },
    ];

    setError(null);
    try {
      await apiService.patch(`${apiBase}/api/v1/rescues/${rescueId}/questions/reorder`, {
        questions: reorderEntries,
      });
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder questions');
    }
  };

  const needsOptions =
    formData.questionType === 'select' || formData.questionType === 'multi_select';
  const categorizedQuestions = questionsByCategory(questions);

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          Loading questions...
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader>
        <h2>Custom Application Questions</h2>
        {!showForm && (
          <Button onClick={handleOpenCreate} data-testid="add-question-btn">
            + Add Question
          </Button>
        )}
      </SectionHeader>

      {error && (
        <Alert variant="error" closable onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" closable onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {showForm && (
        <FormContainer data-testid="question-form">
          <FormTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</FormTitle>

          {!editingQuestion && (
            <TemplatesSection>
              <h4>Quick templates</h4>
              <TemplateGrid>
                {QUESTION_TEMPLATES.map(template => (
                  <TemplateButton
                    key={template.label}
                    type="button"
                    onClick={() => handleApplyTemplate(template)}
                    data-testid={`template-${template.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {template.label}
                  </TemplateButton>
                ))}
              </TemplateGrid>
            </TemplatesSection>
          )}

          <FormGrid>
            <FormGroup className="full-width">
              <Label htmlFor="question-text">Question text *</Label>
              <Input
                id="question-text"
                data-testid="question-text-input"
                value={formData.questionText}
                onChange={e => handleFieldChange('questionText', e.target.value)}
                placeholder="e.g. Do you have a garden or outdoor space?"
              />
              {formErrors.questionText && <ErrorText>{formErrors.questionText}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="question-category">Category *</Label>
              <Select
                id="question-category"
                data-testid="question-category-select"
                value={formData.category}
                onChange={e => handleFieldChange('category', e.target.value as QuestionCategory)}
              >
                {(Object.keys(CATEGORY_LABELS) as QuestionCategory[]).map(cat => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="question-type">Question type *</Label>
              <Select
                id="question-type"
                data-testid="question-type-select"
                value={formData.questionType}
                onChange={e => handleFieldChange('questionType', e.target.value as QuestionType)}
              >
                {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map(type => (
                  <option key={type} value={type}>
                    {QUESTION_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="question-key">Question key *</Label>
              <Input
                id="question-key"
                data-testid="question-key-input"
                value={formData.questionKey}
                onChange={e => handleFieldChange('questionKey', e.target.value)}
                placeholder="e.g. has_garden"
              />
              <HelpText>Unique identifier (auto-generated from question text)</HelpText>
              {formErrors.questionKey && <ErrorText>{formErrors.questionKey}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="question-placeholder">Placeholder text</Label>
              <Input
                id="question-placeholder"
                data-testid="question-placeholder-input"
                value={formData.placeholder}
                onChange={e => handleFieldChange('placeholder', e.target.value)}
                placeholder="Enter placeholder text..."
              />
            </FormGroup>

            <FormGroup className="full-width">
              <Label htmlFor="question-help">Help text</Label>
              <Input
                id="question-help"
                data-testid="question-help-input"
                value={formData.helpText}
                onChange={e => handleFieldChange('helpText', e.target.value)}
                placeholder="Additional guidance for the applicant..."
              />
            </FormGroup>

            {needsOptions && (
              <FormGroup className="full-width">
                <Label htmlFor="question-options">Options * (one per line)</Label>
                <TextArea
                  id="question-options"
                  data-testid="question-options-input"
                  value={formData.options}
                  onChange={e => handleFieldChange('options', e.target.value)}
                  placeholder={'Option 1\nOption 2\nOption 3'}
                  rows={4}
                />
                {formErrors.options && <ErrorText>{formErrors.options}</ErrorText>}
              </FormGroup>
            )}

            <FormGroup className="full-width">
              <Label htmlFor="conditional-logic">Conditional logic (optional, JSON)</Label>
              <TextArea
                id="conditional-logic"
                data-testid="conditional-logic-input"
                value={formData.conditionalLogic}
                onChange={e => handleFieldChange('conditionalLogic', e.target.value)}
                placeholder={'{"showWhen": {"questionKey": "has_pets", "operator": "is_true"}}'}
                rows={3}
              />
              <HelpText>Show this question only when a specific condition is met</HelpText>
              {formErrors.conditionalLogic && (
                <ErrorText>{formErrors.conditionalLogic}</ErrorText>
              )}
            </FormGroup>

            <FormGroup>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  data-testid="question-required-checkbox"
                  checked={formData.isRequired}
                  onChange={e => handleFieldChange('isRequired', e.target.checked)}
                />
                Required field
              </CheckboxLabel>
              <HelpText>Applicants must answer this question</HelpText>
            </FormGroup>
          </FormGrid>

          <FormActions>
            <Button variant="secondary" onClick={handleCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              data-testid="save-question-btn"
            >
              {submitting ? 'Saving...' : editingQuestion ? 'Update Question' : 'Add Question'}
            </Button>
          </FormActions>
        </FormContainer>
      )}

      {Array.from(categorizedQuestions.entries()).map(([category, categoryQs]) => {
        const rescueQs = categoryQs.filter(q => q.scope === 'rescue_specific');
        const coreQs = categoryQs.filter(q => q.scope === 'core');

        if (rescueQs.length === 0 && coreQs.length === 0) return null;

        return (
          <CategorySection key={category} data-testid={`category-${category}`}>
            <h3>{CATEGORY_LABELS[category]}</h3>

            {coreQs.map(question => (
              <QuestionCard key={question.questionId} $isCore>
                <QuestionHeader>
                  <QuestionText>
                    <p>{question.questionText}</p>
                    {question.helpText && <span>{question.helpText}</span>}
                    <QuestionMeta>
                      <Badge $variant="core">Core question</Badge>
                      <Badge $variant="type">{QUESTION_TYPE_LABELS[question.questionType]}</Badge>
                      {question.isRequired && <Badge $variant="required">Required</Badge>}
                      {!question.isRequired && <Badge $variant="optional">Optional</Badge>}
                    </QuestionMeta>
                  </QuestionText>
                </QuestionHeader>
              </QuestionCard>
            ))}

            {rescueQs.length === 0 && (
              <EmptyCategory>
                No custom questions in this section. Click &quot;+ Add Question&quot; to add one.
              </EmptyCategory>
            )}

            {rescueQs.map((question, index) => (
              <QuestionCard key={question.questionId} data-testid={`question-${question.questionId}`}>
                <QuestionHeader>
                  <OrderControls>
                    <OrderButton
                      onClick={() => handleMoveQuestion(question, 'up', rescueQs)}
                      disabled={index === 0}
                      aria-label="Move question up"
                      data-testid={`move-up-${question.questionId}`}
                    >
                      ▲
                    </OrderButton>
                    <OrderButton
                      onClick={() => handleMoveQuestion(question, 'down', rescueQs)}
                      disabled={index === rescueQs.length - 1}
                      aria-label="Move question down"
                      data-testid={`move-down-${question.questionId}`}
                    >
                      ▼
                    </OrderButton>
                  </OrderControls>

                  <QuestionText>
                    <p
                      style={{
                        textDecoration: question.isEnabled ? 'none' : 'line-through',
                        color: question.isEnabled ? '#111827' : '#9ca3af',
                      }}
                    >
                      {question.questionText}
                    </p>
                    {question.helpText && (
                      <span style={{ color: question.isEnabled ? '#6b7280' : '#d1d5db' }}>
                        {question.helpText}
                      </span>
                    )}
                    <QuestionMeta>
                      <Badge $variant="type">{QUESTION_TYPE_LABELS[question.questionType]}</Badge>
                      {question.isRequired && <Badge $variant="required">Required</Badge>}
                      {!question.isRequired && <Badge $variant="optional">Optional</Badge>}
                      {!question.isEnabled && <Badge $variant="disabled">Disabled</Badge>}
                      {question.conditionalLogic && <Badge>Conditional</Badge>}
                    </QuestionMeta>
                  </QuestionText>

                  <ActionButtons>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleToggleEnabled(question)}
                      data-testid={`toggle-${question.questionId}`}
                    >
                      {question.isEnabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleOpenEdit(question)}
                      data-testid={`edit-${question.questionId}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleDelete(question)}
                      data-testid={`delete-${question.questionId}`}
                    >
                      Delete
                    </Button>
                  </ActionButtons>
                </QuestionHeader>
              </QuestionCard>
            ))}
          </CategorySection>
        );
      })}
    </Container>
  );
};

export default QuestionsBuilder;

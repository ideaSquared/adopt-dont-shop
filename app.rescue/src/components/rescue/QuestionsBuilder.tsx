import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Alert } from '@adopt-dont-shop/lib.components';
import { apiService } from '../../services/libraryServices';
import { getApiBaseUrl } from '../../utils/env';
import * as styles from './QuestionsBuilder.css';

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
  if (!rawOptions.trim()) {
    return null;
  }
  return rawOptions
    .split('\n')
    .map(o => o.trim())
    .filter(Boolean);
};

const parseConditionalLogic = (raw: string): ConditionalLogic | null => {
  if (!raw.trim()) {
    return null;
  }
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
    if (!validateForm()) {
      return;
    }

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
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          Loading questions...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <h2>Custom Application Questions</h2>
        {!showForm && (
          <Button onClick={handleOpenCreate} data-testid="add-question-btn">
            + Add Question
          </Button>
        )}
      </div>

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
        <Card className={styles.formContainer} data-testid="question-form">
          <h3 className={styles.formTitle}>
            {editingQuestion ? 'Edit Question' : 'Add New Question'}
          </h3>

          {!editingQuestion && (
            <div className={styles.templatesSection}>
              <h4>Quick templates</h4>
              <div className={styles.templateGrid}>
                {QUESTION_TEMPLATES.map(template => (
                  <button
                    key={template.label}
                    type="button"
                    className={styles.templateButton}
                    onClick={() => handleApplyTemplate(template)}
                    data-testid={`template-${template.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.formGrid}>
            <div className={styles.formGroupFullWidth}>
              <label className={styles.label} htmlFor="question-text">
                Question text *
              </label>
              <input
                className={styles.input}
                id="question-text"
                data-testid="question-text-input"
                value={formData.questionText}
                onChange={e => handleFieldChange('questionText', e.target.value)}
                placeholder="e.g. Do you have a garden or outdoor space?"
              />
              {formErrors.questionText && (
                <p className={styles.errorText}>{formErrors.questionText}</p>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="question-category">
                Category *
              </label>
              <select
                className={styles.select}
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
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="question-type">
                Question type *
              </label>
              <select
                className={styles.select}
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
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="question-key">
                Question key *
              </label>
              <input
                className={styles.input}
                id="question-key"
                data-testid="question-key-input"
                value={formData.questionKey}
                onChange={e => handleFieldChange('questionKey', e.target.value)}
                placeholder="e.g. has_garden"
              />
              <p className={styles.helpText}>
                Unique identifier (auto-generated from question text)
              </p>
              {formErrors.questionKey && (
                <p className={styles.errorText}>{formErrors.questionKey}</p>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="question-placeholder">
                Placeholder text
              </label>
              <input
                className={styles.input}
                id="question-placeholder"
                data-testid="question-placeholder-input"
                value={formData.placeholder}
                onChange={e => handleFieldChange('placeholder', e.target.value)}
                placeholder="Enter placeholder text..."
              />
            </div>

            <div className={styles.formGroupFullWidth}>
              <label className={styles.label} htmlFor="question-help">
                Help text
              </label>
              <input
                className={styles.input}
                id="question-help"
                data-testid="question-help-input"
                value={formData.helpText}
                onChange={e => handleFieldChange('helpText', e.target.value)}
                placeholder="Additional guidance for the applicant..."
              />
            </div>

            {needsOptions && (
              <div className={styles.formGroupFullWidth}>
                <label className={styles.label} htmlFor="question-options">
                  Options * (one per line)
                </label>
                <textarea
                  className={styles.textArea}
                  id="question-options"
                  data-testid="question-options-input"
                  value={formData.options}
                  onChange={e => handleFieldChange('options', e.target.value)}
                  placeholder={'Option 1\nOption 2\nOption 3'}
                  rows={4}
                />
                {formErrors.options && <p className={styles.errorText}>{formErrors.options}</p>}
              </div>
            )}

            <div className={styles.formGroupFullWidth}>
              <label className={styles.label} htmlFor="conditional-logic">
                Conditional logic (optional, JSON)
              </label>
              <textarea
                className={styles.textArea}
                id="conditional-logic"
                data-testid="conditional-logic-input"
                value={formData.conditionalLogic}
                onChange={e => handleFieldChange('conditionalLogic', e.target.value)}
                placeholder={'{"showWhen": {"questionKey": "has_pets", "operator": "is_true"}}'}
                rows={3}
              />
              <p className={styles.helpText}>
                Show this question only when a specific condition is met
              </p>
              {formErrors.conditionalLogic && (
                <p className={styles.errorText}>{formErrors.conditionalLogic}</p>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  data-testid="question-required-checkbox"
                  checked={formData.isRequired}
                  onChange={e => handleFieldChange('isRequired', e.target.checked)}
                />
                Required field
              </label>
              <p className={styles.helpText}>Applicants must answer this question</p>
            </div>
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={handleCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} data-testid="save-question-btn">
              {submitting ? 'Saving...' : editingQuestion ? 'Update Question' : 'Add Question'}
            </Button>
          </div>
        </Card>
      )}

      {Array.from(categorizedQuestions.entries()).map(([category, categoryQs]) => {
        const rescueQs = categoryQs.filter(q => q.scope === 'rescue_specific');
        const coreQs = categoryQs.filter(q => q.scope === 'core');

        if (rescueQs.length === 0 && coreQs.length === 0) {
          return null;
        }

        return (
          <div
            key={category}
            className={styles.categorySection}
            data-testid={`category-${category}`}
          >
            <h3>{CATEGORY_LABELS[category]}</h3>

            {coreQs.map(question => (
              <Card key={question.questionId} className={styles.questionCard({ isCore: true })}>
                <div className={styles.questionHeader}>
                  <div className={styles.questionText}>
                    <p>{question.questionText}</p>
                    {question.helpText && <span>{question.helpText}</span>}
                    <div className={styles.questionMeta}>
                      <span className={styles.badge({ variant: 'core' })}>Core question</span>
                      <span className={styles.badge({ variant: 'type' })}>
                        {QUESTION_TYPE_LABELS[question.questionType]}
                      </span>
                      {question.isRequired && (
                        <span className={styles.badge({ variant: 'required' })}>Required</span>
                      )}
                      {!question.isRequired && (
                        <span className={styles.badge({ variant: 'optional' })}>Optional</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {rescueQs.length === 0 && (
              <div className={styles.emptyCategory}>
                No custom questions in this section. Click &quot;+ Add Question&quot; to add one.
              </div>
            )}

            {rescueQs.map((question, index) => (
              <Card
                key={question.questionId}
                className={styles.questionCard({ isCore: false })}
                data-testid={`question-${question.questionId}`}
              >
                <div className={styles.questionHeader}>
                  <div className={styles.orderControls}>
                    <button
                      className={styles.orderButton}
                      onClick={() => handleMoveQuestion(question, 'up', rescueQs)}
                      disabled={index === 0}
                      aria-label="Move question up"
                      data-testid={`move-up-${question.questionId}`}
                    >
                      ▲
                    </button>
                    <button
                      className={styles.orderButton}
                      onClick={() => handleMoveQuestion(question, 'down', rescueQs)}
                      disabled={index === rescueQs.length - 1}
                      aria-label="Move question down"
                      data-testid={`move-down-${question.questionId}`}
                    >
                      ▼
                    </button>
                  </div>

                  <div className={styles.questionText}>
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
                    <div className={styles.questionMeta}>
                      <span className={styles.badge({ variant: 'type' })}>
                        {QUESTION_TYPE_LABELS[question.questionType]}
                      </span>
                      {question.isRequired && (
                        <span className={styles.badge({ variant: 'required' })}>Required</span>
                      )}
                      {!question.isRequired && (
                        <span className={styles.badge({ variant: 'optional' })}>Optional</span>
                      )}
                      {!question.isEnabled && (
                        <span className={styles.badge({ variant: 'disabled' })}>Disabled</span>
                      )}
                      {question.conditionalLogic && (
                        <span className={styles.badge({})}>Conditional</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.actionButtons}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleEnabled(question)}
                      data-testid={`toggle-${question.questionId}`}
                    >
                      {question.isEnabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEdit(question)}
                      data-testid={`edit-${question.questionId}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(question)}
                      data-testid={`delete-${question.questionId}`}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default QuestionsBuilder;

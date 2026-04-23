import React from 'react';
import styled from 'styled-components';
import { HouseholdMembersField } from './HouseholdMembersField';

export type QuestionType =
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

export type Question = {
  questionId: string;
  questionKey: string;
  scope: 'core' | 'rescue_specific';
  category: string;
  questionType: QuestionType;
  questionText: string;
  helpText: string | null;
  placeholder: string | null;
  options: string[] | null;
  isRequired: boolean;
  isEnabled: boolean;
  displayOrder: number;
};

type QuestionFieldProps = {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
};

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1.25rem;
`;

const Label = styled.label`
  font-size: 0.9375rem;
  font-weight: 500;
  color: ${props => props.theme.text.primary};
`;

const RequiredMark = styled.span`
  color: ${props => props.theme.colors.semantic.error[500]};
  margin-left: 0.125rem;
`;

const HelpText = styled.p`
  font-size: 0.8125rem;
  color: ${props => props.theme.text.secondary};
  margin: 0;
`;

const baseInputStyles = `
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.9375rem;
  width: 100%;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;
`;

const Input = styled.input<{ $hasError?: boolean }>`
  ${baseInputStyles}
  border: 1px solid ${props =>
    props.$hasError ? props.theme.colors.semantic.error[500] : props.theme.border.color.primary};
  color: ${props => props.theme.text.primary};
  background: ${props => props.theme.background.primary};

  &:focus {
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary[100]};
  }
`;

const Select = styled.select<{ $hasError?: boolean }>`
  ${baseInputStyles}
  border: 1px solid ${props =>
    props.$hasError ? props.theme.colors.semantic.error[500] : props.theme.border.color.primary};
  color: ${props => props.theme.text.primary};
  background: ${props => props.theme.background.primary};
  cursor: pointer;

  &:focus {
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary[100]};
  }
`;

const TextArea = styled.textarea<{ $hasError?: boolean }>`
  ${baseInputStyles}
  border: 1px solid ${props =>
    props.$hasError ? props.theme.colors.semantic.error[500] : props.theme.border.color.primary};
  color: ${props => props.theme.text.primary};
  background: ${props => props.theme.background.primary};
  resize: vertical;
  min-height: 80px;

  &:focus {
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary[100]};
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  color: ${props => props.theme.text.primary};
  cursor: pointer;
`;

const ErrorText = styled.p`
  font-size: 0.8125rem;
  color: ${props => props.theme.colors.semantic.error[600]};
  margin: 0;
`;

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? (value as string[]) : [];

export const QuestionField: React.FC<QuestionFieldProps> = ({
  question,
  value,
  onChange,
  error,
}) => {
  const { questionType, questionKey, questionText, helpText, placeholder, options, isRequired } =
    question;

  const renderInput = () => {
    if (questionKey === 'household_members') {
      return <HouseholdMembersField value={value} onChange={onChange} hasError={!!error} />;
    }

    switch (questionType) {
      case 'boolean':
        return (
          <Select
            $hasError={!!error}
            value={value === true ? 'yes' : value === false ? 'no' : ''}
            onChange={e => {
              if (e.target.value === 'yes') {
                onChange(true);
              } else if (e.target.value === 'no') {
                onChange(false);
              } else {
                onChange(undefined);
              }
            }}
          >
            <option value=''>Select an option…</option>
            <option value='yes'>Yes</option>
            <option value='no'>No</option>
          </Select>
        );

      case 'select':
        return (
          <Select
            $hasError={!!error}
            value={asString(value)}
            onChange={e => onChange(e.target.value || undefined)}
          >
            <option value=''>Select an option…</option>
            {options?.map(opt => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        );

      case 'multi_select': {
        const selected = asStringArray(value);
        return (
          <CheckboxGroup>
            {options?.map(opt => (
              <CheckboxLabel key={opt}>
                <input
                  type='checkbox'
                  checked={selected.includes(opt)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...selected, opt]
                      : selected.filter(s => s !== opt);
                    onChange(next.length > 0 ? next : undefined);
                  }}
                />
                {opt}
              </CheckboxLabel>
            ))}
          </CheckboxGroup>
        );
      }

      case 'number':
        return (
          <Input
            type='number'
            $hasError={!!error}
            value={typeof value === 'number' ? value : ''}
            placeholder={placeholder ?? undefined}
            onChange={e => onChange(e.target.value !== '' ? Number(e.target.value) : undefined)}
          />
        );

      case 'date':
        return (
          <Input
            type='date'
            $hasError={!!error}
            value={asString(value)}
            onChange={e => onChange(e.target.value || undefined)}
          />
        );

      case 'address':
        return (
          <TextArea
            $hasError={!!error}
            value={asString(value)}
            placeholder={placeholder ?? undefined}
            rows={3}
            onChange={e => onChange(e.target.value || undefined)}
          />
        );

      case 'email':
        return (
          <Input
            type='email'
            $hasError={!!error}
            value={asString(value)}
            placeholder={placeholder ?? undefined}
            onChange={e => onChange(e.target.value || undefined)}
          />
        );

      case 'phone':
        return (
          <Input
            type='tel'
            $hasError={!!error}
            value={asString(value)}
            placeholder={placeholder ?? undefined}
            onChange={e => onChange(e.target.value || undefined)}
          />
        );

      case 'file':
        return (
          <Input
            type='file'
            $hasError={!!error}
            onChange={e => onChange(e.target.files?.[0]?.name ?? undefined)}
          />
        );

      default:
        return (
          <Input
            type='text'
            $hasError={!!error}
            value={asString(value)}
            placeholder={placeholder ?? undefined}
            onChange={e => onChange(e.target.value || undefined)}
          />
        );
    }
  };

  return (
    <FieldGroup>
      <Label>
        {questionText}
        {isRequired && <RequiredMark aria-hidden='true'>*</RequiredMark>}
      </Label>
      {helpText && <HelpText>{helpText}</HelpText>}
      {renderInput()}
      {error && <ErrorText role='alert'>{error}</ErrorText>}
    </FieldGroup>
  );
};

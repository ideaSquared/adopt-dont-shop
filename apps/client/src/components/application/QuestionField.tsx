import React from 'react';
import { TextArea } from '@adopt-dont-shop/lib.components';
import { BooleanTiles } from './BooleanTiles';
import * as styles from './QuestionField.css';
import { CurrentPetsField } from './CurrentPetsField';
import { HouseholdMembersField } from './HouseholdMembersField';
import { OptionTiles, getIconFor, hasIconMapping } from './OptionTiles';
import { PreFilledBadge } from './PreFilledBadge';

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
  isPrefilled?: boolean;
};

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? (value as string[]) : [];

export const QuestionField: React.FC<QuestionFieldProps> = ({
  question,
  value,
  onChange,
  error,
  isPrefilled = false,
}) => {
  const { questionType, questionKey, questionText, helpText, placeholder, options, isRequired } =
    question;

  // UX P2 F: surface required-state to assistive tech. The visible `*` is
  // aria-hidden (intentional — sighted users see a coloured glyph, screen
  // readers should not announce literal "asterisk"), so each control owns its
  // own aria-required to expose "required field" semantically.
  const ariaRequired = isRequired ? true : undefined;
  const ariaLabel = isRequired ? `${questionText} (required)` : undefined;

  const renderInput = () => {
    if (questionKey === 'household_members') {
      return <HouseholdMembersField value={value} onChange={onChange} hasError={!!error} />;
    }

    if (questionKey === 'current_pets') {
      return <CurrentPetsField value={value} onChange={onChange} hasError={!!error} />;
    }

    if (questionKey === 'why_adopt') {
      return (
        <TextArea
          value={asString(value)}
          placeholder={placeholder ?? undefined}
          rows={6}
          autoResize
          minRows={6}
          maxRows={20}
          showCharacterCount
          maxLength={2000}
          required={isRequired}
          error={error}
          fullWidth
          aria-label={ariaLabel}
          onChange={e => onChange(e.target.value || undefined)}
        />
      );
    }

    switch (questionType) {
      case 'boolean':
        return (
          <BooleanTiles
            name={questionKey}
            value={typeof value === 'boolean' ? value : undefined}
            onChange={onChange}
            hasError={!!error}
            isRequired={isRequired}
            ariaLabel={ariaLabel}
          />
        );

      case 'select':
        if (options && hasIconMapping(questionKey)) {
          return (
            <OptionTiles
              name={questionKey}
              options={options}
              value={asString(value) || undefined}
              onChange={next => onChange(next)}
              iconFor={getIconFor(questionKey)}
              hasError={!!error}
              isRequired={isRequired}
              ariaLabel={ariaLabel}
            />
          );
        }
        return (
          <select
            className={styles.select({ hasError: !!error })}
            value={asString(value)}
            onChange={e => onChange(e.target.value || undefined)}
            aria-required={ariaRequired}
            aria-label={ariaLabel}
          >
            <option value=''>Select an option…</option>
            {options?.map(opt => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'multi_select': {
        const selected = asStringArray(value);
        // aria-required is not supported on role="group"; surface required
        // semantics on each individual checkbox input instead.
        return (
          <div className={styles.checkboxGroup} role='group' aria-label={ariaLabel}>
            {options?.map(opt => (
              <label key={opt} className={styles.checkboxLabel}>
                <input
                  type='checkbox'
                  checked={selected.includes(opt)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...selected, opt]
                      : selected.filter(s => s !== opt);
                    onChange(next.length > 0 ? next : undefined);
                  }}
                  aria-required={ariaRequired}
                />
                {opt}
              </label>
            ))}
          </div>
        );
      }

      case 'number':
        return (
          <input
            type='number'
            className={styles.input({ hasError: !!error })}
            value={typeof value === 'number' ? value : ''}
            placeholder={placeholder ?? undefined}
            onChange={e => onChange(e.target.value !== '' ? Number(e.target.value) : undefined)}
            aria-required={ariaRequired}
            aria-label={ariaLabel}
          />
        );

      case 'date':
        return (
          <input
            type='date'
            className={styles.input({ hasError: !!error })}
            value={asString(value)}
            onChange={e => onChange(e.target.value || undefined)}
            aria-required={ariaRequired}
            aria-label={ariaLabel}
          />
        );

      case 'address':
        return (
          <textarea
            className={styles.textArea({ hasError: !!error })}
            value={asString(value)}
            placeholder={placeholder ?? undefined}
            rows={3}
            onChange={e => onChange(e.target.value || undefined)}
            aria-required={ariaRequired}
            aria-label={ariaLabel}
          />
        );

      case 'email':
        return (
          <input
            type='email'
            className={styles.input({ hasError: !!error })}
            value={asString(value)}
            placeholder={placeholder ?? undefined}
            onChange={e => onChange(e.target.value || undefined)}
            aria-required={ariaRequired}
            aria-label={ariaLabel}
          />
        );

      case 'phone':
        return (
          <input
            type='tel'
            className={styles.input({ hasError: !!error })}
            value={asString(value)}
            placeholder={placeholder ?? undefined}
            onChange={e => onChange(e.target.value || undefined)}
            aria-required={ariaRequired}
            aria-label={ariaLabel}
          />
        );

      case 'file':
        return (
          <input
            type='file'
            className={styles.input({ hasError: !!error })}
            onChange={e => onChange(e.target.files?.[0]?.name ?? undefined)}
            aria-required={ariaRequired}
            aria-label={ariaLabel}
          />
        );

      default:
        return (
          <input
            type='text'
            className={styles.input({ hasError: !!error })}
            value={asString(value)}
            placeholder={placeholder ?? undefined}
            onChange={e => onChange(e.target.value || undefined)}
            aria-required={ariaRequired}
            aria-label={ariaLabel}
          />
        );
    }
  };

  return (
    <div className={styles.fieldGroup}>
      <label className={styles.label}>
        {questionText}
        {isRequired && (
          <span className={styles.requiredMark} aria-hidden='true'>
            *
          </span>
        )}
        {isPrefilled && <PreFilledBadge />}
      </label>
      {helpText && <p className={styles.helpText}>{helpText}</p>}
      {renderInput()}
      {error && (
        <p className={styles.errorText} role='alert'>
          {error}
        </p>
      )}
    </div>
  );
};

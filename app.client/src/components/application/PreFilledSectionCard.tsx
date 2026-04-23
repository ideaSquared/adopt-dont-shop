import React, { useState } from 'react';
import styled from 'styled-components';
import { QuestionField, type Question } from './QuestionField';
import { formatHouseholdMembers, parseHouseholdMembers } from './HouseholdMembersField';

type Props = {
  icon: string;
  title: string;
  questions: Question[];
  answers: Record<string, unknown>;
  prefilledKeys: ReadonlySet<string>;
  onChange: (answers: Record<string, unknown>) => void;
  initiallyExpanded?: boolean;
  emptyHint?: string;
};

const Card = styled.section`
  margin-bottom: 1rem;
  background: ${props => props.theme.background.primary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 0.75rem;
  overflow: hidden;
`;

const Header = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem 1.25rem;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: ${props => props.theme.text.primary};

  &:hover {
    background: ${props => props.theme.background.secondary};
  }
`;

const IconWrap = styled.span`
  font-size: 1.25rem;
  line-height: 1;
`;

const TitleWrap = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
`;

const Summary = styled.p`
  margin: 0.125rem 0 0 0;
  font-size: 0.8125rem;
  color: ${props => props.theme.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const Chevron = styled.span<{ $expanded: boolean }>`
  font-size: 0.8125rem;
  color: ${props => props.theme.text.secondary};
  transition: transform 0.15s ease;
  transform: rotate(${props => (props.$expanded ? 180 : 0)}deg);
`;

const AttentionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  margin-left: 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${props => props.theme.colors.semantic.warning[700]};
  background: ${props => props.theme.colors.semantic.warning[50]};
  border: 1px solid ${props => props.theme.colors.semantic.warning[200]};
  border-radius: 9999px;
  vertical-align: middle;
`;

const Body = styled.div`
  padding: 0 1.25rem 1.25rem;
  border-top: 1px solid ${props => props.theme.border.color.primary};
  padding-top: 1rem;
`;

const hasAnswer = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
};

const formatAnswerPreview = (value: unknown): string => {
  if (!hasAnswer(value)) {
    return '—';
  }
  if (value === true) {
    return 'Yes';
  }
  if (value === false) {
    return 'No';
  }
  if (Array.isArray(value)) {
    const members = parseHouseholdMembers(value);
    if (members.length > 0) {
      return formatHouseholdMembers(members);
    }
    return value.join(', ');
  }
  return String(value);
};

const buildSummary = (questions: Question[], answers: Record<string, unknown>): string => {
  const parts: string[] = [];
  for (const q of questions) {
    const value = answers[q.questionKey];
    if (!hasAnswer(value)) {
      continue;
    }
    parts.push(formatAnswerPreview(value));
    if (parts.length >= 3) {
      break;
    }
  }
  return parts.length > 0 ? parts.join(' · ') : 'No answers yet';
};

export const PreFilledSectionCard: React.FC<Props> = ({
  icon,
  title,
  questions,
  answers,
  prefilledKeys,
  onChange,
  initiallyExpanded = false,
  emptyHint,
}) => {
  const missingRequired = questions.some(q => q.isRequired && !hasAnswer(answers[q.questionKey]));
  const [expanded, setExpanded] = useState(initiallyExpanded || missingRequired);
  const [touchedKeys, setTouchedKeys] = useState<Set<string>>(() => new Set());

  const handleFieldChange = (questionKey: string, value: unknown) => {
    setTouchedKeys(prev => {
      if (prev.has(questionKey)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(questionKey);
      return next;
    });
    onChange({ ...answers, [questionKey]: value });
  };

  const summary = questions.length === 0 ? (emptyHint ?? '') : buildSummary(questions, answers);

  return (
    <Card>
      <Header type='button' onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>
        <IconWrap aria-hidden='true'>{icon}</IconWrap>
        <TitleWrap>
          <Title>
            {title}
            {missingRequired && <AttentionBadge>⚠️ Needs a look</AttentionBadge>}
          </Title>
          {!expanded && <Summary>{summary}</Summary>}
        </TitleWrap>
        <Chevron $expanded={expanded} aria-hidden='true'>
          ▼
        </Chevron>
      </Header>
      {expanded && (
        <Body>
          {questions.map(question => {
            const isPrefilled =
              !touchedKeys.has(question.questionKey) && prefilledKeys.has(question.questionKey);
            return (
              <QuestionField
                key={question.questionId}
                question={question}
                value={answers[question.questionKey]}
                onChange={value => handleFieldChange(question.questionKey, value)}
                isPrefilled={isPrefilled}
              />
            );
          })}
        </Body>
      )}
    </Card>
  );
};

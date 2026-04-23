import React from 'react';
import styled from 'styled-components';

export type MemberType = 'adult' | 'senior' | 'teenager' | 'child' | 'baby';

export type HouseholdMember = {
  id: string;
  type: MemberType;
  age?: number;
};

type MemberConfig = {
  label: string;
  icon: string;
  ageRange?: string;
  showAge: boolean;
  defaultAge?: number;
};

export const MEMBER_CONFIG: Record<MemberType, MemberConfig> = {
  adult: { label: 'Adult', icon: '🧑', showAge: false },
  senior: { label: 'Senior', icon: '🧓', ageRange: '65+', showAge: false },
  teenager: { label: 'Teenager', icon: '🧒', ageRange: '13–17', showAge: true, defaultAge: 15 },
  child: { label: 'Child', icon: '👦', ageRange: '3–12', showAge: true, defaultAge: 6 },
  baby: { label: 'Baby', icon: '👶', ageRange: '0–2', showAge: false },
};

const MEMBER_ORDER: MemberType[] = ['adult', 'senior', 'teenager', 'child', 'baby'];

const Container = styled.div<{ $hasError: boolean }>`
  border: 1px solid
    ${props =>
      props.$hasError ? props.theme.colors.semantic.error[500] : props.theme.border.color.primary};
  border-radius: 0.5rem;
  padding: 1rem;
  background: ${props => props.theme.background.primary};
`;

const AddSection = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const AddButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.625rem 0.875rem;
  min-width: 4.5rem;
  border: 2px dashed ${props => props.theme.border.color.primary};
  border-radius: 0.5rem;
  background: ${props => props.theme.background.secondary};
  cursor: pointer;
  position: relative;
  transition:
    border-color 0.15s,
    background 0.15s;

  &:hover {
    border-color: ${props => props.theme.colors.primary[400]};
    background: ${props => props.theme.colors.primary[50]};
  }
`;

const AddIcon = styled.span`
  font-size: 1.75rem;
  line-height: 1;
`;

const AddLabel = styled.span`
  font-size: 0.6875rem;
  color: ${props => props.theme.text.secondary};
  font-weight: 500;
  white-space: nowrap;
`;

const CountBadge = styled.span`
  position: absolute;
  top: -0.4rem;
  right: -0.4rem;
  background: ${props => props.theme.colors.primary[500]};
  color: white;
  border-radius: 9999px;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.25rem;
  font-size: 0.6875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
`;

const PlusIcon = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.text.secondary};
  font-weight: 700;
`;

const MembersSection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.border.color.primary};
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const MemberCard = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem 0.375rem 0.75rem;
  background: ${props => props.theme.background.secondary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 2rem;
`;

const MemberIcon = styled.span`
  font-size: 1.25rem;
  line-height: 1;
`;

const MemberInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const MemberLabel = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${props => props.theme.text.primary};
  line-height: 1;
`;

const MemberAgeRange = styled.span`
  font-size: 0.6875rem;
  color: ${props => props.theme.text.secondary};
  line-height: 1;
`;

const AgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const AgeLabel = styled.span`
  font-size: 0.6875rem;
  color: ${props => props.theme.text.secondary};
`;

const AgeInput = styled.input`
  width: 2.75rem;
  padding: 0.125rem 0.25rem;
  font-size: 0.75rem;
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 0.25rem;
  color: ${props => props.theme.text.primary};
  background: ${props => props.theme.background.primary};
  outline: none;
  text-align: center;

  &:focus {
    border-color: ${props => props.theme.colors.primary[500]};
  }
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.theme.text.secondary};
  font-size: 1.125rem;
  line-height: 1;
  padding: 0.125rem 0.25rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  transition:
    color 0.15s,
    background 0.15s;

  &:hover {
    color: ${props => props.theme.colors.semantic.error[600]};
    background: ${props => props.theme.colors.semantic.error[50]};
  }
`;

const EmptyHint = styled.p`
  margin: 0.75rem 0 0;
  padding-top: 0.75rem;
  border-top: 1px solid ${props => props.theme.border.color.primary};
  font-size: 0.8125rem;
  color: ${props => props.theme.text.secondary};
  text-align: center;
`;

export const parseHouseholdMembers = (value: unknown): HouseholdMember[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (m): m is HouseholdMember => typeof m === 'object' && m !== null && 'id' in m && 'type' in m
  );
};

export const formatHouseholdMembers = (members: HouseholdMember[]): string => {
  const grouped = new Map<MemberType, number[]>();
  for (const m of members) {
    const ages = grouped.get(m.type) ?? [];
    if (m.age !== undefined) {
      ages.push(m.age);
    }
    grouped.set(m.type, ages);
  }

  const counts = new Map<MemberType, number>();
  for (const m of members) {
    counts.set(m.type, (counts.get(m.type) ?? 0) + 1);
  }

  return MEMBER_ORDER.filter(type => counts.has(type))
    .map(type => {
      const count = counts.get(type) ?? 0;
      const ages = grouped.get(type) ?? [];
      const config = MEMBER_CONFIG[type];
      const noun = count === 1 ? config.label : `${config.label}s`;
      const ageStr = ages.length > 0 ? ` (aged ${ages.join(', ')})` : '';
      return `${count} ${noun}${ageStr}`;
    })
    .join(', ');
};

const generateId = () => Math.random().toString(36).slice(2, 9);

type Props = {
  value: unknown;
  onChange: (value: HouseholdMember[] | undefined) => void;
  hasError?: boolean;
};

export const HouseholdMembersField: React.FC<Props> = ({ value, onChange, hasError = false }) => {
  const members = parseHouseholdMembers(value);

  const countByType = members.reduce<Partial<Record<MemberType, number>>>((acc, m) => {
    acc[m.type] = (acc[m.type] ?? 0) + 1;
    return acc;
  }, {});

  const addMember = (type: MemberType) => {
    const config = MEMBER_CONFIG[type];
    const newMember: HouseholdMember = {
      id: generateId(),
      type,
      age: config.showAge ? config.defaultAge : undefined,
    };
    onChange([...members, newMember]);
  };

  const removeMember = (id: string) => {
    const updated = members.filter(m => m.id !== id);
    onChange(updated.length > 0 ? updated : undefined);
  };

  const updateAge = (id: string, age: number | undefined) => {
    onChange(members.map(m => (m.id === id ? { ...m, age } : m)));
  };

  return (
    <Container $hasError={hasError}>
      <AddSection>
        {MEMBER_ORDER.map(type => {
          const config = MEMBER_CONFIG[type];
          const count = countByType[type];
          return (
            <AddButton key={type} type='button' onClick={() => addMember(type)}>
              <AddIcon>{config.icon}</AddIcon>
              <AddLabel>{config.label}</AddLabel>
              {count ? <CountBadge>{count}</CountBadge> : <PlusIcon>+</PlusIcon>}
            </AddButton>
          );
        })}
      </AddSection>

      {members.length > 0 && (
        <MembersSection>
          {members.map(member => {
            const config = MEMBER_CONFIG[member.type];
            return (
              <MemberCard key={member.id}>
                <MemberIcon>{config.icon}</MemberIcon>
                <MemberInfo>
                  <MemberLabel>{config.label}</MemberLabel>
                  {config.showAge ? (
                    <AgeRow>
                      <AgeLabel>Age:</AgeLabel>
                      <AgeInput
                        type='number'
                        min={1}
                        max={99}
                        value={member.age ?? ''}
                        onChange={e =>
                          updateAge(member.id, e.target.value ? Number(e.target.value) : undefined)
                        }
                      />
                    </AgeRow>
                  ) : (
                    config.ageRange && <MemberAgeRange>{config.ageRange}</MemberAgeRange>
                  )}
                </MemberInfo>
                <RemoveButton
                  type='button'
                  onClick={() => removeMember(member.id)}
                  aria-label={`Remove ${config.label}`}
                >
                  ×
                </RemoveButton>
              </MemberCard>
            );
          })}
        </MembersSection>
      )}

      {members.length === 0 && (
        <EmptyHint>Tap a button above to add each person in your household</EmptyHint>
      )}
    </Container>
  );
};

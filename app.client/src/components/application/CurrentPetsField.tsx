import React from 'react';
import styled from 'styled-components';

export type PetKind = 'dog' | 'cat' | 'rabbit' | 'bird' | 'small' | 'reptile' | 'fish' | 'other';

export type CurrentPet = {
  id: string;
  kind: PetKind;
  age?: number;
  neutered?: boolean;
};

type KindConfig = {
  label: string;
  icon: string;
};

export const PET_KIND_CONFIG: Record<PetKind, KindConfig> = {
  dog: { label: 'Dog', icon: '🐶' },
  cat: { label: 'Cat', icon: '🐱' },
  rabbit: { label: 'Rabbit', icon: '🐰' },
  bird: { label: 'Bird', icon: '🐦' },
  small: { label: 'Small pet', icon: '🐹' },
  reptile: { label: 'Reptile', icon: '🦎' },
  fish: { label: 'Fish', icon: '🐠' },
  other: { label: 'Other', icon: '🐾' },
};

const KIND_ORDER: PetKind[] = ['dog', 'cat', 'rabbit', 'bird', 'small', 'reptile', 'fish', 'other'];

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

const PetsSection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.border.color.primary};
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const PetCard = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem 0.375rem 0.75rem;
  background: ${props => props.theme.background.secondary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 2rem;
`;

const PetIcon = styled.span`
  font-size: 1.25rem;
  line-height: 1;
`;

const PetInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PetLabel = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${props => props.theme.text.primary};
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const DetailLabel = styled.label`
  font-size: 0.6875rem;
  color: ${props => props.theme.text.secondary};
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
`;

const AgeInput = styled.input`
  width: 3rem;
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

const NeuteredToggle = styled.input`
  margin: 0;
  cursor: pointer;
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

export const parseCurrentPets = (value: unknown): CurrentPet[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (p): p is CurrentPet =>
      typeof p === 'object' && p !== null && 'id' in p && 'kind' in p && typeof p.kind === 'string'
  );
};

export const formatCurrentPets = (pets: CurrentPet[]): string => {
  if (pets.length === 0) {
    return '';
  }
  const grouped = new Map<PetKind, CurrentPet[]>();
  for (const p of pets) {
    const existing = grouped.get(p.kind) ?? [];
    existing.push(p);
    grouped.set(p.kind, existing);
  }
  return KIND_ORDER.filter(kind => grouped.has(kind))
    .map(kind => {
      const group = grouped.get(kind) ?? [];
      const config = PET_KIND_CONFIG[kind];
      const noun = group.length === 1 ? config.label : `${config.label}s`;
      const ages = group
        .map(p => (typeof p.age === 'number' ? `${p.age}y` : null))
        .filter((x): x is string => x !== null);
      const neuteredCount = group.filter(p => p.neutered).length;
      const parts: string[] = [];
      if (ages.length > 0) {
        parts.push(ages.join(', '));
      }
      if (neuteredCount > 0) {
        parts.push(
          neuteredCount === group.length ? 'neutered/spayed' : `${neuteredCount} neutered/spayed`
        );
      }
      const detail = parts.length > 0 ? ` (${parts.join('; ')})` : '';
      return `${group.length} ${noun}${detail}`;
    })
    .join(', ');
};

const generateId = (): string => Math.random().toString(36).slice(2, 9);

type Props = {
  value: unknown;
  onChange: (value: CurrentPet[] | undefined) => void;
  hasError?: boolean;
};

export const CurrentPetsField: React.FC<Props> = ({ value, onChange, hasError = false }) => {
  const pets = parseCurrentPets(value);

  const countByKind = pets.reduce<Partial<Record<PetKind, number>>>((acc, p) => {
    acc[p.kind] = (acc[p.kind] ?? 0) + 1;
    return acc;
  }, {});

  const addPet = (kind: PetKind) => {
    const next: CurrentPet = { id: generateId(), kind };
    onChange([...pets, next]);
  };

  const removePet = (id: string) => {
    const updated = pets.filter(p => p.id !== id);
    onChange(updated.length > 0 ? updated : undefined);
  };

  const updateAge = (id: string, age: number | undefined) => {
    onChange(pets.map(p => (p.id === id ? { ...p, age } : p)));
  };

  const toggleNeutered = (id: string, neutered: boolean) => {
    onChange(pets.map(p => (p.id === id ? { ...p, neutered } : p)));
  };

  return (
    <Container $hasError={hasError}>
      <AddSection>
        {KIND_ORDER.map(kind => {
          const config = PET_KIND_CONFIG[kind];
          const count = countByKind[kind];
          return (
            <AddButton
              key={kind}
              type='button'
              onClick={() => addPet(kind)}
              aria-label={`Add a ${config.label.toLowerCase()}`}
            >
              <AddIcon aria-hidden='true'>{config.icon}</AddIcon>
              <AddLabel>{config.label}</AddLabel>
              {count ? <CountBadge>{count}</CountBadge> : <PlusIcon>+</PlusIcon>}
            </AddButton>
          );
        })}
      </AddSection>

      {pets.length > 0 && (
        <PetsSection>
          {pets.map(pet => {
            const config = PET_KIND_CONFIG[pet.kind];
            return (
              <PetCard key={pet.id}>
                <PetIcon aria-hidden='true'>{config.icon}</PetIcon>
                <PetInfo>
                  <PetLabel>{config.label}</PetLabel>
                  <DetailRow>
                    <DetailLabel htmlFor={`pet-${pet.id}-age`}>
                      Age
                      <AgeInput
                        id={`pet-${pet.id}-age`}
                        type='number'
                        min={0}
                        max={40}
                        value={pet.age ?? ''}
                        onChange={e =>
                          updateAge(pet.id, e.target.value ? Number(e.target.value) : undefined)
                        }
                      />
                    </DetailLabel>
                    <DetailLabel>
                      <NeuteredToggle
                        type='checkbox'
                        checked={pet.neutered ?? false}
                        onChange={e => toggleNeutered(pet.id, e.target.checked)}
                      />
                      Neutered
                    </DetailLabel>
                  </DetailRow>
                </PetInfo>
                <RemoveButton
                  type='button'
                  onClick={() => removePet(pet.id)}
                  aria-label={`Remove ${config.label}`}
                >
                  ×
                </RemoveButton>
              </PetCard>
            );
          })}
        </PetsSection>
      )}

      {pets.length === 0 && <EmptyHint>Tap a pet above to add them to your household</EmptyHint>}
    </Container>
  );
};

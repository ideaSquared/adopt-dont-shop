import React from 'react';
import clsx from 'clsx';
import * as styles from './MemberField.css';

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
    <div
      className={clsx(
        styles.container,
        hasError ? styles.containerVariants.error : styles.containerVariants.normal
      )}
    >
      <div className={styles.addSection}>
        {KIND_ORDER.map(kind => {
          const config = PET_KIND_CONFIG[kind];
          const count = countByKind[kind];
          return (
            <button
              key={kind}
              type='button'
              className={styles.addButton}
              onClick={() => addPet(kind)}
              aria-label={`Add a ${config.label.toLowerCase()}`}
            >
              <span className={styles.addIcon} aria-hidden='true'>
                {config.icon}
              </span>
              <span className={styles.addLabel}>{config.label}</span>
              {count ? (
                <span className={styles.countBadge}>{count}</span>
              ) : (
                <span className={styles.plusIcon}>+</span>
              )}
            </button>
          );
        })}
      </div>

      {pets.length > 0 && (
        <div className={styles.itemsSection}>
          {pets.map(pet => {
            const config = PET_KIND_CONFIG[pet.kind];
            return (
              <div key={pet.id} className={styles.itemCard}>
                <span className={styles.itemIcon} aria-hidden='true'>
                  {config.icon}
                </span>
                <div className={styles.itemInfo}>
                  <span className={styles.itemLabel}>{config.label}</span>
                  <div className={styles.detailRow}>
                    <label className={styles.detailLabel} htmlFor={`pet-${pet.id}-age`}>
                      Age
                      <input
                        id={`pet-${pet.id}-age`}
                        type='number'
                        min={0}
                        max={40}
                        value={pet.age ?? ''}
                        className={styles.ageInput}
                        onChange={e =>
                          updateAge(pet.id, e.target.value ? Number(e.target.value) : undefined)
                        }
                      />
                    </label>
                    <label className={styles.detailLabel}>
                      <input
                        type='checkbox'
                        className={styles.neuteredToggle}
                        checked={pet.neutered ?? false}
                        onChange={e => toggleNeutered(pet.id, e.target.checked)}
                      />
                      Neutered
                    </label>
                  </div>
                </div>
                <button
                  type='button'
                  className={styles.removeButton}
                  onClick={() => removePet(pet.id)}
                  aria-label={`Remove ${config.label}`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {pets.length === 0 && (
        <p className={styles.emptyHint}>Tap a pet above to add them to your household</p>
      )}
    </div>
  );
};

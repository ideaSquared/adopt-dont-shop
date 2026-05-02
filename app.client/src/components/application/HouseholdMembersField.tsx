import React from 'react';
import clsx from 'clsx';
import * as styles from './MemberField.css';

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
    <div
      className={clsx(
        styles.container,
        hasError ? styles.containerVariants.error : styles.containerVariants.normal
      )}
    >
      <div className={styles.addSection}>
        {MEMBER_ORDER.map(type => {
          const config = MEMBER_CONFIG[type];
          const count = countByType[type];
          return (
            <button
              key={type}
              type='button'
              className={styles.addButton}
              onClick={() => addMember(type)}
            >
              <span className={styles.addIcon}>{config.icon}</span>
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

      {members.length > 0 && (
        <div className={styles.itemsSection}>
          {members.map(member => {
            const config = MEMBER_CONFIG[member.type];
            return (
              <div key={member.id} className={styles.itemCard}>
                <span className={styles.itemIcon}>{config.icon}</span>
                <div className={styles.itemInfoColumn}>
                  <span className={styles.itemLabel}>{config.label}</span>
                  {config.showAge ? (
                    <div className={styles.ageRow}>
                      <span className={styles.ageLabel}>Age:</span>
                      <input
                        type='number'
                        min={1}
                        max={99}
                        value={member.age ?? ''}
                        className={styles.ageInputNarrow}
                        onChange={e =>
                          updateAge(
                            member.id,
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                      />
                    </div>
                  ) : (
                    config.ageRange && (
                      <span className={styles.itemSubLabel}>{config.ageRange}</span>
                    )
                  )}
                </div>
                <button
                  type='button'
                  className={styles.removeButton}
                  onClick={() => removeMember(member.id)}
                  aria-label={`Remove ${config.label}`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {members.length === 0 && (
        <p className={styles.emptyHint}>
          Tap a button above to add each person in your household
        </p>
      )}
    </div>
  );
};

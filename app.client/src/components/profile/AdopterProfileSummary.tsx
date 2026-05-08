import React, { useEffect, useState } from 'react';
import { Spinner } from '@adopt-dont-shop/lib.components';
import { applicationProfileService } from '@/services/applicationProfileService';
import type { ApplicationDefaults } from '@/types';
import * as styles from './AdopterProfileSummary.css';

const isKnown = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim() !== '';
  }
  if (typeof value === 'object') {
    return Object.keys(value as object).length > 0;
  }
  return true;
};

type SectionSummary = {
  icon: string;
  label: string;
  known: boolean;
};

const buildSections = (defaults: ApplicationDefaults | null): SectionSummary[] => {
  const personal = defaults?.personalInfo;
  const living = defaults?.livingSituation;
  const experience = defaults?.petExperience;
  const references = defaults?.references;
  const customCount = defaults?.customAnswers ? Object.keys(defaults.customAnswers).length : 0;

  return [
    {
      icon: '👤',
      label: 'About you',
      known: isKnown(personal?.occupation),
    },
    {
      icon: '🏠',
      label: 'Your home',
      known: isKnown(living?.housingType) || isKnown(living?.householdMembers),
    },
    {
      icon: '🐾',
      label: 'Your pet experience',
      known: isKnown(experience?.experienceLevel),
    },
    {
      icon: '📇',
      label: 'References',
      known: isKnown(references?.personal) || isKnown(references?.veterinarian),
    },
    {
      icon: '🧩',
      label: `Rescue-specific answers${customCount > 0 ? ` (${customCount})` : ''}`,
      known: customCount > 0,
    },
  ];
};

export const AdopterProfileSummary: React.FC = () => {
  const [defaults, setDefaults] = useState<ApplicationDefaults | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    applicationProfileService
      .getApplicationDefaults()
      .then(result => {
        if (!cancelled) {
          setDefaults(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDefaults(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className={styles.wrap}>
        <h3 className={styles.title}>Your adopter profile ✨</h3>
        <p className={styles.subtitle}>Loading…</p>
        <Spinner size='sm' />
      </div>
    );
  }

  const sections = buildSections(defaults);
  const knownCount = sections.filter(s => s.known).length;

  return (
    <div className={styles.wrap}>
      <h3 className={styles.title}>Your adopter profile ✨</h3>
      <p className={styles.subtitle}>
        Things we&apos;ll pre-fill the next time you apply. Every application you send updates this
        automatically — no separate setup needed.
      </p>
      <div className={styles.grid}>
        {sections.map(section => (
          <span key={section.label} className={styles.statusPill({ known: section.known })}>
            <span className={styles.icon} aria-hidden='true'>
              {section.icon}
            </span>
            <span>{section.label}</span>
            <span className={styles.statusMark} aria-hidden='true'>
              {section.known ? '✅' : '—'}
            </span>
          </span>
        ))}
      </div>
      {knownCount === 0 && (
        <p className={styles.emptyHint}>
          Nothing stored yet — apply for your first pet and we&apos;ll remember your answers so you
          won&apos;t have to repeat yourself.
        </p>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Spinner } from '@adopt-dont-shop/lib.components';
import { applicationProfileService } from '@/services/applicationProfileService';
import type { ApplicationDefaults } from '@/types';

const Wrap = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background: ${props => props.theme.background.secondary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 0.75rem;
`;

const Title = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  color: ${props => props.theme.text.primary};
`;

const Subtitle = styled.p`
  margin: 0 0 1.25rem 0;
  font-size: 0.9375rem;
  color: ${props => props.theme.text.secondary};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const StatusPill = styled.span<{ $known: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 0.875rem;
  background: ${props =>
    props.$known ? props.theme.colors.semantic.success[50] : props.theme.background.primary};
  border: 1px solid
    ${props =>
      props.$known ? props.theme.colors.semantic.success[200] : props.theme.border.color.primary};
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: ${props => props.theme.text.primary};
`;

const Icon = styled.span`
  font-size: 1.125rem;
`;

const EmptyHint = styled.p`
  margin: 0.75rem 0 0 0;
  font-size: 0.8125rem;
  color: ${props => props.theme.text.secondary};
  font-style: italic;
`;

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
      <Wrap>
        <Title>Your adopter profile ✨</Title>
        <Subtitle>Loading…</Subtitle>
        <Spinner size='sm' />
      </Wrap>
    );
  }

  const sections = buildSections(defaults);
  const knownCount = sections.filter(s => s.known).length;

  return (
    <Wrap>
      <Title>Your adopter profile ✨</Title>
      <Subtitle>
        Things we&apos;ll pre-fill the next time you apply. Every application you send updates this
        automatically — no separate setup needed.
      </Subtitle>
      <Grid>
        {sections.map(section => (
          <StatusPill key={section.label} $known={section.known}>
            <Icon aria-hidden='true'>{section.icon}</Icon>
            <span>{section.label}</span>
            <span style={{ marginLeft: 'auto' }} aria-hidden='true'>
              {section.known ? '✅' : '—'}
            </span>
          </StatusPill>
        ))}
      </Grid>
      {knownCount === 0 && (
        <EmptyHint>
          Nothing stored yet — apply for your first pet and we&apos;ll remember your answers so you
          won&apos;t have to repeat yourself.
        </EmptyHint>
      )}
    </Wrap>
  );
};

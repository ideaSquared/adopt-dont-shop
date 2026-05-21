import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Alert, Button, Card } from '@adopt-dont-shop/lib.components';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as styles from './OnboardingQuizPage.css';

/**
 * ADS-628: Onboarding preference quiz.
 *
 * Captures 6 quick lifestyle answers post-signup and stores them on
 * `user.preferences` via `useAuth().updateProfile`. The User type in
 * lib.auth currently only declares `petTypes`, `maxDistance`, and
 * `newsletterOptIn` on `preferences`, so the additional quiz answers
 * are written as an extension blob (`quiz`) within the same object.
 *
 * Skippable — but skipping shows a clear warning that matches won't
 * be personalised, and redirects to /discover so the user isn't
 * stranded. Backend integration with `matchService.rankPets` is a
 * follow-up; for now we just persist the answers.
 */

type HomeType = 'apartment' | 'house_no_yard' | 'house_with_yard';
type Kids = 'none' | 'young' | 'older';
type OtherPets = 'none' | 'dogs' | 'cats' | 'mixed';
type ActivityLevel = 'low' | 'medium' | 'high';
type Allergies = 'none' | 'dogs' | 'cats' | 'multiple';
type SizePref = 'small' | 'medium' | 'large' | 'any';

type QuizAnswers = {
  homeType?: HomeType;
  kids?: Kids;
  otherPets?: OtherPets;
  activityLevel?: ActivityLevel;
  allergies?: Allergies;
  sizePreference?: SizePref;
};

type Question<T extends string> = {
  key: keyof QuizAnswers;
  title: string;
  options: ReadonlyArray<{ value: T; label: string }>;
};

const QUESTIONS: ReadonlyArray<Question<string>> = [
  {
    key: 'homeType',
    title: 'What kind of home do you live in?',
    options: [
      { value: 'apartment', label: 'Apartment / flat' },
      { value: 'house_no_yard', label: 'House without a yard' },
      { value: 'house_with_yard', label: 'House with a yard' },
    ],
  },
  {
    key: 'kids',
    title: 'Are there children in your home?',
    options: [
      { value: 'none', label: 'No children' },
      { value: 'young', label: 'Young children (under 10)' },
      { value: 'older', label: 'Older children (10+)' },
    ],
  },
  {
    key: 'otherPets',
    title: 'Do you have other pets?',
    options: [
      { value: 'none', label: 'No other pets' },
      { value: 'dogs', label: 'Dog(s)' },
      { value: 'cats', label: 'Cat(s)' },
      { value: 'mixed', label: 'A mix' },
    ],
  },
  {
    key: 'activityLevel',
    title: 'How active is your household?',
    options: [
      { value: 'low', label: 'Pretty relaxed' },
      { value: 'medium', label: 'Moderately active' },
      { value: 'high', label: 'Very active' },
    ],
  },
  {
    key: 'allergies',
    title: 'Any allergies to consider?',
    options: [
      { value: 'none', label: 'No allergies' },
      { value: 'dogs', label: 'Dogs' },
      { value: 'cats', label: 'Cats' },
      { value: 'multiple', label: 'Multiple' },
    ],
  },
  {
    key: 'sizePreference',
    title: 'Preferred pet size?',
    options: [
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' },
      { value: 'any', label: 'No preference' },
    ],
  },
];

export const OnboardingQuizPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  const setAnswer = (key: keyof QuizAnswers, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleFinish = async () => {
    try {
      setSaving(true);
      setError(null);
      const existing = user?.preferences ?? {};
      await updateProfile({
        preferences: {
          ...existing,
          // Persist the quiz answers under a dedicated key so the existing
          // typed fields (petTypes, maxDistance, newsletterOptIn) are
          // untouched. Cast through unknown because the lib.auth User type
          // doesn't yet declare the `quiz` field — extending it lives in
          // lib.auth and is out of scope for this ticket.
          quiz: answers,
        } as unknown as typeof existing,
      });
      navigate('/discover');
    } catch (err) {
      console.error('Failed to save onboarding quiz answers', err);
      setError(err instanceof Error ? err.message : 'Failed to save your answers.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipClick = () => {
    if (!showSkipWarning) {
      setShowSkipWarning(true);
      return;
    }
    navigate('/discover');
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <h1>Tell us about your home</h1>
          <p>A few quick questions so we can find your Pawfect Match. Takes about a minute.</p>
        </div>

        {error && <Alert variant='error'>{error}</Alert>}

        {QUESTIONS.map(q => (
          <div key={q.key} className={styles.question}>
            <h3>{q.title}</h3>
            <div className={styles.choices} role='radiogroup' aria-label={q.title}>
              {q.options.map(opt => (
                <label key={opt.value} className={styles.choiceLabel}>
                  <input
                    type='radio'
                    name={q.key}
                    value={opt.value}
                    checked={answers[q.key] === opt.value}
                    onChange={() => setAnswer(q.key, opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        ))}

        {showSkipWarning && (
          <div className={styles.warning}>
            <Alert variant='warning'>
              Heads up: if you skip, your matches won&apos;t be personalised. Click Skip again to
              continue anyway.
            </Alert>
          </div>
        )}

        <div className={styles.actions}>
          <Button variant='secondary' onClick={handleSkipClick} disabled={saving}>
            Skip
          </Button>
          <Button onClick={handleFinish} disabled={saving}>
            {saving ? 'Saving…' : 'Finish'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default OnboardingQuizPage;

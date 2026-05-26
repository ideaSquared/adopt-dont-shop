import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Alert, Button, Card, Spinner } from '@adopt-dont-shop/lib.components';
import type { AdopterLifestyle } from '@adopt-dont-shop/lib.matching';
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '@/services';
import * as styles from './OnboardingWizardPage.css';

/**
 * ADS-635: Unified onboarding wizard — consolidates the old OnboardingQuizPage
 * and MatchOnboardingPage into a single multi-step flow.
 *
 * Steps:
 *   1. Home & Lifestyle (skippable with warning)
 *   2. Pet Preferences
 *   3. Discovery Settings
 *   4. Review & Submit
 *
 * Submits everything to PUT /api/v1/match/profile.
 */

type FormState = {
  // Step 1: Home & Lifestyle
  housing_type: string;
  has_children: string;
  has_other_pets: string;
  allergies: string;
  activity_level: string;
  hours_alone_daily: number;
  yard: boolean;
  // Step 2: Pet Preferences
  preferred_types: string[];
  preferred_sizes: string[];
  preferred_age_groups: string[];
  preferred_energy: string[];
  open_to_special_needs: boolean;
  // Step 3: Discovery Settings
  max_distance_km: number | '';
  notify_new_matches: boolean;
};

type Option = { value: string; label: string; icon: string };

const HOUSING_OPTIONS = [
  { value: 'apartment', label: 'Apartment / flat' },
  { value: 'house', label: 'House' },
  { value: 'other', label: 'Other' },
];

const CHILDREN_OPTIONS = [
  { value: 'none', label: 'No children' },
  { value: 'young', label: 'Young children (under 10)' },
  { value: 'older', label: 'Older children (10+)' },
];

const OTHER_PETS_OPTIONS = [
  { value: 'none', label: 'No other pets' },
  { value: 'dogs', label: 'Dog(s)' },
  { value: 'cats', label: 'Cat(s)' },
  { value: 'mixed', label: 'A mix' },
];

const ALLERGIES_OPTIONS = [
  { value: 'none', label: 'No allergies' },
  { value: 'dogs', label: 'Dogs' },
  { value: 'cats', label: 'Cats' },
  { value: 'multiple', label: 'Multiple' },
];

const ACTIVITY_OPTIONS = [
  { value: 'low', label: 'Pretty relaxed' },
  { value: 'medium', label: 'Moderately active' },
  { value: 'high', label: 'Very active' },
];

const TYPES: Option[] = [
  { value: 'dog', label: 'Dog', icon: '🐕' },
  { value: 'cat', label: 'Cat', icon: '🐈' },
  { value: 'rabbit', label: 'Rabbit', icon: '🐇' },
  { value: 'bird', label: 'Bird', icon: '🦜' },
  { value: 'small_mammal', label: 'Small mammal', icon: '🐹' },
];

const SIZES: Option[] = [
  { value: 'extra_small', label: 'Extra small', icon: '🐭' },
  { value: 'small', label: 'Small', icon: '🐰' },
  { value: 'medium', label: 'Medium', icon: '🐕' },
  { value: 'large', label: 'Large', icon: '🐩' },
  { value: 'extra_large', label: 'Extra large', icon: '🦮' },
];

const AGES: Option[] = [
  { value: 'baby', label: 'Baby', icon: '🍼' },
  { value: 'young', label: 'Young', icon: '🌱' },
  { value: 'adult', label: 'Adult', icon: '🌳' },
  { value: 'senior', label: 'Senior', icon: '🧓' },
];

const ENERGY: Option[] = [
  { value: 'low', label: 'Low', icon: '😴' },
  { value: 'medium', label: 'Medium', icon: '🚶' },
  { value: 'high', label: 'High', icon: '🏃' },
  { value: 'very_high', label: 'Very high', icon: '⚡' },
];

const TOTAL_STEPS = 4;

const toggle = (arr: string[], v: string): string[] =>
  arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

type ChipGroupProps = {
  name: string;
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
};

const ChipGroup: React.FC<ChipGroupProps> = ({ name, options, selected, onToggle }) => (
  <div className={styles.chipGroup} role='group' aria-label={name}>
    {options.map(opt => {
      const isSelected = selected.includes(opt.value);
      return (
        <label
          key={opt.value}
          className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
        >
          <input
            type='checkbox'
            className={styles.srInput}
            checked={isSelected}
            onChange={() => onToggle(opt.value)}
          />
          <span className={styles.chipIcon} aria-hidden='true'>
            {opt.icon}
          </span>
          {opt.label}
        </label>
      );
    })}
  </div>
);

type RadioGroupProps = {
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: string;
  onChange: (value: string) => void;
};

const RadioGroup: React.FC<RadioGroupProps> = ({ name, options, selected, onChange }) => (
  <div className={styles.choices} role='radiogroup' aria-label={name}>
    {options.map(opt => (
      <label key={opt.value} className={styles.choiceLabel}>
        <input
          type='radio'
          name={name}
          value={opt.value}
          checked={selected === opt.value}
          onChange={() => onChange(opt.value)}
        />
        {opt.label}
      </label>
    ))}
  </div>
);

type TileProps = {
  icon: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

const Tile: React.FC<TileProps> = ({ icon, label, checked, onChange }) => (
  <label className={`${styles.tile} ${checked ? styles.tileSelected : ''}`}>
    <input
      type='checkbox'
      className={styles.srInput}
      checked={checked}
      onChange={e => onChange(e.target.checked)}
    />
    <span className={styles.tileIcon} aria-hidden='true'>
      {icon}
    </span>
    {label}
  </label>
);

const formatDistance = (v: number | '') => (v === '' ? 'Any' : `${v} km`);

const labelFor = (
  value: string,
  options: ReadonlyArray<{ value: string; label: string }>
): string => options.find(o => o.value === value)?.label ?? value;

const listLabels = (values: string[], options: Option[]): string =>
  values.length === 0
    ? 'Not set'
    : values.map(v => options.find(o => o.value === v)?.label ?? v).join(', ');

export const OnboardingWizardPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [form, setForm] = useState<FormState>({
    housing_type: '',
    has_children: '',
    has_other_pets: '',
    allergies: '',
    activity_level: '',
    hours_alone_daily: 0,
    yard: false,
    preferred_types: [],
    preferred_sizes: [],
    preferred_age_groups: [],
    preferred_energy: [],
    open_to_special_needs: false,
    max_distance_km: '',
    notify_new_matches: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const res = await apiService.get<{
          data: {
            preferred_types: string[] | null;
            preferred_sizes: string[] | null;
            preferred_age_groups: string[] | null;
            preferred_energy: string[] | null;
            lifestyle: AdopterLifestyle;
            max_distance_km: number | null;
            open_to_special_needs: boolean;
            notify_new_matches: boolean;
            allergies: string | null;
          };
        }>('/api/v1/match/profile');
        const p = res.data;
        setForm(f => ({
          ...f,
          preferred_types: p.preferred_types ?? [],
          preferred_sizes: p.preferred_sizes ?? [],
          preferred_age_groups: p.preferred_age_groups ?? [],
          preferred_energy: p.preferred_energy ?? [],
          housing_type: p.lifestyle?.housing_type ?? '',
          has_children: p.lifestyle?.has_children ? 'young' : '',
          has_other_pets: p.lifestyle?.has_other_pets ? 'dogs' : '',
          hours_alone_daily: p.lifestyle?.hours_alone_daily ?? 0,
          yard: p.lifestyle?.yard ?? false,
          max_distance_km: p.max_distance_km ?? '',
          open_to_special_needs: !!p.open_to_special_needs,
          notify_new_matches: !!p.notify_new_matches,
          allergies: p.allergies ?? '',
        }));
      } catch {
        // First-time load — empty profile is fine.
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <div className={styles.header}>
            <span className={styles.heroIcon} aria-hidden='true'>
              🐾
            </span>
            <h1>Set up your match profile</h1>
            <p>Sign in to tell us what kind of pet you&apos;re looking for.</p>
          </div>
          <Link to='/login'>
            <Button>Sign in</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <Spinner />
      </div>
    );
  }

  const buildPayload = () => {
    const lifestyle: AdopterLifestyle = {
      housing_type:
        form.housing_type === ''
          ? undefined
          : (form.housing_type as AdopterLifestyle['housing_type']),
      has_children: form.has_children !== '' && form.has_children !== 'none',
      has_other_pets: form.has_other_pets !== '' && form.has_other_pets !== 'none',
      hours_alone_daily: form.hours_alone_daily,
      yard: form.yard,
    };

    return {
      preferred_types: form.preferred_types,
      preferred_sizes: form.preferred_sizes,
      preferred_age_groups: form.preferred_age_groups,
      preferred_energy: form.preferred_energy,
      lifestyle,
      max_distance_km: form.max_distance_km === '' ? null : form.max_distance_km,
      open_to_special_needs: form.open_to_special_needs,
      notify_new_matches: form.notify_new_matches,
      allergies: form.allergies === '' ? null : form.allergies,
    };
  };

  const submit = async () => {
    try {
      setSaving(true);
      setError(null);
      await apiService.put('/api/v1/match/profile', buildPayload());
      navigate('/match/top-picks');
    } catch (err) {
      console.error('Failed to save match profile', err);
      setError('Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipStep = () => {
    if (step === 1 && !showSkipWarning) {
      setShowSkipWarning(true);
      return;
    }
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
    setShowSkipWarning(false);
  };

  const goNext = () => {
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
    setShowSkipWarning(false);
  };

  const goBack = () => {
    setStep(s => Math.max(s - 1, 1));
    setShowSkipWarning(false);
  };

  const goToStep = (target: number) => {
    setStep(target);
    setShowSkipWarning(false);
  };

  const progressBar = (
    <div
      className={styles.progressBar}
      role='progressbar'
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-label={`Step ${step} of ${TOTAL_STEPS}`}
    >
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={`${styles.progressStep} ${i < step ? styles.progressStepActive : ''}`}
        />
      ))}
    </div>
  );

  const renderStep1 = () => (
    <>
      <div className={styles.section}>
        <h3>What kind of home do you live in?</h3>
        <RadioGroup
          name='Housing type'
          options={HOUSING_OPTIONS}
          selected={form.housing_type}
          onChange={v => setForm(f => ({ ...f, housing_type: v }))}
        />
      </div>

      <div className={styles.section}>
        <h3>Are there children in your home?</h3>
        <RadioGroup
          name='Children'
          options={CHILDREN_OPTIONS}
          selected={form.has_children}
          onChange={v => setForm(f => ({ ...f, has_children: v }))}
        />
      </div>

      <div className={styles.section}>
        <h3>Do you have other pets?</h3>
        <RadioGroup
          name='Other pets'
          options={OTHER_PETS_OPTIONS}
          selected={form.has_other_pets}
          onChange={v => setForm(f => ({ ...f, has_other_pets: v }))}
        />
      </div>

      <div className={styles.section}>
        <h3>Any allergies to consider?</h3>
        <RadioGroup
          name='Allergies'
          options={ALLERGIES_OPTIONS}
          selected={form.allergies}
          onChange={v => setForm(f => ({ ...f, allergies: v }))}
        />
      </div>

      <div className={styles.section}>
        <h3>How active is your household?</h3>
        <RadioGroup
          name='Activity level'
          options={ACTIVITY_OPTIONS}
          selected={form.activity_level}
          onChange={v => setForm(f => ({ ...f, activity_level: v }))}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sliderField}>
          <div className={styles.sliderHeader}>
            <span>Hours alone daily</span>
            <span className={styles.sliderValue}>{form.hours_alone_daily}h</span>
          </div>
          <input
            className={styles.slider}
            type='range'
            min={0}
            max={12}
            step={1}
            value={form.hours_alone_daily}
            onChange={e => setForm(f => ({ ...f, hours_alone_daily: Number(e.target.value) }))}
            aria-label='Hours alone daily'
          />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.tileGrid}>
          <Tile
            icon='🌳'
            label='Yard / garden'
            checked={form.yard}
            onChange={checked => setForm(f => ({ ...f, yard: checked }))}
          />
        </div>
      </div>

      {showSkipWarning && (
        <div className={styles.alertWrap}>
          <Alert variant='warning'>
            Skipping this means Top Picks won&apos;t be personalized to your lifestyle. Click Skip
            again to continue anyway.
          </Alert>
        </div>
      )}
    </>
  );

  const renderStep2 = () => (
    <>
      <div className={styles.section}>
        <h3>What kind of pet?</h3>
        <p className='hint'>Pick one or more.</p>
        <ChipGroup
          name='Pet type'
          options={TYPES}
          selected={form.preferred_types}
          onToggle={v => setForm(f => ({ ...f, preferred_types: toggle(f.preferred_types, v) }))}
        />
      </div>

      <div className={styles.section}>
        <h3>Size</h3>
        <ChipGroup
          name='Size'
          options={SIZES}
          selected={form.preferred_sizes}
          onToggle={v => setForm(f => ({ ...f, preferred_sizes: toggle(f.preferred_sizes, v) }))}
        />
      </div>

      <div className={styles.section}>
        <h3>Age group</h3>
        <ChipGroup
          name='Age group'
          options={AGES}
          selected={form.preferred_age_groups}
          onToggle={v =>
            setForm(f => ({ ...f, preferred_age_groups: toggle(f.preferred_age_groups, v) }))
          }
        />
      </div>

      <div className={styles.section}>
        <h3>Energy level</h3>
        <ChipGroup
          name='Energy level'
          options={ENERGY}
          selected={form.preferred_energy}
          onToggle={v => setForm(f => ({ ...f, preferred_energy: toggle(f.preferred_energy, v) }))}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.tileGrid}>
          <Tile
            icon='💖'
            label='Open to special needs'
            checked={form.open_to_special_needs}
            onChange={checked => setForm(f => ({ ...f, open_to_special_needs: checked }))}
          />
        </div>
      </div>
    </>
  );

  const renderStep3 = () => {
    const distanceVal = form.max_distance_km === '' ? 50 : form.max_distance_km;
    return (
      <>
        <div className={styles.section}>
          <h3>Max distance</h3>
          <div className={styles.sliderField}>
            <div className={styles.sliderHeader}>
              <span>How far are you willing to travel?</span>
              <span className={styles.sliderValue}>{formatDistance(distanceVal)}</span>
            </div>
            <input
              className={styles.slider}
              type='range'
              min={5}
              max={500}
              step={5}
              value={distanceVal}
              onChange={e => setForm(f => ({ ...f, max_distance_km: Number(e.target.value) }))}
              aria-label='Max distance in kilometres'
            />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.tileGrid}>
            <Tile
              icon='🔔'
              label='Notify on new matches'
              checked={form.notify_new_matches}
              onChange={checked => setForm(f => ({ ...f, notify_new_matches: checked }))}
            />
          </div>
        </div>
      </>
    );
  };

  const renderStep4 = () => (
    <>
      <div className={styles.reviewSection}>
        <h4>
          Home &amp; Lifestyle
          <button className={styles.editButton} onClick={() => goToStep(1)} type='button'>
            Edit
          </button>
        </h4>
        <div className={styles.reviewItem}>
          <span>Housing</span>
          <span>
            {form.housing_type ? labelFor(form.housing_type, HOUSING_OPTIONS) : 'Not set'}
          </span>
        </div>
        <div className={styles.reviewItem}>
          <span>Children</span>
          <span>
            {form.has_children ? labelFor(form.has_children, CHILDREN_OPTIONS) : 'Not set'}
          </span>
        </div>
        <div className={styles.reviewItem}>
          <span>Other pets</span>
          <span>
            {form.has_other_pets ? labelFor(form.has_other_pets, OTHER_PETS_OPTIONS) : 'Not set'}
          </span>
        </div>
        <div className={styles.reviewItem}>
          <span>Allergies</span>
          <span>{form.allergies ? labelFor(form.allergies, ALLERGIES_OPTIONS) : 'Not set'}</span>
        </div>
        <div className={styles.reviewItem}>
          <span>Activity level</span>
          <span>
            {form.activity_level ? labelFor(form.activity_level, ACTIVITY_OPTIONS) : 'Not set'}
          </span>
        </div>
        <div className={styles.reviewItem}>
          <span>Hours alone</span>
          <span>{form.hours_alone_daily}h</span>
        </div>
        <div className={styles.reviewItem}>
          <span>Yard</span>
          <span>{form.yard ? 'Yes' : 'No'}</span>
        </div>
      </div>

      <div className={styles.reviewSection}>
        <h4>
          Pet Preferences
          <button className={styles.editButton} onClick={() => goToStep(2)} type='button'>
            Edit
          </button>
        </h4>
        <div className={styles.reviewItem}>
          <span>Types</span>
          <span>{listLabels(form.preferred_types, TYPES)}</span>
        </div>
        <div className={styles.reviewItem}>
          <span>Sizes</span>
          <span>{listLabels(form.preferred_sizes, SIZES)}</span>
        </div>
        <div className={styles.reviewItem}>
          <span>Age groups</span>
          <span>{listLabels(form.preferred_age_groups, AGES)}</span>
        </div>
        <div className={styles.reviewItem}>
          <span>Energy</span>
          <span>{listLabels(form.preferred_energy, ENERGY)}</span>
        </div>
        <div className={styles.reviewItem}>
          <span>Special needs</span>
          <span>{form.open_to_special_needs ? 'Yes' : 'No'}</span>
        </div>
      </div>

      <div className={styles.reviewSection}>
        <h4>
          Discovery Settings
          <button className={styles.editButton} onClick={() => goToStep(3)} type='button'>
            Edit
          </button>
        </h4>
        <div className={styles.reviewItem}>
          <span>Max distance</span>
          <span>{formatDistance(form.max_distance_km)}</span>
        </div>
        <div className={styles.reviewItem}>
          <span>Notifications</span>
          <span>{form.notify_new_matches ? 'On' : 'Off'}</span>
        </div>
      </div>
    </>
  );

  const stepTitles = [
    'Home & Lifestyle',
    'Pet Preferences',
    'Discovery Settings',
    'Review & Submit',
  ];

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <span className={styles.heroIcon} aria-hidden='true'>
            🐾
          </span>
          <h1>{stepTitles[step - 1]}</h1>
          <p>
            Step {step} of {TOTAL_STEPS}
          </p>
        </div>

        {progressBar}

        {error && (
          <div className={styles.alertWrap}>
            <Alert variant='error'>{error}</Alert>
          </div>
        )}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        <div className={styles.actions}>
          <div>
            {step > 1 && (
              <Button variant='secondary' onClick={goBack} disabled={saving}>
                Back
              </Button>
            )}
            {step === 1 && (
              <Button variant='secondary' onClick={handleSkipStep} disabled={saving}>
                Skip
              </Button>
            )}
          </div>
          <div>
            {step < TOTAL_STEPS && (
              <Button onClick={goNext} disabled={saving}>
                Next
              </Button>
            )}
            {step === TOTAL_STEPS && (
              <Button onClick={submit} disabled={saving}>
                {saving ? 'Saving...' : 'Save preferences'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OnboardingWizardPage;

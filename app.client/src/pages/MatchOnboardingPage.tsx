import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Alert, Button, Card, Spinner } from '@adopt-dont-shop/lib.components';
import type { AdopterMatchProfile, AdopterLifestyle } from '@adopt-dont-shop/lib.matching';
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '@/services';
import * as styles from './MatchOnboardingPage.css';

type FormState = {
  preferred_types: string[];
  preferred_sizes: string[];
  preferred_age_groups: string[];
  preferred_energy: string[];
  lifestyle: AdopterLifestyle;
  max_distance_km: number | '';
  open_to_special_needs: boolean;
  notify_new_matches: boolean;
};

type Option = { value: string; label: string; icon: string };

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

type LifestyleTile = {
  key: keyof Pick<AdopterLifestyle, 'has_children' | 'has_other_pets' | 'yard'>;
  label: string;
  icon: string;
};

const LIFESTYLE_TILES: LifestyleTile[] = [
  { key: 'has_children', label: 'Children at home', icon: '👶' },
  { key: 'has_other_pets', label: 'Other pets', icon: '🐾' },
  { key: 'yard', label: 'Yard / garden', icon: '🌳' },
];

const EXTRA_TILES = [
  { key: 'open_to_special_needs' as const, label: 'Open to special needs', icon: '💖' },
  { key: 'notify_new_matches' as const, label: 'Notify on new matches', icon: '🔔' },
];

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

export const MatchOnboardingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    preferred_types: [],
    preferred_sizes: [],
    preferred_age_groups: [],
    preferred_energy: [],
    lifestyle: {},
    max_distance_km: '',
    open_to_special_needs: false,
    notify_new_matches: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const res = await apiService.get<{ data: AdopterMatchProfile }>('/api/v1/match/profile');
        const p = res.data;
        setForm(f => ({
          ...f,
          preferred_types: p.preferred_types ?? [],
          preferred_sizes: p.preferred_sizes ?? [],
          preferred_age_groups: p.preferred_age_groups ?? [],
          preferred_energy: p.preferred_energy ?? [],
          lifestyle: p.lifestyle ?? {},
          max_distance_km: p.max_distance_km ?? '',
          open_to_special_needs: !!p.open_to_special_needs,
          notify_new_matches: !!p.notify_new_matches,
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
            <h1>Match preferences</h1>
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

  const submit = async () => {
    try {
      setSaving(true);
      setError(null);
      await apiService.put('/api/v1/match/profile', {
        ...form,
        max_distance_km: form.max_distance_km === '' ? null : form.max_distance_km,
      });
      navigate('/match/top-picks');
    } catch (err) {
      console.error('Failed to save match profile', err);
      setError('Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const hoursAlone = form.lifestyle.hours_alone_daily ?? 0;
  const distanceVal = form.max_distance_km === '' ? 50 : form.max_distance_km;

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <span className={styles.heroIcon} aria-hidden='true'>
            🐾
          </span>
          <h1>Find your match</h1>
          <p>Tell us what you&apos;re looking for — we&apos;ll surface your best matches.</p>
        </div>

        {error && (
          <div className={styles.alertWrap}>
            <Alert variant='error'>{error}</Alert>
          </div>
        )}

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
            onToggle={v =>
              setForm(f => ({ ...f, preferred_energy: toggle(f.preferred_energy, v) }))
            }
          />
        </div>

        <div className={styles.section}>
          <h3>Your home</h3>
          <div className={styles.tileGrid}>
            {LIFESTYLE_TILES.map(t => (
              <Tile
                key={t.key}
                icon={t.icon}
                label={t.label}
                checked={!!form.lifestyle[t.key]}
                onChange={checked =>
                  setForm(f => ({
                    ...f,
                    lifestyle: { ...f.lifestyle, [t.key]: checked },
                  }))
                }
              />
            ))}
          </div>
          <div className={styles.sliderField}>
            <div className={styles.sliderHeader}>
              <span>⏰ Hours alone daily</span>
              <span className={styles.sliderValue}>{hoursAlone}h</span>
            </div>
            <input
              className={styles.slider}
              type='range'
              min={0}
              max={12}
              step={1}
              value={hoursAlone}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  lifestyle: { ...f.lifestyle, hours_alone_daily: Number(e.target.value) },
                }))
              }
              aria-label='Hours alone daily'
            />
          </div>
        </div>

        <div className={styles.section}>
          <h3>Reach</h3>
          <div className={styles.sliderField}>
            <div className={styles.sliderHeader}>
              <span>📍 Max distance</span>
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
          <div className={styles.tileGrid} style={{ marginTop: '1rem' }}>
            {EXTRA_TILES.map(t => (
              <Tile
                key={t.key}
                icon={t.icon}
                label={t.label}
                checked={form[t.key]}
                onChange={checked => setForm(f => ({ ...f, [t.key]: checked }))}
              />
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Save preferences'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MatchOnboardingPage;

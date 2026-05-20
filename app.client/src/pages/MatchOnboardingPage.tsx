import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Alert, Button, Card, Container, Spinner } from '@adopt-dont-shop/lib.components';
import type { AdopterMatchProfile, AdopterLifestyle } from '@adopt-dont-shop/lib.matching';
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '@/services';

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

const TYPES = ['dog', 'cat', 'rabbit', 'bird', 'small_mammal'];
const SIZES = ['extra_small', 'small', 'medium', 'large', 'extra_large'];
const AGES = ['baby', 'young', 'adult', 'senior'];
const ENERGY = ['low', 'medium', 'high', 'very_high'];

const toggle = (arr: string[], v: string): string[] =>
  arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

/**
 * Minimal match preferences wizard. Single page rather than 3-step
 * modal for v1 — keeps the UX visible and the surface obvious; can
 * be split into stepper later without changing the payload.
 */
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
      <Container>
        <p>Sign in to set match preferences.</p>
        <Link to='/login'>Sign in</Link>
      </Container>
    );
  }
  if (loading) return <Spinner />;

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

  return (
    <Container>
      <h1>Match preferences</h1>
      {error && <Alert variant='error'>{error}</Alert>}

      <Card>
        <h3>What kind of pet?</h3>
        {TYPES.map(t => (
          <label key={t} style={{ marginRight: '0.5rem' }}>
            <input
              type='checkbox'
              checked={form.preferred_types.includes(t)}
              onChange={() =>
                setForm(f => ({ ...f, preferred_types: toggle(f.preferred_types, t) }))
              }
            />
            {t}
          </label>
        ))}
      </Card>

      <Card>
        <h3>Size</h3>
        {SIZES.map(s => (
          <label key={s} style={{ marginRight: '0.5rem' }}>
            <input
              type='checkbox'
              checked={form.preferred_sizes.includes(s)}
              onChange={() =>
                setForm(f => ({ ...f, preferred_sizes: toggle(f.preferred_sizes, s) }))
              }
            />
            {s}
          </label>
        ))}
      </Card>

      <Card>
        <h3>Age group</h3>
        {AGES.map(a => (
          <label key={a} style={{ marginRight: '0.5rem' }}>
            <input
              type='checkbox'
              checked={form.preferred_age_groups.includes(a)}
              onChange={() =>
                setForm(f => ({ ...f, preferred_age_groups: toggle(f.preferred_age_groups, a) }))
              }
            />
            {a}
          </label>
        ))}
      </Card>

      <Card>
        <h3>Energy level</h3>
        {ENERGY.map(e => (
          <label key={e} style={{ marginRight: '0.5rem' }}>
            <input
              type='checkbox'
              checked={form.preferred_energy.includes(e)}
              onChange={() =>
                setForm(f => ({ ...f, preferred_energy: toggle(f.preferred_energy, e) }))
              }
            />
            {e}
          </label>
        ))}
      </Card>

      <Card>
        <h3>Lifestyle</h3>
        <label>
          <input
            type='checkbox'
            checked={!!form.lifestyle.has_children}
            onChange={e =>
              setForm(f => ({
                ...f,
                lifestyle: { ...f.lifestyle, has_children: e.target.checked },
              }))
            }
          />
          Children at home
        </label>
        <label style={{ marginLeft: '1rem' }}>
          <input
            type='checkbox'
            checked={!!form.lifestyle.has_other_pets}
            onChange={e =>
              setForm(f => ({
                ...f,
                lifestyle: { ...f.lifestyle, has_other_pets: e.target.checked },
              }))
            }
          />
          Other pets at home
        </label>
        <label style={{ marginLeft: '1rem' }}>
          <input
            type='checkbox'
            checked={!!form.lifestyle.yard}
            onChange={e =>
              setForm(f => ({ ...f, lifestyle: { ...f.lifestyle, yard: e.target.checked } }))
            }
          />
          Yard
        </label>
        <div style={{ marginTop: '0.5rem' }}>
          Hours alone daily:{' '}
          <input
            type='number'
            min={0}
            max={24}
            value={form.lifestyle.hours_alone_daily ?? ''}
            onChange={e =>
              setForm(f => ({
                ...f,
                lifestyle: {
                  ...f.lifestyle,
                  hours_alone_daily: e.target.value === '' ? undefined : Number(e.target.value),
                },
              }))
            }
          />
        </div>
      </Card>

      <Card>
        <h3>Reach</h3>
        <div>
          Max distance (km):{' '}
          <input
            type='number'
            min={1}
            value={form.max_distance_km}
            onChange={e =>
              setForm(f => ({
                ...f,
                max_distance_km: e.target.value === '' ? '' : Number(e.target.value),
              }))
            }
          />
        </div>
        <label>
          <input
            type='checkbox'
            checked={form.open_to_special_needs}
            onChange={e => setForm(f => ({ ...f, open_to_special_needs: e.target.checked }))}
          />
          Open to special-needs pets
        </label>
        <label style={{ display: 'block' }}>
          <input
            type='checkbox'
            checked={form.notify_new_matches}
            onChange={e => setForm(f => ({ ...f, notify_new_matches: e.target.checked }))}
          />
          Notify me when new matches appear
        </label>
      </Card>

      <Button onClick={submit} disabled={saving}>
        {saving ? 'Saving…' : 'Save preferences'}
      </Button>
    </Container>
  );
};

export default MatchOnboardingPage;

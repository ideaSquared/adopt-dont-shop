import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Alert, Card, Container, MatchReasonChips, Spinner } from '@adopt-dont-shop/lib.components';
import type { MatchTopPick } from '@adopt-dont-shop/lib.matching';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '@/services';

/**
 * Top Picks — curated personalised list from the matching module.
 *
 * Backend honours MATCH_ENABLED env; when off, /api/v1/match/top-picks
 * returns []. Empty state nudges adopters toward the onboarding wizard
 * so the rule scorer has explicit prefs to work with on next render.
 */
export const TopPicksPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const [picks, setPicks] = useState<MatchTopPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiService.get<{ data: MatchTopPick[] }>(
          '/api/v1/match/top-picks?limit=10'
        );
        setPicks(res.data ?? []);
      } catch (err) {
        console.error('Failed to load top picks', err);
        setError('Failed to load your top picks.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Container>
        <p>Sign in to see pets matched to you.</p>
        <Link to='/login'>Sign in</Link>
      </Container>
    );
  }

  if (loading) return <Spinner />;
  if (error) return <Alert variant='error'>{error}</Alert>;

  if (picks.length === 0) {
    return (
      <Container>
        <h2>No matches yet</h2>
        <p>
          Tell us a little about what you&apos;re looking for and we&apos;ll line up some pets that
          fit.
        </p>
        <Link to='/match/onboarding'>Set match preferences</Link>
      </Container>
    );
  }

  return (
    <Container>
      <h1>Top picks for you</h1>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {picks.map(pick => (
          <Card key={pick.petId}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Link to={`/pets/${pick.petId}`}>
                  <h3>{pick.name}</h3>
                </Link>
                <p>
                  {pick.type} · {pick.ageGroup} · {pick.size} · {pick.rescueName}
                </p>
                <MatchReasonChips reasons={pick.reasons} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{pick.score}</div>
            </div>
          </Card>
        ))}
      </div>
    </Container>
  );
};

export default TopPicksPage;

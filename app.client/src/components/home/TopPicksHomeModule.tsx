import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Container, MatchReasonChips, Spinner } from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import type { MatchTopPick } from '@adopt-dont-shop/lib.matching';
import { useMatchPreferences } from '@/hooks/useMatchPreferences';
import { apiService } from '@/services';

/**
 * ADS-636: HomePage "Your top picks" module.
 *
 * Only renders for authenticated users with completed match preferences.
 * Hides itself silently on errors/empty results so the home page stays
 * usable. Acts as a discoverability surface for /match/top-picks.
 */
export const TopPicksHomeModule: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { hasPreferences } = useMatchPreferences();
  const [picks, setPicks] = useState<MatchTopPick[]>([]);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !hasPreferences) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setErrored(false);
        const res = await apiService.get<{ data: MatchTopPick[] }>(
          '/api/v1/match/top-picks?limit=3'
        );
        if (!cancelled) {
          setPicks(res.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setErrored(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, hasPreferences]);

  if (!isAuthenticated || !hasPreferences || errored) {
    return null;
  }
  if (!loading && picks.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby='top-picks-home-heading'>
      <Container>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '1rem',
          }}
        >
          <h2 id='top-picks-home-heading'>Your top picks</h2>
          <Link to='/match/top-picks'>See all</Link>
        </div>
        {loading ? (
          <Spinner />
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {picks.map(pick => (
              <Card key={pick.petId}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
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
        )}
      </Container>
    </section>
  );
};

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Container,
  MatchReasonChips,
  ProgressiveImage,
} from '@adopt-dont-shop/lib.components';
import { PetCardSkeletonGrid } from '@/components/skeletons';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import type { MatchTopPick } from '@adopt-dont-shop/lib.matching';
import { useMatchPreferences } from '@/hooks/useMatchPreferences';
import { matchingService } from '@/services';
import { resolveFileUrl } from '@/utils/fileUtils';
import * as styles from './TopPicksHomeModule.css';

const TYPE_ICON: Record<string, string> = {
  dog: '🐕',
  cat: '🐈',
  rabbit: '🐇',
  bird: '🦜',
  small_mammal: '🐹',
};

const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const scoreLabel = (score: number): string => {
  if (score >= 75) return 'Great match';
  if (score >= 50) return 'Strong match';
  if (score >= 25) return 'Good match';
  return 'Possible match';
};

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
  const navigate = useNavigate();
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
        const data = await matchingService.getTopPicks(3);
        if (!cancelled) {
          setPicks(data);
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
    <section aria-labelledby='top-picks-home-heading' className={styles.section}>
      <Container>
        <div className={styles.header}>
          <h2 id='top-picks-home-heading'>Your top picks</h2>
          <Link to='/match/top-picks' className={styles.seeAll}>
            See all →
          </Link>
        </div>
        {loading ? (
          <div className={styles.grid}>
            <PetCardSkeletonGrid count={3} />
          </div>
        ) : (
          <div className={styles.grid}>
            {picks.map(pick => {
              const url = resolveFileUrl(pick.photoUrl ?? undefined);
              const icon = TYPE_ICON[pick.type] ?? '🐾';
              const open = () => navigate(`/pets/${pick.petId}`);
              return (
                <Card
                  key={pick.petId}
                  className={styles.card}
                  role='link'
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && open()}
                >
                  <div className={styles.imageWrap}>
                    {url ? (
                      <ProgressiveImage
                        src={url}
                        alt={pick.name}
                        className={styles.image}
                        errorFallback={
                          <div className={styles.placeholder} aria-hidden='true'>
                            {icon}
                          </div>
                        }
                        placeholder={
                          <div className={styles.placeholder} aria-hidden='true'>
                            {icon}
                          </div>
                        }
                      />
                    ) : (
                      <div className={styles.placeholder} aria-hidden='true'>
                        {icon}
                      </div>
                    )}
                  </div>
                  <div className={styles.body}>
                    <div className={styles.titleRow}>
                      <h3 className={styles.name}>{pick.name}</h3>
                      <span className={styles.scoreChip}>★ {scoreLabel(pick.score)}</span>
                    </div>
                    <p className={styles.meta}>
                      {titleCase(pick.type)}
                      {pick.breedName ? ` · ${pick.breedName}` : ''} · {titleCase(pick.ageGroup)}
                    </p>
                    <p className={styles.rescue}>{pick.rescueName}</p>
                    <div className={styles.reasons}>
                      <MatchReasonChips reasons={pick.reasons} max={2} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Container>
    </section>
  );
};

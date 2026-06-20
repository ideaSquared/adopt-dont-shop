import { useAuth } from '@adopt-dont-shop/lib.auth';
import {
  Alert,
  Button,
  Card,
  MatchReasonChips,
  ProgressiveImage,
  Spinner,
} from '@adopt-dont-shop/lib.components';
import type { MatchTopPick } from '@adopt-dont-shop/lib.matching';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { matchingService } from '@/services';
import { resolveFileUrl } from '@/utils/fileUtils';
import * as styles from './TopPicksPage.css';

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

export const TopPicksPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [picks, setPicks] = useState<MatchTopPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await matchingService.getTopPicks(10);
        if (!cancelled) {
          setPicks(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load top picks', err);
          setError('Failed to load your top picks.');
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
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <Card className={styles.emptyWrap}>
          <div className={styles.emptyIcon}>🐾</div>
          <h2>Sign in for your top picks</h2>
          <p>We&apos;ll line up pets matched to what you&apos;re looking for.</p>
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
  if (error) {
    return (
      <div className={styles.container}>
        <Alert variant='error'>{error}</Alert>
      </div>
    );
  }

  if (picks.length === 0) {
    return (
      <div className={styles.container}>
        <Card className={styles.emptyWrap}>
          <div className={styles.emptyIcon}>🐾</div>
          <h2>No matches yet</h2>
          <p>Tell us what you&apos;re looking for and we&apos;ll line up pets that fit.</p>
          <Link to='/onboarding'>
            <Button>Set match preferences</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Top picks for you</h1>
        <p>Personalised matches based on your preferences.</p>
      </div>
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
                <div className={styles.scoreBadge} aria-label={scoreLabel(pick.score)}>
                  ★ {scoreLabel(pick.score)}
                </div>
              </div>

              <div className={styles.body}>
                <h3 className={styles.name}>{pick.name}</h3>
                <p className={styles.meta}>
                  <span>{titleCase(pick.type)}</span>
                  {pick.breedName && (
                    <>
                      <span className={styles.metaDot}>·</span>
                      <span>{pick.breedName}</span>
                    </>
                  )}
                  <span className={styles.metaDot}>·</span>
                  <span>{titleCase(pick.ageGroup)}</span>
                  <span className={styles.metaDot}>·</span>
                  <span>{titleCase(pick.size)}</span>
                </p>
                <p className={styles.rescue}>{pick.rescueName}</p>
                <div className={styles.reasons}>
                  <MatchReasonChips reasons={pick.reasons} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TopPicksPage;

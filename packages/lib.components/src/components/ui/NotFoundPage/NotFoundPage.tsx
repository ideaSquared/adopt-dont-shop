import { Link } from 'react-router';

import * as styles from './NotFoundPage.css';

export type NotFoundSuggestion = {
  to: string;
  label: string;
};

export type NotFoundPageProps = {
  /** Text of the primary link, shown after a house emoji. */
  homeLabel: string;
  /** Destination of the primary link. Defaults to `/`. */
  homeTo?: string;
  /** Optional row of secondary links under the primary one. */
  suggestions?: ReadonlyArray<NotFoundSuggestion>;
};

export const NotFoundPage = ({ homeLabel, homeTo = '/', suggestions = [] }: NotFoundPageProps) => (
  <div className={styles.container}>
    <div className={styles.pawprints}>
      <span>🐾</span>
      <span>🐾</span>
      <span>🐾</span>
    </div>

    <div className={styles.scene}>
      <span className={styles.dog}>
        🐕<span className={styles.nose}>👃</span>
      </span>
      <span className={styles.tail}>〰️</span>
    </div>

    <h1 className={styles.code}>404</h1>
    <h2 className={styles.title}>Ruh-roh! This page ran away</h2>
    <p className={styles.body}>
      Our best sniffer dog is on the case, but it looks like this page has gone to a farm upstate.
      Don&apos;t worry — there are plenty of other pages to love!
    </p>
    <p className={styles.subtitle}>
      &ldquo;Maybe it got adopted? That&apos;s a happy ending, right?&rdquo;
    </p>

    <Link to={homeTo} className={styles.homeLink}>
      🏠 {homeLabel}
    </Link>

    {suggestions.length > 0 && (
      <div className={styles.suggestions}>
        {suggestions.map(suggestion => (
          <Link key={suggestion.to} to={suggestion.to} className={styles.suggestionLink}>
            {suggestion.label}
          </Link>
        ))}
      </div>
    )}
  </div>
);

NotFoundPage.displayName = 'NotFoundPage';

export default NotFoundPage;

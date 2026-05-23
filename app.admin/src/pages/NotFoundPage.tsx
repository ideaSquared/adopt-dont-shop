import { Link } from 'react-router-dom';

import * as styles from './NotFoundPage.css';

const NotFoundPage = () => (
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

    <Link to='/' className={styles.homeLink}>
      🏠 Back to dashboard
    </Link>
  </div>
);

export default NotFoundPage;

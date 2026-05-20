import { Link } from 'react-router-dom';

import * as styles from './NotFoundPage.css';

// ADS-480: catch-all 404 page rendered when no other route matches.
const NotFoundPage = () => (
  <div className={styles.container}>
    <h1 className={styles.code}>404</h1>
    <h2 className={styles.title}>Page not found</h2>
    <p className={styles.body}>
      We couldn&apos;t find the page you were looking for. It may have moved or no longer exists.
    </p>
    <Link to="/" className={styles.homeLink}>
      Go back to dashboard
    </Link>
  </div>
);

export default NotFoundPage;

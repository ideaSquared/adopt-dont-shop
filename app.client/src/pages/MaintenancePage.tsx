import * as styles from './MaintenancePage.css';

export const MaintenancePage = () => (
  <div className={styles.container}>
    <div className={styles.scene}>
      <span className={styles.cat}>😸🔧</span>
      <span className={styles.zzzBubble}>💤</span>
      <span className={styles.zzzBubbleDelayed}>💤</span>
    </div>

    <span className={styles.hardhat}>🚧</span>

    <h1 className={styles.title}>We&apos;re grooming the servers!</h1>
    <p className={styles.body}>
      Our team of highly trained cats is batting important cables around right
      now. We&apos;ll be back before you can say &ldquo;pspspsps.&rdquo;
    </p>
    <p className={styles.subtitle}>
      &ldquo;Have you tried turning it off and sitting on it?&rdquo; — The cats, probably
    </p>

    <div className={styles.progressBar}>
      <div className={styles.progressFill} />
    </div>

    <div className={styles.statusRow}>
      <span className={styles.statusDot} />
      Maintenance in progress — we&apos;ll be back shortly
    </div>

    <div className={styles.critters}>
      <span>🐱</span>
      <span>🐶</span>
      <span>🐰</span>
      <span>🐹</span>
      <span>🦜</span>
    </div>
  </div>
);

export default MaintenancePage;

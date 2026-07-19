import * as styles from './HomePage.css';

export const HomePage = () => {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Welcome to {{APP_NAME}}</h1>
        <p className={styles.subtitle}>Your new React application is ready!</p>

        <div className={styles.templateInfo}>
          <strong>Template:</strong> {{TEMPLATE_NAME}} - {{TEMPLATE_DESCRIPTION}}
        </div>
      </section>

      <div className={styles.featuresGrid}>
        {{{TEMPLATE_FEATURES_JSON}}.map((feature, index) => (
          <div className={styles.featureCard} key={index}>
            <div className={styles.featureIcon}>✨</div>
            <h3 className={styles.featureTitle}>{feature}</h3>
            <p className={styles.featureDescription}>
              {feature} is ready to use in your application.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

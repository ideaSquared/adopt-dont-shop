import * as styles from './TypingIndicator.css';

type TypingIndicatorProps = {
  userName: string;
};

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  return (
    <div className={styles.typingContainer}>
      <span>{userName} is typing</span>
      <div className={styles.typingDots}>
        <div className={styles.dot.delay0} />
        <div className={styles.dot.delay1} />
        <div className={styles.dot.delay2} />
      </div>
    </div>
  );
}

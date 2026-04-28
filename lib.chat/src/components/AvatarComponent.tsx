import * as styles from './AvatarComponent.css';

export function AvatarComponent({ initials }: { initials: string }) {
  return (
    <div className={styles.avatar} aria-label={'Sender initials'}>
      {initials}
    </div>
  );
}

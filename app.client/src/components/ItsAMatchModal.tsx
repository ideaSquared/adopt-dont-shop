import { Modal } from '@adopt-dont-shop/lib.components';
import { Link } from 'react-router-dom';
import * as styles from './ItsAMatchModal.css';

// ADS-633: Tinder-style "It's a Match!" celebration shown when the rescue
// acknowledges an application (moves it from `submitted` to any other status).
// Visual-only: receives the pet name + image + conversation link and an
// onClose handler. State + persistence live in MatchAcknowledgementContext.

export type ItsAMatchModalProps = {
  isOpen: boolean;
  petName: string;
  petImageUrl?: string;
  conversationHref: string;
  onClose: () => void;
};

export const ItsAMatchModal = ({
  isOpen,
  petName,
  petImageUrl,
  conversationHref,
  onClose,
}: ItsAMatchModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='sm'
      showCloseButton={false}
      closeOnOverlayClick={false}
      data-testid='its-a-match-modal'
    >
      <div className={styles.celebration}>
        <h2 className={styles.headline}>It&apos;s a Match!</h2>
        <p className={styles.subhead}>{petName}&apos;s rescue is reviewing your application.</p>

        <div className={styles.photoFrame}>
          {petImageUrl ? (
            <img className={styles.photo} src={petImageUrl} alt={petName} />
          ) : (
            <div className={styles.photoPlaceholder} aria-hidden='true'>
              {petName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h3 className={styles.petName}>{petName}</h3>

        <div className={styles.buttonGroup}>
          <Link
            to={conversationHref}
            className={styles.primaryButton}
            onClick={onClose}
            data-testid='its-a-match-cta'
          >
            Open conversation
          </Link>
          <button type='button' className={styles.dismissButton} onClick={onClose}>
            Maybe later
          </button>
        </div>
      </div>
    </Modal>
  );
};

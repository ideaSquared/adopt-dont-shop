import React from 'react';
import type { Pet } from '@/services';
import * as styles from './PetHeroCard.css';
import { resolveFileUrl } from '@/utils/fileUtils';

type Props = {
  pet: Pet;
  heading: string;
  subheading?: string;
};

const typeEmoji = (type: string): string => {
  switch (type) {
    case 'dog':
      return '🐶';
    case 'cat':
      return '🐱';
    case 'rabbit':
      return '🐰';
    case 'bird':
      return '🐦';
    default:
      return '🐾';
  }
};

export const PetHeroCard: React.FC<Props> = ({ pet, heading, subheading }) => {
  const imageUrl = resolveFileUrl(pet.images?.[0]?.url);
  const rescueName = pet.rescue?.name ?? 'this rescue';

  return (
    <div className={styles.card}>
      <div className={styles.imageWrap}>
        {imageUrl ? (
          <img className={styles.petImage} src={imageUrl} alt={pet.name} loading='lazy' />
        ) : (
          <div className={styles.placeholderIcon} aria-hidden='true'>
            {typeEmoji(pet.type)}
          </div>
        )}
      </div>
      <div className={styles.content}>
        <p className={styles.eyebrow}>From {rescueName}</p>
        <h2 className={styles.heading}>{heading}</h2>
        {subheading && <p className={styles.subheading}>{subheading}</p>}
      </div>
    </div>
  );
};

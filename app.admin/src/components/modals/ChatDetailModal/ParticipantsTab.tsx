import React from 'react';
import * as styles from '../ChatDetailModal.css';
import { type Participant } from '@adopt-dont-shop/lib.chat';
import { FiUsers } from 'react-icons/fi';

type ParticipantsTabProps = {
  participants: Participant[];
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export const ParticipantsTab: React.FC<ParticipantsTabProps> = ({ participants }) => {
  if (participants.length === 0) {
    return (
      <div className={styles.emptyState}>
        <FiUsers />
        <div>No participants found</div>
      </div>
    );
  }

  return (
    <div className={styles.participantList}>
      {participants.map(participant => (
        <div key={participant.id} className={styles.participantCard}>
          <div className={styles.participantAvatar}>{getInitials(participant.name)}</div>
          <div className={styles.participantInfo}>
            <div className={styles.participantName}>{participant.name}</div>
            <div className={styles.participantRole}>{participant.type}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

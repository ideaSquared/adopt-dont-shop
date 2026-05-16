import React from 'react';
import * as styles from '../ChatDetailModal.css';
import { type Conversation } from '@adopt-dont-shop/lib.chat';
import { FiInfo, FiClock, FiUsers, FiMessageSquare } from 'react-icons/fi';

type DetailsTabProps = {
  conversation: Conversation;
  getStatusBadge: (status?: string) => React.ReactNode;
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const DetailsTab: React.FC<DetailsTabProps> = ({ conversation, getStatusBadge }) => (
  <div className={styles.detailGrid}>
    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>
        <FiInfo />
        Chat ID
      </div>
      <div className={styles.detailValue}>{conversation.id}</div>
    </div>

    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>Status</div>
      <div className={styles.detailValue}>{getStatusBadge(conversation.status)}</div>
    </div>

    {conversation.rescueName && (
      <div className={styles.detailItem}>
        <div className={styles.detailLabel}>Rescue</div>
        <div className={styles.detailValue}>{conversation.rescueName}</div>
      </div>
    )}

    {conversation.petId && (
      <div className={styles.detailItem}>
        <div className={styles.detailLabel}>Pet ID</div>
        <div className={styles.detailValue}>{conversation.petId}</div>
      </div>
    )}

    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>
        <FiClock />
        Created
      </div>
      <div className={styles.detailValue}>{formatTimestamp(conversation.createdAt)}</div>
    </div>

    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>
        <FiClock />
        Last Updated
      </div>
      <div className={styles.detailValue}>{formatTimestamp(conversation.updatedAt)}</div>
    </div>

    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>
        <FiUsers />
        Participants
      </div>
      <div className={styles.detailValue}>{conversation.participants.length}</div>
    </div>

    {conversation.lastMessage && (
      <div className={styles.detailItem}>
        <div className={styles.detailLabel}>
          <FiMessageSquare />
          Last Message
        </div>
        <div className={styles.detailValue}>
          {formatTimestamp(conversation.lastMessage.timestamp || '')}
        </div>
      </div>
    )}
  </div>
);

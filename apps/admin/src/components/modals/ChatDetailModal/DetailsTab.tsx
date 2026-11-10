import React from 'react';
import { Link } from 'react-router';
import * as styles from '../ChatDetailModal.css';
import { type Conversation } from '@adopt-dont-shop/lib.chat';
import { Clock, Info, MessageSquare, Users } from 'lucide-react';
import { formatChatTimestamp } from './format-chat-timestamp';

type DetailsTabProps = {
  conversation: Conversation;
  getStatusBadge: (status?: string) => React.ReactNode;
  onClose: () => void;
};

export const DetailsTab: React.FC<DetailsTabProps> = ({
  conversation,
  getStatusBadge,
  onClose,
}) => (
  <div className={styles.detailGrid}>
    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>
        <Info size='1em' />
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
        <div className={styles.detailValue}>
          {conversation.rescueId ? (
            <Link
              to={`/rescues/${conversation.rescueId}`}
              onClick={onClose}
              className={styles.entityLink}
            >
              {conversation.rescueName}
            </Link>
          ) : (
            conversation.rescueName
          )}
        </div>
      </div>
    )}

    {conversation.petId && (
      <div className={styles.detailItem}>
        <div className={styles.detailLabel}>Pet</div>
        <div className={styles.detailValue}>
          <Link to={`/pets/${conversation.petId}`} onClick={onClose} className={styles.entityLink}>
            {conversation.petName || 'View pet'}
          </Link>
        </div>
      </div>
    )}

    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>
        <Clock size='1em' />
        Created
      </div>
      <div className={styles.detailValue}>{formatChatTimestamp(conversation.createdAt)}</div>
    </div>

    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>
        <Clock size='1em' />
        Last Updated
      </div>
      <div className={styles.detailValue}>{formatChatTimestamp(conversation.updatedAt)}</div>
    </div>

    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>
        <Users size='1em' />
        Participants
      </div>
      <div className={styles.detailValue}>{conversation.participants.length}</div>
    </div>

    {conversation.lastMessage && (
      <div className={styles.detailItem}>
        <div className={styles.detailLabel}>
          <MessageSquare size='1em' />
          Last Message
        </div>
        <div className={styles.detailValue}>
          {formatChatTimestamp(conversation.lastMessage.timestamp || '')}
        </div>
      </div>
    )}
  </div>
);

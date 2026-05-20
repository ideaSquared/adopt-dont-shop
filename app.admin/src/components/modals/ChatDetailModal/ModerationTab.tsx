import React, { useState, useEffect } from 'react';
import * as styles from '../ChatDetailModal.css';
import { Button, toast } from '@adopt-dont-shop/lib.components';
import { type Conversation, type Participant } from '@adopt-dont-shop/lib.chat';
import { moderationService, type Report } from '@adopt-dont-shop/lib.moderation';
import { FiFlag, FiFileText, FiInfo, FiAlertTriangle } from 'react-icons/fi';

type ModerationTabProps = {
  chat: Conversation;
  chatId: string;
};

export const ModerationTab: React.FC<ModerationTabProps> = ({ chat, chatId }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [flaggingConversation, setFlaggingConversation] = useState(false);

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const result = await moderationService.getReports({
        reportedEntityType: 'conversation',
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setReports(result.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [chatId]);

  const handleFlagConversation = async () => {
    setFlaggingConversation(true);
    try {
      await moderationService.createReport({
        reportedEntityType: 'conversation',
        reportedEntityId: chatId,
        category: 'inappropriate_content',
        title: 'Flagged conversation',
        description: 'Flagged from admin chat management interface for moderator review',
      });
      await fetchReports();
      toast.success('Conversation flagged successfully');
    } catch (error) {
      console.error('Failed to flag conversation:', error);
      toast.error('Failed to flag conversation. Please try again.', {
        action: {
          label: 'Retry',
          onClick: () => {
            void handleFlagConversation();
          },
        },
      });
    } finally {
      setFlaggingConversation(false);
    }
  };

  return (
    <div className={styles.detailGrid}>
      <div className={styles.detailItem}>
        <div className={styles.detailLabel}>
          <FiFlag />
          Flag Conversation
        </div>
        <div className={styles.detailValue}>
          <Button
            onClick={handleFlagConversation}
            variant='warning'
            disabled={flaggingConversation}
          >
            {flaggingConversation ? 'Flagging...' : 'Report This Conversation'}
          </Button>
          <p className={styles.moderationHelpText}>
            Flag this conversation for moderator review if it contains inappropriate content, spam,
            harassment, or policy violations.
          </p>
        </div>
      </div>

      <div className={styles.detailItem}>
        <div className={styles.detailLabel}>
          <FiFileText />
          Existing Reports ({reports.length})
        </div>
        <div className={styles.detailValue}>
          {loadingReports ? (
            'Loading reports...'
          ) : reports.length > 0 ? (
            <div className={styles.reportList}>
              {reports.map(report => (
                <div key={report.reportId} className={styles.reportCard}>
                  <div className={styles.reportCardHeader}>
                    <strong className={styles.reportCategoryLabel}>
                      {report.category.replace('_', ' ')}
                    </strong>
                    <span
                      className={styles.reportStatusBadge}
                      style={{
                        backgroundColor:
                          report.status === 'resolved'
                            ? '#d1fae5'
                            : report.status === 'under_review'
                              ? '#fef3c7'
                              : '#fee2e2',
                        color:
                          report.status === 'resolved'
                            ? '#065f46'
                            : report.status === 'under_review'
                              ? '#92400e'
                              : '#991b1b',
                      }}
                    >
                      {report.status}
                    </span>
                  </div>
                  <div className={styles.reportDescription}>
                    {report.description || 'No description provided'}
                  </div>
                  <div className={styles.reportMeta}>
                    Reported: {new Date(report.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noReportsMessage}>No reports filed for this conversation</div>
          )}
        </div>
      </div>

      <div className={styles.detailItem}>
        <div className={styles.detailLabel}>
          <FiInfo />
          Full Moderation History
        </div>
        <div className={styles.detailValue}>
          <a
            href={`/moderation?entity=conversation&id=${chatId}`}
            className={styles.moderationLink}
          >
            View in Moderation Dashboard →
          </a>
          <p className={styles.moderationHelpText}>
            View complete moderation history, take actions, and manage reports in the dedicated
            moderation interface.
          </p>
        </div>
      </div>

      <div className={styles.detailItem}>
        <div className={styles.detailLabel}>
          <FiAlertTriangle />
          Participant Actions
        </div>
        <div className={styles.detailValue}>
          {chat.participants && chat.participants.length > 0 ? (
            <div>
              <p className={styles.participantHelpText}>Moderate individual participants:</p>
              <ul className={styles.moderationParticipantList}>
                {chat.participants.map((participant: Participant) => (
                  <li key={participant.id} className={styles.participantRow}>
                    <span>
                      {participant.name} ({participant.type})
                    </span>
                    <a
                      href={`/moderation?user=${participant.id}`}
                      className={styles.participantViewLink}
                    >
                      View User
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            'No participants to moderate'
          )}
        </div>
      </div>
    </div>
  );
};

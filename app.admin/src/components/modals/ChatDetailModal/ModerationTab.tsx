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
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
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
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {reports.map(report => (
                <div
                  key={report.reportId}
                  style={{
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '0.375rem',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <strong style={{ textTransform: 'capitalize' }}>
                      {report.category.replace('_', ' ')}
                    </strong>
                    <span
                      style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
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
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {report.description || 'No description provided'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    Reported: {new Date(report.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
              No reports filed for this conversation
            </div>
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
            style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}
            onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            View in Moderation Dashboard →
          </a>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
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
              <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                Moderate individual participants:
              </p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {chat.participants.map((participant: Participant) => (
                  <li
                    key={participant.id}
                    style={{
                      padding: '0.5rem',
                      marginBottom: '0.25rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '0.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      {participant.name} ({participant.type})
                    </span>
                    <a
                      href={`/moderation?user=${participant.id}`}
                      style={{ fontSize: '0.875rem', color: '#2563eb' }}
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

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as styles from '../ChatDetailModal.css';
import { Button, ErrorState, Spinner, StatusBadge, toast } from '@adopt-dont-shop/lib.components';
import { type Conversation, type Participant } from '@adopt-dont-shop/lib.chat';
import { moderationService } from '@adopt-dont-shop/lib.moderation';
import { formatDateTime } from '@adopt-dont-shop/lib.utils';
import { FileText, Flag, Info, TriangleAlert } from 'lucide-react';

type ModerationTabProps = {
  chat: Conversation;
  chatId: string;
};

export const ModerationTab: React.FC<ModerationTabProps> = ({ chat, chatId }) => {
  const queryClient = useQueryClient();
  const reportsKey = ['moderation', 'conversation-reports', chatId];

  const {
    data,
    isLoading: loadingReports,
    error: reportsError,
    refetch,
  } = useQuery({
    queryKey: reportsKey,
    queryFn: () =>
      moderationService.getReports({
        reportedEntityType: 'conversation',
        reportedEntityId: chatId,
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });
  const reports = data?.data ?? [];
  const totalReports = data?.pagination.total ?? 0;

  const flagConversation = useMutation({
    mutationFn: () =>
      moderationService.createReport({
        reportedEntityType: 'conversation',
        reportedEntityId: chatId,
        category: 'inappropriate_content',
        title: 'Flagged conversation',
        description: 'Flagged from admin chat management interface for moderator review',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: reportsKey });
      toast.success('Conversation flagged successfully');
    },
    onError: () => {
      toast.error('Failed to flag conversation. Please try again.', {
        action: {
          label: 'Retry',
          onClick: () => flagConversation.mutate(),
        },
      });
    },
  });
  const flaggingConversation = flagConversation.isPending;

  const handleFlagConversation = () => flagConversation.mutate();

  return (
    <div className={styles.detailGrid}>
      <div className={styles.detailItem}>
        <div className={styles.detailLabel}>
          <Flag size='1em' />
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
          <FileText size='1em' />
          Existing Reports ({totalReports})
        </div>
        <div className={styles.detailValue}>
          {loadingReports ? (
            <Spinner size='sm' label='Loading reports' />
          ) : reportsError ? (
            <ErrorState message='Failed to load reports.' onRetry={() => void refetch()} />
          ) : reports.length > 0 ? (
            <div className={styles.reportList}>
              {reports.map(report => (
                <div key={report.reportId} className={styles.reportCard}>
                  <div className={styles.reportCardHeader}>
                    <strong className={styles.reportCategoryLabel}>
                      {report.category.replace('_', ' ')}
                    </strong>
                    <StatusBadge kind='report' status={report.status} />
                  </div>
                  <div className={styles.reportDescription}>
                    {report.description || 'No description provided'}
                  </div>
                  <div className={styles.reportMeta}>
                    Reported: {formatDateTime(report.createdAt)}
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
          <Info size='1em' />
          Full Moderation History
        </div>
        <div className={styles.detailValue}>
          <a
            href={`/moderation?entityType=conversation&entityId=${encodeURIComponent(chatId)}`}
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
          <TriangleAlert size='1em' />
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
                    <a href={`/users/${participant.id}`} className={styles.participantViewLink}>
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

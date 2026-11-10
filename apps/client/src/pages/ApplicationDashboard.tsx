import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  StatusBadge,
} from '@adopt-dont-shop/lib.components';
import { ApplicationCardSkeletonList } from '@/components/skeletons';
import { formatDisplayDate, resolveFileUrl } from '@adopt-dont-shop/lib.utils';
import { useChat } from '@/contexts/ChatContext';
import { useUnreadConversations } from '@adopt-dont-shop/lib.chat';
import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { type Pet } from '@/services';
import { useUserApplications, type ApplicationWithPet } from '@/hooks/useUserApplications';
import * as styles from './ApplicationDashboard.css';

// ADS C4 (follow-up to PR #676): the backend's ApplicationStage enum carries
// the in-progress workflow state alongside the terminal `status`. Surface a
// human-readable label only for stages an adopter would meaningfully see
// while status is still 'submitted' — `resolved`/`withdrawn` map to a
// terminal status badge instead. `pending` covers freshly submitted
// applications that haven't been picked up for review yet.
const IN_PROGRESS_STAGE_LABELS: Record<string, string> = {
  pending: 'Application pending',
  reviewing: 'Application under review',
  visiting: 'Home visit scheduled',
  deciding: 'Awaiting decision',
};

const getPrimaryThumbnailUrl = (pet: Pet | undefined): string | undefined => {
  const primary = pet?.images?.find(img => img.is_primary) ?? pet?.images?.[0];
  return resolveFileUrl(primary?.thumbnail_url ?? primary?.url);
};

export const ApplicationDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { conversations } = useChat();
  const { unreadByConversationId } = useUnreadConversations();
  const applicationsQuery = useUserApplications(user?.userId);
  const applications = applicationsQuery.data ?? [];
  const loading = applicationsQuery.isLoading;
  const error = applicationsQuery.isError
    ? 'Failed to load your applications. Please try again.'
    : null;

  // Map an application to the corresponding conversation (if any).
  // Conversations are tagged with petId + rescueId server-side; we use both
  // because a rescue can have many pets and an adopter could have multiple
  // open threads with the same rescue.
  const conversationByApplicationId = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const application of applications) {
      const match = conversations.find(
        c => c.petId === application.petId && c.rescueId === application.rescueId
      );
      if (match) {
        lookup[application.id] = match.id;
      }
    }
    return lookup;
  }, [applications, conversations]);

  const handleApplicationClick = (application: ApplicationWithPet) => {
    // Navigate to application details view
    navigate(`/applications/${application.id}`);
  };

  const handleOpenMessages = (
    event: React.MouseEvent<HTMLButtonElement>,
    conversationId: string
  ) => {
    event.stopPropagation();
    navigate(`/chat/${conversationId}`);
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>Please log in to view your applications</h2>
          <Link to='/login'>
            <Button>Log In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <PageHeader title='My Applications' />
        <ApplicationCardSkeletonList count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <ErrorState
          title='Error loading applications'
          message={error}
          onRetry={() => void applicationsQuery.refetch()}
        />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className={styles.container}>
        <PageHeader title='My Applications' />
        <EmptyState
          title='No applications yet'
          description='Start your adoption journey by browsing available pets.'
          actions={[{ label: 'Browse Pets', onClick: () => navigate('/search') }]}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader title='My Applications' />

      <div className={styles.applicationGrid}>
        {applications.map(application => {
          const thumbnailUrl = getPrimaryThumbnailUrl(application.pet);
          const rescueName = application.pet?.rescue?.name;
          const conversationId = conversationByApplicationId[application.id];
          const unread = conversationId ? (unreadByConversationId[conversationId] ?? 0) : 0;

          return (
            <Card
              key={application.id}
              className={styles.applicationCard}
              onClick={() => handleApplicationClick(application)}
            >
              <div className={styles.cardTopRow}>
                <div className={styles.petInfo}>
                  {thumbnailUrl ? (
                    <img
                      className={styles.petThumbnail}
                      src={thumbnailUrl}
                      alt={application.pet?.name ?? 'Pet'}
                    />
                  ) : (
                    <div className={styles.petThumbnailPlaceholder} aria-hidden='true'>
                      No photo
                    </div>
                  )}
                  <div>
                    <h3 className={styles.petDetailsH3}>
                      {application.pet?.name || 'Unknown pet'}
                    </h3>
                    <p className={styles.petDetailsP}>
                      {application.pet?.breed ?? '—'} • {application.pet?.age_years ?? '—'} years
                      old
                    </p>
                    {rescueName && <p className={styles.rescueName}>{rescueName}</p>}
                  </div>
                </div>

                {conversationId && (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={event => handleOpenMessages(event, conversationId)}
                    aria-label={
                      unread > 0 ? `Messages from rescue: ${unread} unread` : 'Messages from rescue'
                    }
                  >
                    Messages
                    {unread > 0 && (
                      <Badge variant='count' size='xs' max={99} data-testid='unread-badge'>
                        {unread}
                      </Badge>
                    )}
                  </Button>
                )}
              </div>

              <StatusBadge kind='application' status={application.status} />

              {/* ADS C4 (follow-up to PR #676): while the terminal status is
                  still 'submitted', show the workflow stage so adopters can
                  tell e.g. 'awaiting decision' apart from 'just submitted'.
                  Don't override the terminal badge — approved/rejected/
                  withdrawn carry their own meaning.

                  NOTE: app.client shows BOTH a status badge AND a stage badge
                  here because adopters need to see their application's
                  progress within the 'submitted' status. app.rescue only shows
                  the status badge on its cards (ApplicationCard.tsx) because
                  rescue staff use the dedicated review page for detailed stage
                  info. This is intentional per-role design, not an oversight. */}
              {application.status === 'submitted' &&
                application.stage &&
                IN_PROGRESS_STAGE_LABELS[application.stage] && (
                  <StatusBadge
                    variant='warning'
                    label={IN_PROGRESS_STAGE_LABELS[application.stage]}
                    data-testid='stage-badge'
                  />
                )}

              <div className={styles.applicationDetails}>
                {application.submittedAt && (
                  <p>
                    <strong>Submitted:</strong> {formatDisplayDate(application.submittedAt)}
                  </p>
                )}
                <p>
                  <strong>Last Updated:</strong> {formatDisplayDate(application.updatedAt)}
                </p>
              </div>

              <div className={styles.actionButtons}>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={e => {
                    e.stopPropagation();
                    handleApplicationClick(application);
                  }}
                >
                  View Details
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

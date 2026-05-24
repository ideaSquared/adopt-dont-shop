import { Badge, Button, Card } from '@adopt-dont-shop/lib.components';
import { applicationStatusLabel } from '@adopt-dont-shop/lib.types';
import { useChat } from '@/contexts/ChatContext';
import { useUnreadConversations } from '@adopt-dont-shop/lib.chat';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { applicationService, petService, Application, Pet } from '@/services';
import { resolveFileUrl } from '../utils/fileUtils';
import * as styles from './ApplicationDashboard.css';

interface ApplicationWithPet extends Application {
  pet?: Pet;
}

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
  const [applications, setApplications] = useState<ApplicationWithPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const userApplications = await applicationService.getUserApplications();

      // Load pet details for each application
      const applicationsWithPets = await Promise.all(
        userApplications.map(async app => {
          try {
            const pet = await petService.getPetById(app.petId);
            return { ...app, pet };
          } catch (error) {
            console.error(`Failed to load pet for application ${app.id}:`, error);
            return app;
          }
        })
      );

      setApplications(applicationsWithPets);
    } catch (error) {
      console.error('Failed to load applications:', error);
      setError('Failed to load your applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        <div className={styles.loadingState}>
          <div>Loading your applications...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>Error loading applications</h2>
          <p>{error}</p>
          <Button onClick={loadApplications}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Applications</h1>
        </div>
        <div className={styles.emptyState}>
          <h2>No applications yet</h2>
          <p>Start your adoption journey by browsing available pets.</p>
          <Link to='/pets'>
            <Button>Browse Pets</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Applications</h1>
      </div>

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
                      {application.pet?.breed} • {application.pet?.age_years} years old
                    </p>
                    {rescueName && <p className={styles.rescueName}>{rescueName}</p>}
                  </div>
                </div>

                {conversationId && (
                  <button
                    type='button'
                    className={styles.messagesButton}
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
                  </button>
                )}
              </div>

              <span
                className={styles.statusBadge({
                  // ADS C4-1: `under_review` was previously in this allowlist but
                  // ApplicationStatusSchema only emits 'submitted' | 'approved' |
                  // 'rejected' | 'withdrawn', so the branch was unreachable and the
                  // 'withdrawn' status fell through to the 'default' badge. List the
                  // statuses that can actually appear so withdrawn applications get
                  // their own visual treatment.
                  status: (['submitted', 'approved', 'rejected', 'withdrawn'].includes(
                    application.status
                  )
                    ? application.status
                    : 'default') as 'submitted' | 'approved' | 'rejected' | 'withdrawn' | 'default',
                })}
              >
                {applicationStatusLabel(application.status)}
              </span>

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
                  <span className={styles.stageBadge} data-testid='stage-badge'>
                    {IN_PROGRESS_STAGE_LABELS[application.stage]}
                  </span>
                )}

              <div className={styles.applicationDetails}>
                {application.submittedAt && (
                  <p>
                    <strong>Submitted:</strong>{' '}
                    {new Date(application.submittedAt).toLocaleDateString()}
                  </p>
                )}
                <p>
                  <strong>Last Updated:</strong>{' '}
                  {new Date(application.updatedAt).toLocaleDateString()}
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

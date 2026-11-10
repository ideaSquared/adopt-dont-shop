import { applicationService, type ApplicationWithPetInfo } from '@/services';
import { Alert, Button, PageHeader, StatusBadge, toast } from '@adopt-dont-shop/lib.components';
import { ApplicationDetailSkeleton } from '@/components/skeletons';
import { formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import { useChat } from '@/contexts/ChatContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { WithdrawApplicationModal } from '../components/application';
import * as styles from './ApplicationDetailsPage.css';

export const ApplicationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isOpeningMessages, setIsOpeningMessages] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const { conversations, startConversation } = useChat();

  const applicationQuery = useQuery({
    queryKey: ['applications', id],
    queryFn: () => applicationService.getApplicationById(id ?? ''),
    enabled: !!id,
  });
  const application = applicationQuery.data ?? null;
  const isLoading = applicationQuery.isLoading;
  const error = !id
    ? 'Application ID is required'
    : applicationQuery.isError
      ? 'Failed to load application details. Please try again.'
      : null;

  const withdrawMutation = useMutation({
    mutationFn: (reason?: string) => applicationService.withdrawApplication(id ?? '', reason),
    onSuccess: () => {
      // Reflect the withdrawn status without waiting for a refetch.
      queryClient.setQueryData<ApplicationWithPetInfo>(['applications', id], current =>
        current ? { ...current, status: 'withdrawn' } : current
      );
      toast.success('Application withdrawn successfully');
      setIsWithdrawModalOpen(false);
    },
    // Failures are logged only: the global mutation toast would be a second message.
    onError: err => {
      console.error('Failed to withdraw application:', err);
    },
  });

  const handleWithdraw = async (reason?: string) => {
    if (!application) {
      return;
    }
    await withdrawMutation.mutateAsync(reason).catch(() => undefined);
  };

  const handleMessageRescue = async () => {
    if (!application) {
      return;
    }
    setMessageError(null);

    // Reuse an existing conversation when one already covers this
    // pet + rescue pair; otherwise create a fresh one so the adopter
    // can message the rescue from the application context.
    const existing = conversations.find(
      c => c.petId === application.petId && c.rescueId === application.rescueId
    );

    const returnPath = `/applications/${application.id}`;

    if (existing) {
      navigate(`/chat/${existing.id}`, { state: { from: returnPath } });
      return;
    }

    try {
      setIsOpeningMessages(true);
      const conversation = await startConversation(application.rescueId, application.petId);
      navigate(`/chat/${conversation.id}`, { state: { from: returnPath } });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setMessageError('Failed to start a conversation. Please try again.');
    } finally {
      setIsOpeningMessages(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) {
      return 'Not available';
    }
    return formatDisplayDate(dateString, { includeTime: true });
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <ApplicationDetailSkeleton />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className={styles.container}>
        <Alert variant='error'>{error || 'Application not found'}</Alert>
        <div className={styles.buttonGroup}>
          <Button onClick={() => navigate('/profile')}>Back to Profile</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader
        title='Application Details'
        description={`Application #${application.id.slice(-6)}`}
      />

      <div className={styles.messageRescueRow}>
        <Button
          variant='primary'
          onClick={handleMessageRescue}
          isLoading={isOpeningMessages}
          disabled={isOpeningMessages}
        >
          Message rescue
        </Button>
        {messageError && <Alert variant='error'>{messageError}</Alert>}
      </div>

      {application.status === 'withdrawn' && (
        <Alert variant='info' title='Application Withdrawn'>
          This application was withdrawn. You can still view the details below for your records. If
          you&apos;d like to adopt this pet or another pet, you can submit a new application from
          the pet&apos;s profile page.
        </Alert>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Application Status</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Status</span>
            <span className={styles.infoValue}>
              <StatusBadge kind='application' status={application.status} />
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Submitted</span>
            <span className={styles.infoValue}>{formatDate(application.submittedAt)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Last Updated</span>
            <span className={styles.infoValue}>{formatDate(application.updatedAt)}</span>
          </div>
          {application.reviewedAt && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Reviewed</span>
              <span className={styles.infoValue}>{formatDate(application.reviewedAt)}</span>
            </div>
          )}
          {application.status === 'withdrawn' && application.updatedAt && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Withdrawn On</span>
              <span className={styles.infoValue}>{formatDate(application.updatedAt)}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Pet Information</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Pet</span>
            <span className={styles.infoValue}>
              <Link to={`/pets/${application.petId}`}>{application.petName || 'View pet'}</Link>
            </span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Application Information</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Application ID</span>
            <span className={styles.infoValue}>{application.id}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Rescue</span>
            <span className={styles.infoValue}>
              <Link to={`/rescues/${application.rescueId}`}>
                {application.rescueName || 'View rescue'}
              </Link>
            </span>
          </div>
          {application.reviewNotes && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Review Notes</span>
              <span className={styles.infoValue}>{application.reviewNotes}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <Button onClick={() => navigate('/profile')}>Back to Profile</Button>
        {application.status === 'submitted' && (
          <Button
            variant='secondary'
            onClick={() => setIsWithdrawModalOpen(true)}
            className={styles.withdrawButton}
          >
            Withdraw Application
          </Button>
        )}
        {application.status === 'withdrawn' && (
          <Button variant='primary' onClick={() => navigate('/search')}>
            Browse Available Pets
          </Button>
        )}
      </div>

      <WithdrawApplicationModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onConfirm={handleWithdraw}
        isLoading={withdrawMutation.isPending}
      />
    </div>
  );
};

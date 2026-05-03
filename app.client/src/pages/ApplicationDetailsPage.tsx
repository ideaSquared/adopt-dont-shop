import { applicationService, Application } from '@/services';
import { Alert, Button, Spinner } from '@adopt-dont-shop/lib.components';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WithdrawApplicationModal } from '../components/application';
import * as styles from './ApplicationDetailsPage.css';

export const ApplicationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadApplication = async () => {
      if (!id) {
        setError('Application ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const app = await applicationService.getApplicationById(id);
        setApplication(app);
      } catch (error) {
        console.error('Failed to load application:', error);
        setError('Failed to load application details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadApplication();
  }, [id]);

  const handleWithdraw = async (reason?: string) => {
    if (!application) {
      return;
    }

    setIsWithdrawing(true);
    try {
      await applicationService.withdrawApplication(application.id, reason);

      // Update local state to reflect withdrawn status
      setApplication({ ...application, status: 'withdrawn' });
      setSuccessMessage('Application withdrawn successfully');
      setIsWithdrawModalOpen(false);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Failed to withdraw application:', error);
      // Error handling is done in the modal
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return 'Not available';
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner />
        </div>
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
      <div className={styles.header}>
        <h1>Application Details</h1>
        <p>Application #{application.id.slice(-6)}</p>
      </div>

      {successMessage && (
        <Alert variant='success' title='Success'>
          {successMessage}
        </Alert>
      )}

      {application.status === 'withdrawn' && (
        <Alert variant='info' title='Application Withdrawn'>
          This application has been withdrawn. You can still view the details below for your
          records. If you&apos;d like to adopt this pet or another pet, you can submit a new
          application from the pet&apos;s profile page.
        </Alert>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Application Status</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Status</span>
            <span className={styles.infoValue}>
              <span
                className={styles.statusBadge({
                  status: (['submitted', 'approved', 'rejected', 'withdrawn'].includes(
                    application.status
                  )
                    ? application.status
                    : 'default') as 'submitted' | 'approved' | 'rejected' | 'withdrawn' | 'default',
                })}
              >
                {application.status.replace('_', ' ')}
              </span>
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
          {application.reviewedBy && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Reviewed By</span>
              <span className={styles.infoValue}>{application.reviewedBy}</span>
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
            <span className={styles.infoLabel}>Pet ID</span>
            <span className={styles.infoValue}>{application.petId}</span>
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
            <span className={styles.infoLabel}>Rescue ID</span>
            <span className={styles.infoValue}>{application.rescueId}</span>
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
            style={{
              backgroundColor: '#dc2626',
              borderColor: '#dc2626',
              color: 'white',
            }}
          >
            Withdraw Application
          </Button>
        )}
        {application.status === 'withdrawn' && (
          <Button variant='primary' onClick={() => navigate('/pets')}>
            Browse Available Pets
          </Button>
        )}
      </div>

      <WithdrawApplicationModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onConfirm={handleWithdraw}
        isLoading={isWithdrawing}
      />
    </div>
  );
};

export default ApplicationDetailsPage;

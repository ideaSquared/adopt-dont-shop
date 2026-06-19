import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog, toast, useConfirm } from '@adopt-dont-shop/lib.components';
import { formatStatusName } from '../../utils/statusUtils';
import { useStaff } from '../../hooks/useStaff';
import { fosterService, type FosterPlacement } from '../../services/fosterService';
import StageTransitionModal from './StageTransitionModal';
import { ApplicationStage, STAGE_CONFIG, StageAction } from '../../types/applicationStages';
import { VisitSchedulingContainer } from './VisitScheduling/VisitSchedulingContainer';
import { ReferenceChecksContainer } from './ReferenceChecks/ReferenceChecksContainer';
import { ApplicationTimelineContainer } from './ApplicationTimeline/ApplicationTimelineContainer';
import { ApplicationDetails } from './ApplicationDetails/ApplicationDetails';
import { extractReferences } from './extractReferences';
import * as styles from './ApplicationReview.css';
import type { ApplicationReviewProps } from './applicationReviewTypes';

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  submitted: ['approved', 'rejected', 'withdrawn'],
  approved: [],
  rejected: [],
  withdrawn: [],
  expired: [],
};

const getValidStatusOptions = (currentStatus: string): string[] =>
  VALID_STATUS_TRANSITIONS[currentStatus] || [];

const ApplicationReview: React.FC<ApplicationReviewProps> = ({
  application,
  homeVisits,
  timeline,
  timelineError = null,
  referencesError = null,
  homeVisitsError = null,
  loading,
  error,
  onClose,
  onStatusUpdate,
  onStageTransition,
  onReferenceUpdate,
  onScheduleVisit,
  onUpdateVisit,
  onAddTimelineEvent,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'references' | 'visits' | 'timeline'>(
    'details'
  );
  const [statusNotes, setStatusNotes] = useState('');
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [localApplicationStatus, setLocalApplicationStatus] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showStageTransition, setShowStageTransition] = useState(false);
  const [activePlacementForPet, setActivePlacementForPet] = useState<FosterPlacement | null>(null);

  const petIdForLinks = application?.petId;
  useEffect(() => {
    if (!petIdForLinks) {
      setActivePlacementForPet(null);
      return;
    }
    let cancelled = false;
    fosterService
      .list({ status: 'active' })
      .then(placements => {
        if (cancelled) {
          return;
        }
        setActivePlacementForPet(placements.find(p => p.petId === petIdForLinks) ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setActivePlacementForPet(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [petIdForLinks]);

  useEffect(() => {
    setLocalApplicationStatus(null);
  }, [application?.id]);

  useEffect(() => {
    if (
      application?.status &&
      localApplicationStatus &&
      application.status !== localApplicationStatus
    ) {
      setLocalApplicationStatus(null);
    }
  }, [application?.status, localApplicationStatus]);

  const { confirm, confirmProps } = useConfirm();
  const { staff, loading: staffLoading } = useStaff();

  const getData = (path: string): unknown => {
    const keys = path.split('.');
    const traverse = (start: unknown): unknown =>
      keys.reduce<unknown>((cur, key) => {
        if (cur === null || cur === undefined || typeof cur !== 'object') {
          return undefined;
        }
        return (cur as Record<string, unknown>)[key];
      }, start);
    const flat = traverse(application?.data);
    return flat !== undefined ? flat : traverse(application?.data?.['data']);
  };

  const getStr = (path: string): string => (getData(path) as string | null | undefined) ?? '';
  const getArr = (path: string): unknown[] => {
    const val = getData(path);
    return Array.isArray(val) ? val : [];
  };

  const extractedReferences = useMemo(
    () => extractReferences(application, getData),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getData depends only on application
    [application]
  );

  const getCurrentStatus = (): string => localApplicationStatus || application?.status || 'unknown';
  const getCurrentStage = (): ApplicationStage => application?.stage || 'PENDING';

  const handleStatusUpdate = async () => {
    if (newStatus === 'rejected') {
      const ok = await confirm({
        title: 'Reject this application?',
        message:
          'The applicant will be notified by email. This action cannot be undone via the status dropdown.',
        confirmText: 'Reject application',
        cancelText: 'Cancel',
        variant: 'danger',
      });
      if (!ok) {
        return;
      }
    } else if (newStatus === 'approved') {
      const ok = await confirm({
        title: 'Approve this application?',
        message:
          'The applicant will be notified by email that their application has been approved. This action cannot be undone via the status dropdown.',
        confirmText: 'Approve application',
        cancelText: 'Cancel',
        variant: 'info',
      });
      if (!ok) {
        return;
      }
    }
    try {
      setIsUpdatingStatus(true);
      await onStatusUpdate(newStatus, statusNotes);
      setLocalApplicationStatus(newStatus);
      onRefresh?.();
      setShowStatusUpdate(false);
      setStatusNotes('');
      setNewStatus('');
    } catch (err) {
      console.error('Failed to update application status:', err);
      toast.error(
        `Failed to update application status: ${err instanceof Error ? err.message : 'Unknown error'}`,
        { action: { label: 'Retry', onClick: handleStatusUpdate } }
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const toggleStatusUpdate = () => {
    setShowStatusUpdate(prev => !prev);
    if (!showStatusUpdate) {
      setNewStatus('');
      setStatusNotes('');
    }
  };

  const handleStageTransition = async (action: StageAction, notes?: string) => {
    try {
      await onStageTransition(action, notes);
      setShowStageTransition(false);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to transition stage:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div
        className={styles.overlay}
        onClick={e => e.target === e.currentTarget && onClose()}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        role="presentation"
      >
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading application details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={styles.overlay}
        onClick={e => e.target === e.currentTarget && onClose()}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        role="presentation"
      >
        <div className={styles.errorContainer}>
          <div className={styles.errorText}>Error loading application</div>
          <p className={styles.errorMessage}>{error}</p>
          <button className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!application) {
    return null;
  }

  const currentStatus = getCurrentStatus();
  const statusVariant = (['submitted', 'approved', 'rejected', 'withdrawn'] as const).includes(
    currentStatus as 'submitted' | 'approved' | 'rejected' | 'withdrawn'
  )
    ? (currentStatus as 'submitted' | 'approved' | 'rejected' | 'withdrawn')
    : 'default';

  return (
    <div
      className={styles.overlay}
      onClick={e => e.target === e.currentTarget && onClose()}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <h2 className={styles.headerTitle}>
                Application for {application.petName || 'Unknown Pet'}
              </h2>
              <p className={styles.headerSubtitle}>
                Submitted by{' '}
                {application.applicantName ||
                  application.userName ||
                  `${getStr('personalInfo.firstName') || 'Unknown'} ${getStr('personalInfo.lastName') || ''}`.trim() ||
                  'Unknown Applicant'}{' '}
                •{' '}
                {application.submittedDaysAgo !== undefined
                  ? application.submittedDaysAgo === 0
                    ? 'Today'
                    : `${application.submittedDaysAgo} days ago`
                  : application.submittedAt
                    ? `${Math.floor((Date.now() - new Date(application.submittedAt).getTime()) / 86400000)} days ago`
                    : 'Recently'}
              </p>
              {petIdForLinks && (
                <p className={styles.headerSubtitle}>
                  <Link to={`/pets?petId=${petIdForLinks}`}>View pet card</Link>
                  {activePlacementForPet && (
                    <>
                      {' · '}
                      <Link to={`/foster?petId=${petIdForLinks}`}>View foster placement</Link>
                    </>
                  )}
                </p>
              )}
            </div>
            <div className={styles.headerRight}>
              <span
                className={styles.stageBadge}
                style={{ background: STAGE_CONFIG[getCurrentStage()]?.color || '#9ca3af' }}
              >
                {STAGE_CONFIG[getCurrentStage()]?.emoji}{' '}
                {STAGE_CONFIG[getCurrentStage()]?.label || getCurrentStage()}
              </span>
              <span className={styles.statusBadge({ status: statusVariant })}>
                {currentStatus !== 'unknown' ? formatStatusName(currentStatus) : 'Unknown Status'}
              </span>
              <button
                className={styles.button({ variant: 'primary' })}
                onClick={() => setShowStageTransition(true)}
              >
                Transition Stage
              </button>
              <button
                className={styles.button({ variant: 'secondary' })}
                onClick={toggleStatusUpdate}
              >
                Update Status
              </button>
              <button className={styles.button({ variant: 'secondary' })} onClick={onClose}>
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Status Update Panel */}
        {showStatusUpdate && (
          <div className={styles.statusUpdateContainer}>
            <div className={styles.formField}>
              <label className={styles.label} htmlFor="status-new-status">
                New Status
              </label>
              <select
                id="status-new-status"
                className={styles.select}
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
              >
                <option value="">Select new status...</option>
                {getValidStatusOptions(currentStatus).map(status => (
                  <option key={status} value={status}>
                    {formatStatusName(status)}
                  </option>
                ))}
              </select>
              {getValidStatusOptions(currentStatus).length === 0 && (
                <p className={styles.noStatusOptionsText}>
                  No status changes available for {formatStatusName(currentStatus)}.
                </p>
              )}
            </div>
            <div className={styles.formField}>
              <label className={styles.label} htmlFor="status-notes">
                Notes (optional)
              </label>
              <textarea
                id="status-notes"
                className={styles.textArea}
                value={statusNotes}
                onChange={e => setStatusNotes(e.target.value)}
                placeholder="Add any notes about this status change..."
              />
            </div>
            <div className={styles.buttonGroup}>
              <button
                className={styles.button({ variant: 'secondary' })}
                onClick={() => setShowStatusUpdate(false)}
              >
                Cancel
              </button>
              <button
                className={styles.button({ variant: 'primary' })}
                onClick={handleStatusUpdate}
                disabled={
                  !newStatus ||
                  getValidStatusOptions(currentStatus).length === 0 ||
                  isUpdatingStatus
                }
              >
                {isUpdatingStatus ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabContainer}>
          <div className={styles.tabList}>
            {(['details', 'references', 'visits', 'timeline'] as const).map(tab => (
              <button
                key={tab}
                className={styles.tab({ active: activeTab === tab })}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'details' && 'Application Details'}
                {tab === 'references' && `References (${extractedReferences.length})`}
                {tab === 'visits' && `Home Visits (${homeVisits.length})`}
                {tab === 'timeline' && `Timeline (${timeline.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className={styles.content}>
          <div className={styles.tabPanel({ active: activeTab === 'details' })}>
            <ApplicationDetails getData={getData} getStr={getStr} getArr={getArr} />
          </div>
          <div className={styles.tabPanel({ active: activeTab === 'references' })}>
            <ReferenceChecksContainer
              references={extractedReferences}
              referencesError={referencesError}
              applicationId={application.id}
              onReferenceUpdate={onReferenceUpdate}
            />
          </div>
          <div className={styles.tabPanel({ active: activeTab === 'visits' })}>
            <VisitSchedulingContainer
              homeVisits={homeVisits}
              homeVisitsError={homeVisitsError}
              staff={staff}
              staffLoading={staffLoading}
              onScheduleVisit={onScheduleVisit}
              onUpdateVisit={onUpdateVisit}
              onRefresh={onRefresh}
            />
          </div>
          <div className={styles.tabPanel({ active: activeTab === 'timeline' })}>
            <ApplicationTimelineContainer
              timeline={timeline}
              timelineError={timelineError}
              onAddTimelineEvent={onAddTimelineEvent}
            />
          </div>
        </div>
      </div>

      {showStageTransition && (
        <StageTransitionModal
          currentStage={getCurrentStage()}
          onClose={() => setShowStageTransition(false)}
          onTransition={handleStageTransition}
        />
      )}

      <ConfirmDialog {...confirmProps} data-testid="reject-confirm-dialog" />
    </div>
  );
};

export default ApplicationReview;

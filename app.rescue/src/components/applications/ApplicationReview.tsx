import React, { useState, useMemo, useEffect } from 'react';
import { formatStatusName } from '../../utils/statusUtils';
import {
  TimelineEventType,
  type ReferenceCheck,
  type HomeVisit,
  type ApplicationTimeline,
} from '../../types/applications';
import { useStaff } from '../../hooks/useStaff';
import StageTransitionModal from './StageTransitionModal';
import { ApplicationStage, STAGE_CONFIG, StageAction } from '../../types/applicationStages';
import * as styles from './ApplicationReview.css';

type ApplicationData = {
  id: string;
  status: string;
  petName?: string;
  applicantName?: string;
  userName?: string;
  submittedDaysAgo?: number;
  submittedAt?: string;
  stage?: ApplicationStage;
  references?: ApplicationReference[];
  data?: Record<string, unknown>;
};

type ApplicationReference = {
  id?: string;
  name?: string;
  relationship?: string;
  phone?: string;
  clinicName?: string;
  status?: 'pending' | 'contacted' | 'completed' | 'failed';
  notes?: string;
  contacted_at?: string;
  contacted_by?: string;
};

interface ApplicationReviewProps {
  application: ApplicationData;
  references: ReferenceCheck[];
  homeVisits: HomeVisit[];
  timeline: ApplicationTimeline[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onStatusUpdate: (status: string, notes?: string) => void;
  onStageTransition: (action: StageAction, notes?: string) => Promise<void>;
  onReferenceUpdate: (referenceId: string, status: string, notes?: string) => void;
  onScheduleVisit: (visitData: {
    scheduledDate: string;
    scheduledTime: string;
    assignedStaff: string;
    notes?: string;
  }) => void;
  onUpdateVisit: (visitId: string, updateData: Record<string, unknown>) => void;
  onAddTimelineEvent: (event: string, description: string, data?: Record<string, unknown>) => void;
  onRefresh?: () => void;
}

const ApplicationReview: React.FC<ApplicationReviewProps> = ({
  application,
  homeVisits,
  timeline,
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
  const [referenceUpdates, setReferenceUpdates] = useState<
    Record<string, { status: string; notes: string; showForm: boolean }>
  >({});

  // Timeline state
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventType, setNewEventType] = useState(TimelineEventType.NOTE_ADDED);
  const [newEventDescription, setNewEventDescription] = useState('');
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  // Local state for optimistic application status updates
  const [localApplicationStatus, setLocalApplicationStatus] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Stage transition state
  const [showStageTransition, setShowStageTransition] = useState(false);

  // Staff data
  const { staff, loading: staffLoading } = useStaff();

  // Home Visits state
  const [showScheduleVisit, setShowScheduleVisit] = useState(false);
  const [visitForm, setVisitForm] = useState({
    scheduledDate: '',
    scheduledTime: '',
    assignedStaff: '',
    notes: '',
  });
  const [isSchedulingVisit, setIsSchedulingVisit] = useState(false);
  const [editingVisit, setEditingVisit] = useState<string | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    scheduledDate: '',
    scheduledTime: '',
    reason: '',
  });
  const [completingVisit, setCompletingVisit] = useState<string | null>(null);
  const [completeForm, setCompleteForm] = useState({
    outcome: '' as 'approved' | 'rejected' | 'conditional' | '',
    notes: '',
    conditions: '',
  });
  const [viewingVisit, setViewingVisit] = useState<string | null>(null);

  // Helper functions for timeline
  const formatTimelineTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const getTimelineIcon = (eventType: string) => {
    switch (eventType) {
      case 'status_change':
        return '📋';
      case 'reference_check':
        return '📞';
      case 'home_visit':
        return '🏠';
      case 'note':
        return '📝';
      case 'system':
        return '⚙️';
      default:
        return '•';
    }
  };

  const getEventTitle = (event: string) => {
    switch (event) {
      case 'status_change':
        return 'Status Updated';
      case 'reference_check':
        return 'Reference Check';
      case 'home_visit':
        return 'Home Visit';
      case 'note':
        return 'Note Added';
      case 'system':
        return 'System Event';
      default:
        // Convert snake_case to Title Case with proper spacing
        return event
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    }
  };

  const handleAddEvent = async () => {
    if (!newEventDescription.trim()) {
      return;
    }

    try {
      setIsAddingEvent(true);
      await onAddTimelineEvent(newEventType, newEventDescription.trim());
      setNewEventDescription('');
      setNewEventType(TimelineEventType.NOTE_ADDED);
      setShowAddEvent(false);
    } catch (error) {
      console.error('Failed to add timeline event:', error);
      alert('Failed to add timeline event. Please try again.');
    } finally {
      setIsAddingEvent(false);
    }
  };

  // Helper function to get valid status transitions based on current status
  const getValidStatusOptions = (currentStatus: string) => {
    const validTransitions: Record<string, string[]> = {
      submitted: ['approved', 'rejected', 'withdrawn'],
      approved: [],
      rejected: [],
      withdrawn: [],
      expired: [],
    };

    return validTransitions[currentStatus] || [];
  };

  // Clear local state when application changes
  useEffect(() => {
    setReferenceUpdates({});
    setLocalApplicationStatus(null); // Clear local status when application changes

    // Clear home visit forms
    setShowScheduleVisit(false);
    setEditingVisit(null);
    setCompletingVisit(null);
    setViewingVisit(null);
    setVisitForm({
      scheduledDate: '',
      scheduledTime: '',
      assignedStaff: '',
      notes: '',
    });
    setRescheduleForm({
      scheduledDate: '',
      scheduledTime: '',
      reason: '',
    });
    setCompleteForm({
      outcome: '',
      notes: '',
      conditions: '',
    });
  }, [application?.id]);

  // Clear local status when application status actually changes from backend
  useEffect(() => {
    if (
      application?.status &&
      localApplicationStatus &&
      application.status !== localApplicationStatus
    ) {
      setLocalApplicationStatus(null); // Backend data has caught up, clear local override
    }
  }, [application?.status, localApplicationStatus]);

  // Get current status (prefer local state for immediate updates)
  const getCurrentStatus = () => {
    return localApplicationStatus || application?.status || 'unknown';
  };

  // Helper function to safely extract data from both legacy nested and current flat structures
  const getData = (path: string): unknown => {
    const keys = path.split('.');
    const traverse = (start: unknown): unknown => {
      let current = start;
      for (const key of keys) {
        if (current === null || current === undefined || typeof current !== 'object') {
          return undefined;
        }
        current = (current as Record<string, unknown>)[key];
      }
      return current;
    };
    const flat = traverse(application?.data);
    return flat !== undefined ? flat : traverse(application?.data?.['data']);
  };

  const getStr = (path: string): string => (getData(path) as string | null | undefined) ?? '';
  const getArr = (path: string): unknown[] => {
    const val = getData(path);
    return Array.isArray(val) ? val : [];
  };

  // Extract references from application data
  const extractedReferences: ReferenceCheck[] = useMemo(() => {
    const allRefs: ReferenceCheck[] = [];

    // First, try to get references from the main references array (backend format)
    const directReferences = application?.references || [];
    if (Array.isArray(directReferences) && directReferences.length > 0) {
      directReferences.forEach((ref: ApplicationReference, index: number) => {
        allRefs.push({
          id: ref.id || `ref-${index}`, // Use the reference ID if available, fallback to index-based ID
          applicationId: application.id,
          type: ref.relationship?.toLowerCase().includes('vet') ? 'veterinarian' : 'personal',
          contactName: ref.name ?? '',
          contactInfo: `${ref.phone} - ${ref.relationship}`,
          status: ref.status || 'pending',
          notes: ref.notes || '',
          completedAt: ref.contacted_at,
          completedBy: ref.contacted_by,
        });
      });
    } else {
      // Fallback: try to get references from nested client data structure
      const clientRefs = (getData('references') ?? {}) as Record<string, unknown>;
      const personalRefs = Array.isArray(clientRefs['personal'])
        ? (clientRefs['personal'] as ApplicationReference[])
        : [];
      const vetRef = clientRefs['veterinarian'] as ApplicationReference | undefined;

      let referenceIndex = 0;

      // Add veterinarian reference if exists
      if (vetRef && vetRef.name && vetRef.name !== 'To be determined') {
        allRefs.push({
          id: `ref-${referenceIndex}`,
          applicationId: application.id,
          type: 'veterinarian',
          contactName: vetRef.name,
          contactInfo: `${vetRef.phone || 'No phone'} - ${vetRef.clinicName || 'Veterinarian'}`,
          status: vetRef.status || 'pending',
          notes: vetRef.notes || '',
          completedAt: vetRef.contacted_at,
          completedBy: vetRef.contacted_by,
        });
        referenceIndex++;
      }

      // Add personal references
      personalRefs.forEach((ref: ApplicationReference) => {
        if (ref.name) {
          allRefs.push({
            id: `ref-${referenceIndex}`,
            applicationId: application.id,
            type: 'personal',
            contactName: ref.name,
            contactInfo: `${ref.phone || 'No phone'} - ${ref.relationship || 'Personal Reference'}`,
            status: ref.status || 'pending',
            notes: ref.notes || '',
            completedAt: ref.contacted_at,
            completedBy: ref.contacted_by,
          });
          referenceIndex++;
        }
      });
    }

    // References found and processed

    return allRefs;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getData depends only on application, which is already listed
  }, [application]);

  const handleReferenceUpdate = async (referenceId: string, status: string, notes: string) => {
    try {
      await onReferenceUpdate(referenceId, status, notes);

      // Hide the form after successful update
      setReferenceUpdates(prev => ({
        ...prev,
        [referenceId]: {
          ...prev[referenceId],
          showForm: false,
          status, // Update the local status immediately
          notes, // Update the local notes immediately
        },
      }));
    } catch (error) {
      console.error('Failed to update reference:', error);
      // Show user-friendly error message
      alert(
        `Failed to update reference: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const toggleReferenceForm = (referenceId: string) => {
    setReferenceUpdates(prev => ({
      ...prev,
      [referenceId]: {
        status: prev[referenceId]?.status || 'pending',
        notes: prev[referenceId]?.notes || '',
        showForm: !prev[referenceId]?.showForm,
      },
    }));
  };

  const updateReferenceField = (referenceId: string, field: 'status' | 'notes', value: string) => {
    setReferenceUpdates(prev => ({
      ...prev,
      [referenceId]: {
        ...prev[referenceId],
        [field]: value,
      },
    }));
  };

  // Home Visit Handlers
  const handleScheduleVisit = async () => {
    try {
      setIsSchedulingVisit(true);
      await onScheduleVisit({
        scheduledDate: visitForm.scheduledDate,
        scheduledTime: visitForm.scheduledTime,
        assignedStaff: visitForm.assignedStaff,
        notes: visitForm.notes,
      });

      // Reset form and close modal
      setVisitForm({
        scheduledDate: '',
        scheduledTime: '',
        assignedStaff: '',
        notes: '',
      });
      setShowScheduleVisit(false);

      // Refresh data if callback provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to schedule visit:', error);
      alert(
        `Failed to schedule visit: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsSchedulingVisit(false);
    }
  };

  const handleMarkVisitInProgress = async (visitId: string) => {
    try {
      await onUpdateVisit(visitId, {
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      });

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to mark visit as in progress:', error);
      alert(`Failed to update visit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRescheduleVisit = async (visitId: string) => {
    try {
      // Just update the date/time, stay in 'scheduled' status
      await onUpdateVisit(visitId, {
        scheduledDate: rescheduleForm.scheduledDate,
        scheduledTime: rescheduleForm.scheduledTime,
        notes: rescheduleForm.reason ? `Rescheduled: ${rescheduleForm.reason}` : undefined,
      });

      // Reset form and close modal
      setRescheduleForm({
        scheduledDate: '',
        scheduledTime: '',
        reason: '',
      });
      setEditingVisit(null);

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to reschedule visit:', error);
      alert(
        `Failed to reschedule visit: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleCompleteVisit = async (visitId: string) => {
    try {
      const updateData: Record<string, unknown> = {
        status: 'completed',
        outcome: completeForm.outcome,
        notes: completeForm.notes,
        completedAt: new Date().toISOString(),
      };

      if (completeForm.outcome === 'conditional' && completeForm.conditions) {
        updateData.conditions = completeForm.conditions;
      }

      await onUpdateVisit(visitId, updateData);

      // Reset form and close modal
      setCompleteForm({
        outcome: '',
        notes: '',
        conditions: '',
      });
      setCompletingVisit(null);

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to complete visit:', error);
      alert(
        `Failed to complete visit: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleCancelVisit = async (visitId: string) => {
    const reason = prompt('Please enter a reason for cancelling this visit:');
    if (!reason) {
      return; // User cancelled or didn't provide reason
    }

    try {
      await onUpdateVisit(visitId, {
        status: 'cancelled',
        cancelReason: reason,
        cancelledAt: new Date().toISOString(),
      });

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to cancel visit:', error);
      alert(`Failed to cancel visit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div
        className={styles.overlay}
        onClick={e => e.target === e.currentTarget && onClose()}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
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
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
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

  const handleStatusUpdate = async () => {
    try {
      setIsUpdatingStatus(true);
      await onStatusUpdate(newStatus, statusNotes);

      // Update local status immediately after successful backend update
      setLocalApplicationStatus(newStatus);

      // Refresh the application data in the background
      if (onRefresh) {
        onRefresh();
      }

      setShowStatusUpdate(false);
      setStatusNotes('');
      setNewStatus(''); // Reset status selection
    } catch (error) {
      console.error('Failed to update application status:', error);
      // Show user-friendly error message
      alert(
        `Failed to update application status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const toggleStatusUpdate = () => {
    setShowStatusUpdate(!showStatusUpdate);
    if (!showStatusUpdate) {
      setNewStatus(''); // Reset status selection when opening
      setStatusNotes('');
    }
  };

  // Get current stage from application
  const getCurrentStage = (): ApplicationStage => {
    return application?.stage || 'PENDING';
  };

  // Handle stage transition
  const handleStageTransition = async (action: StageAction, notes?: string) => {
    try {
      await onStageTransition(action, notes);
      setShowStageTransition(false);

      // Refresh the application data
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to transition stage:', error);
      throw error; // Re-throw to let the modal handle the error display
    }
  };

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
      role="button"
      tabIndex={-1}
      aria-label="Close modal"
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
                    ? `${Math.floor((new Date().getTime() - new Date(application.submittedAt).getTime()) / (1000 * 60 * 60 * 24))} days ago`
                    : 'Recently'}
              </p>
            </div>
            <div className={styles.headerRight}>
              {/* Stage Badge - Prominent display */}
              <span
                className={styles.stageBadge}
                style={{ background: STAGE_CONFIG[getCurrentStage()]?.color || '#9ca3af' }}
              >
                {STAGE_CONFIG[getCurrentStage()]?.emoji}{' '}
                {STAGE_CONFIG[getCurrentStage()]?.label || getCurrentStage()}
              </span>

              {/* Status Badge - Secondary */}
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
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
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
            <button
              className={styles.tab({ active: activeTab === 'details' })}
              onClick={() => setActiveTab('details')}
            >
              Application Details
            </button>
            <button
              className={styles.tab({ active: activeTab === 'references' })}
              onClick={() => setActiveTab('references')}
            >
              References ({extractedReferences.length})
            </button>
            <button
              className={styles.tab({ active: activeTab === 'visits' })}
              onClick={() => setActiveTab('visits')}
            >
              Home Visits ({homeVisits.length})
            </button>
            <button
              className={styles.tab({ active: activeTab === 'timeline' })}
              onClick={() => setActiveTab('timeline')}
            >
              Timeline ({timeline.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className={styles.content}>
          {/* Application Details Tab */}
          <div className={styles.tabPanel({ active: activeTab === 'details' })}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Personal Information</h3>
              <div className={styles.grid}>
                <div className={styles.card}>
                  <h4 className={styles.cardTitle}>Contact Details</h4>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Name</span>
                    <span className={styles.fieldValue}>
                      {getStr('personalInfo.firstName') || 'N/A'}{' '}
                      {getStr('personalInfo.lastName') || ''}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Email</span>
                    <span className={styles.fieldValue}>
                      {getStr('personalInfo.email') || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Phone</span>
                    <span className={styles.fieldValue}>
                      {getStr('personalInfo.phone') || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Address</span>
                    <span className={styles.fieldValue}>
                      {getStr('personalInfo.address') || 'N/A'}
                      <br />
                      {getStr('personalInfo.city') || 'N/A'},{' '}
                      {getStr('personalInfo.state') || 'N/A'}{' '}
                      {getStr('personalInfo.zipCode') || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Date of Birth</span>
                    <span className={styles.fieldValue}>
                      {getStr('personalInfo.dateOfBirth')
                        ? new Date(getStr('personalInfo.dateOfBirth')).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className={styles.card}>
                  <h4 className={styles.cardTitle}>Household</h4>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Household Size</span>
                    <span className={styles.fieldValue}>
                      {getStr('livingsituation.householdSize') || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Housing Type</span>
                    <span className={styles.fieldValue}>
                      {getStr('livingsituation.housingType') || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Own/Rent</span>
                    <span className={styles.fieldValue}>
                      {getData('livingsituation.isOwned') ? 'Own' : 'Rent'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Has Yard</span>
                    <span className={styles.fieldValue}>
                      {getData('livingsituation.hasYard') ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Has Allergies</span>
                    <span className={styles.fieldValue}>
                      {getData('livingsituation.hasAllergies') ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Household Members</span>
                    <span className={styles.fieldValue}>
                      {getArr('answers.household_members').length || 0} members
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Pet Preferences & Experience</h3>
              <div className={styles.grid}>
                <div className={styles.card}>
                  <h4 className={styles.cardTitle}>Experience & Preferences</h4>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Experience Level</span>
                    <span className={styles.fieldValue}>
                      {getStr('petExperience.experienceLevel') || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Willing to Train</span>
                    <span className={styles.fieldValue}>
                      {getData('petExperience.willingToTrain') ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Hours Alone Daily</span>
                    <span className={styles.fieldValue}>
                      {getStr('petExperience.hoursAloneDaily') || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Exercise Plans</span>
                    <span className={styles.fieldValue}>
                      {getStr('petExperience.exercisePlans') || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Currently Has Pets</span>
                    <span className={styles.fieldValue}>
                      {getData('petExperience.hasPetsCurrently') ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                <div className={styles.card}>
                  <h4 className={styles.cardTitle}>References</h4>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Veterinarian</span>
                    <span className={styles.fieldValue}>
                      {getStr('references.veterinarian.name') || 'N/A'}
                      {getStr('references.veterinarian.clinicName') &&
                        ` - ${getStr('references.veterinarian.clinicName')}`}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Vet Phone</span>
                    <span className={styles.fieldValue}>
                      {getStr('references.veterinarian.phone') || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Personal References</span>
                    <span className={styles.fieldValue}>
                      {getArr('references.personal').length || 0} provided
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Application Answers</h3>
              <div className={styles.grid}>
                <div className={styles.card}>
                  <h4 className={styles.cardTitle}>Adoption Motivation</h4>
                  <div className={styles.fieldVertical}>
                    <span className={styles.fieldLabel}>Why Adopt</span>
                    <div className={styles.fieldValueFullWidth}>
                      {getStr('answers.why_adopt') || 'N/A'}
                    </div>
                  </div>
                  <div className={styles.fieldVertical}>
                    <span className={styles.fieldLabel}>Exercise Plan</span>
                    <div className={styles.fieldValueFullWidth}>
                      {getStr('answers.exercise_plan') || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <h4 className={styles.cardTitle}>Home Details</h4>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Yard Size</span>
                    <span className={styles.fieldValue}>
                      {getStr('answers.yard_size') || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Yard Fenced</span>
                    <span className={styles.fieldValue}>
                      {getData('answers.yard_fenced') ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Hours Pet Alone</span>
                    <span className={styles.fieldValue}>
                      {getStr('answers.hours_alone') || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Current Pets</span>
                    <span className={styles.fieldValue}>
                      {getArr('answers.current_pets').length || 0} pets
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {getArr('answers.previous_pets').length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Previous Pet Experience</h3>
                <div className={styles.grid}>
                  {(
                    getArr('answers.previous_pets') as Array<{
                      type?: string;
                      breed?: string;
                      years_owned?: string;
                      what_happened?: string;
                    }>
                  ).map((pet, index) => (
                    <div key={index} className={styles.card}>
                      <h4 className={styles.cardTitle}>Previous Pet #{index + 1}</h4>
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Type</span>
                        <span className={styles.fieldValue}>{pet.type || 'N/A'}</span>
                      </div>
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Breed</span>
                        <span className={styles.fieldValue}>{pet.breed || 'N/A'}</span>
                      </div>
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Years Owned</span>
                        <span className={styles.fieldValue}>{pet.years_owned || 'N/A'}</span>
                      </div>
                      <div className={styles.fieldVertical}>
                        <span className={styles.fieldLabel}>What Happened</span>
                        <div className={styles.fieldValueFullWidth}>
                          {pet.what_happened || 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* References Tab */}
          <div className={styles.tabPanel({ active: activeTab === 'references' })}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Reference Checks</h3>
              {extractedReferences.length === 0 ? (
                <div className={styles.card}>
                  <p>No references found for this application.</p>
                </div>
              ) : (
                extractedReferences.map(reference => {
                  // Use local state if available, otherwise use the reference data
                  const currentRefStatus =
                    referenceUpdates[reference.id]?.status || reference.status;
                  const currentNotes = referenceUpdates[reference.id]?.notes || reference.notes;
                  const refStatusVariant = (
                    ['verified', 'contacted', 'pending', 'failed'] as const
                  ).includes(currentRefStatus as 'verified' | 'contacted' | 'pending' | 'failed')
                    ? (currentRefStatus as 'verified' | 'contacted' | 'pending' | 'failed')
                    : 'default';

                  return (
                    <div key={reference.id} className={styles.referenceCard}>
                      <div className={styles.referenceHeader}>
                        <div className={styles.referenceInfo}>
                          <h4 className={styles.referenceName}>{reference.contactName}</h4>
                          <p className={styles.referenceContact}>{reference.contactInfo}</p>
                          <p className={styles.referenceRelation}>Type: {reference.type}</p>
                        </div>
                        <span className={styles.referenceStatus({ status: refStatusVariant })}>
                          {currentRefStatus}
                        </span>
                      </div>

                      {reference.completedAt && (
                        <div className={styles.field}>
                          <span className={styles.fieldLabel}>Last Contacted</span>
                          <span className={styles.fieldValue}>
                            {new Date(reference.completedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {reference.completedBy && (
                        <div className={styles.field}>
                          <span className={styles.fieldLabel}>Contacted By</span>
                          <span className={styles.fieldValue}>{reference.completedBy}</span>
                        </div>
                      )}

                      {currentNotes && <div className={styles.referenceNotes}>{currentNotes}</div>}

                      <div className={styles.referenceActions}>
                        <button
                          className={styles.button({ variant: 'secondary' })}
                          onClick={() => toggleReferenceForm(reference.id)}
                        >
                          {referenceUpdates[reference.id]?.showForm ? 'Cancel' : 'Update Status'}
                        </button>
                      </div>

                      {referenceUpdates[reference.id]?.showForm && (
                        <div className={styles.referenceForm}>
                          <div className={styles.formField}>
                            <label className={styles.label} htmlFor={`ref-status-${reference.id}`}>
                              Status
                            </label>
                            <select
                              id={`ref-status-${reference.id}`}
                              className={styles.statusSelect}
                              value={referenceUpdates[reference.id]?.status || currentRefStatus}
                              onChange={e =>
                                updateReferenceField(reference.id, 'status', e.target.value)
                              }
                            >
                              <option value="pending">Pending</option>
                              <option value="contacted">Contacted</option>
                              <option value="verified">Verified</option>
                              <option value="failed">Failed</option>
                            </select>
                          </div>
                          <div className={styles.formField}>
                            <label className={styles.label} htmlFor={`ref-notes-${reference.id}`}>
                              Notes
                            </label>
                            <textarea
                              id={`ref-notes-${reference.id}`}
                              className={styles.notesInput}
                              value={referenceUpdates[reference.id]?.notes || currentNotes}
                              onChange={e =>
                                updateReferenceField(reference.id, 'notes', e.target.value)
                              }
                              placeholder="Add notes about this reference check..."
                            />
                          </div>
                          <div className={styles.buttonGroup}>
                            <button
                              className={styles.button({ variant: 'secondary' })}
                              onClick={() => toggleReferenceForm(reference.id)}
                            >
                              Cancel
                            </button>
                            <button
                              className={styles.button({ variant: 'primary' })}
                              onClick={() =>
                                handleReferenceUpdate(
                                  reference.id,
                                  referenceUpdates[reference.id]?.status || currentRefStatus,
                                  referenceUpdates[reference.id]?.notes || currentNotes || ''
                                )
                              }
                            >
                              Update Reference
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Home Visits Tab */}
          <div className={styles.tabPanel({ active: activeTab === 'visits' })}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Home Visits</h3>
                <button
                  className={styles.button({ variant: 'primary' })}
                  onClick={() => setShowScheduleVisit(true)}
                  disabled={homeVisits.some(
                    v => v.status === 'scheduled' || v.status === 'in_progress'
                  )}
                >
                  {homeVisits.some(v => v.status === 'scheduled' || v.status === 'in_progress')
                    ? 'Visit Already Scheduled'
                    : 'Schedule Visit'}
                </button>
              </div>

              {showScheduleVisit && (
                <div className={styles.scheduleVisitForm}>
                  <h4 className={styles.scheduleVisitTitle}>Schedule Home Visit</h4>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="visit-date">
                        Date
                      </label>
                      <input
                        id="visit-date"
                        className={styles.formInput}
                        type="date"
                        value={visitForm.scheduledDate}
                        onChange={e =>
                          setVisitForm(prev => ({ ...prev, scheduledDate: e.target.value }))
                        }
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="visit-time">
                        Time
                      </label>
                      <input
                        id="visit-time"
                        className={styles.formInput}
                        type="time"
                        value={visitForm.scheduledTime}
                        onChange={e =>
                          setVisitForm(prev => ({ ...prev, scheduledTime: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="visit-assigned-staff">
                        Assigned Staff
                      </label>
                      <select
                        id="visit-assigned-staff"
                        className={styles.formSelect}
                        value={visitForm.assignedStaff}
                        onChange={e =>
                          setVisitForm(prev => ({ ...prev, assignedStaff: e.target.value }))
                        }
                        disabled={staffLoading}
                      >
                        <option value="">
                          {staffLoading ? 'Loading staff...' : 'Select staff member...'}
                        </option>
                        {staff.map(staffMember => (
                          <option
                            key={staffMember.id}
                            value={`${staffMember.firstName} ${staffMember.lastName}`}
                          >
                            {staffMember.firstName} {staffMember.lastName} - {staffMember.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="visit-notes">
                        Visit Notes (optional)
                      </label>
                      <textarea
                        id="visit-notes"
                        className={styles.formTextarea}
                        value={visitForm.notes}
                        onChange={e => setVisitForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any special instructions or notes for the visit..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className={styles.formActions}>
                    <button
                      className={styles.button({ variant: 'secondary' })}
                      onClick={() => {
                        setShowScheduleVisit(false);
                        setVisitForm({
                          scheduledDate: '',
                          scheduledTime: '',
                          assignedStaff: '',
                          notes: '',
                        });
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className={styles.button({ variant: 'primary' })}
                      onClick={handleScheduleVisit}
                      disabled={
                        !visitForm.scheduledDate ||
                        !visitForm.scheduledTime ||
                        !visitForm.assignedStaff ||
                        isSchedulingVisit
                      }
                    >
                      {isSchedulingVisit ? 'Scheduling...' : 'Schedule Visit'}
                    </button>
                  </div>
                </div>
              )}

              {homeVisits.length === 0 ? (
                <div className={styles.emptyVisits}>
                  <p>No home visits scheduled yet.</p>
                  <p>
                    Schedule a home visit to assess the applicant&apos;s living situation and
                    suitability for pet adoption.
                  </p>
                </div>
              ) : (
                homeVisits.map(visit => {
                  const visitStatusVariant = (
                    ['scheduled', 'in_progress', 'completed', 'cancelled'] as const
                  ).includes(
                    visit.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
                  )
                    ? (visit.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled')
                    : 'default';

                  return (
                    <div key={visit.id} className={styles.visitCard}>
                      <div className={styles.visitHeader}>
                        <div className={styles.visitInfo}>
                          <h4 className={styles.visitDate}>
                            {new Date(visit.scheduledDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </h4>
                          <p className={styles.visitTime}>at {visit.scheduledTime}</p>
                          <p className={styles.visitStaff}>Assigned to: {visit.assignedStaff}</p>
                        </div>
                        <span className={styles.visitStatus({ status: visitStatusVariant })}>
                          {visit.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      {visit.notes && (
                        <div className={styles.visitNotes}>
                          <strong>Visit Notes:</strong>
                          <div>{visit.notes}</div>
                        </div>
                      )}

                      {visit.completedAt && (
                        <div className={styles.visitCompletedInfo}>
                          <div className={styles.field}>
                            <span className={styles.fieldLabel}>Completed On</span>
                            <span className={styles.fieldValue}>
                              {new Date(visit.completedAt).toLocaleDateString()} at{' '}
                              {new Date(visit.completedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {visit.outcome && (
                            <div className={styles.field}>
                              <span className={styles.fieldLabel}>Outcome</span>
                              <span className={styles.fieldValue}>
                                <span
                                  className={styles.visitOutcome({
                                    outcome: (
                                      ['approved', 'conditional', 'rejected'] as const
                                    ).includes(
                                      visit.outcome as 'approved' | 'conditional' | 'rejected'
                                    )
                                      ? (visit.outcome as 'approved' | 'conditional' | 'rejected')
                                      : 'default',
                                  })}
                                >
                                  {visit.outcome.charAt(0).toUpperCase() + visit.outcome.slice(1)}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className={styles.visitActions}>
                        {visit.status === 'scheduled' && (
                          <>
                            <button
                              className={styles.button({ variant: 'primary' })}
                              onClick={() => handleMarkVisitInProgress(visit.id)}
                            >
                              🏁 Start Visit
                            </button>
                            <button
                              className={styles.button({ variant: 'secondary' })}
                              onClick={() => {
                                setEditingVisit(visit.id);
                                setRescheduleForm({
                                  scheduledDate: visit.scheduledDate,
                                  scheduledTime: visit.scheduledTime,
                                  reason: '',
                                });
                              }}
                            >
                              📅 Reschedule
                            </button>
                            <button
                              className={styles.button({ variant: 'danger' })}
                              onClick={() => handleCancelVisit(visit.id)}
                            >
                              ❌ Cancel Visit
                            </button>
                          </>
                        )}

                        {visit.status === 'in_progress' && (
                          <>
                            <button
                              className={styles.button({ variant: 'primary' })}
                              onClick={() => setCompletingVisit(visit.id)}
                            >
                              ✅ Complete Visit
                            </button>
                            <button
                              className={styles.button({ variant: 'danger' })}
                              onClick={() => handleCancelVisit(visit.id)}
                            >
                              ❌ Cancel Visit
                            </button>
                          </>
                        )}

                        {visit.status === 'completed' && (
                          <>
                            <button
                              className={styles.button({ variant: 'secondary' })}
                              onClick={() => setViewingVisit(visit.id)}
                            >
                              👁️ View Details
                            </button>
                            <button
                              className={styles.button({ variant: 'primary' })}
                              onClick={() => setShowScheduleVisit(true)}
                            >
                              🏠 Schedule Follow-up
                            </button>
                          </>
                        )}

                        {visit.status === 'cancelled' && (
                          <>
                            <button
                              className={styles.button({ variant: 'secondary' })}
                              onClick={() => setViewingVisit(visit.id)}
                            >
                              👁️ View Details
                            </button>
                            <button
                              className={styles.button({ variant: 'primary' })}
                              onClick={() => setShowScheduleVisit(true)}
                            >
                              🏠 Schedule New Visit
                            </button>
                          </>
                        )}
                      </div>

                      {/* Reschedule Form */}
                      {editingVisit === visit.id && (
                        <div className={styles.rescheduleForm}>
                          <h5 className={styles.rescheduleTitle}>Reschedule Home Visit</h5>
                          <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                              <label
                                className={styles.formLabel}
                                htmlFor={`reschedule-date-${visit.id}`}
                              >
                                New Date
                              </label>
                              <input
                                id={`reschedule-date-${visit.id}`}
                                className={styles.formInput}
                                type="date"
                                value={rescheduleForm.scheduledDate}
                                onChange={e =>
                                  setRescheduleForm(prev => ({
                                    ...prev,
                                    scheduledDate: e.target.value,
                                  }))
                                }
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div className={styles.formGroup}>
                              <label
                                className={styles.formLabel}
                                htmlFor={`reschedule-time-${visit.id}`}
                              >
                                New Time
                              </label>
                              <input
                                id={`reschedule-time-${visit.id}`}
                                className={styles.formInput}
                                type="time"
                                value={rescheduleForm.scheduledTime}
                                onChange={e =>
                                  setRescheduleForm(prev => ({
                                    ...prev,
                                    scheduledTime: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                              <label
                                className={styles.formLabel}
                                htmlFor={`reschedule-reason-${visit.id}`}
                              >
                                Reason for Rescheduling
                              </label>
                              <textarea
                                id={`reschedule-reason-${visit.id}`}
                                className={styles.formTextarea}
                                value={rescheduleForm.reason}
                                onChange={e =>
                                  setRescheduleForm(prev => ({ ...prev, reason: e.target.value }))
                                }
                                placeholder="Why is this visit being rescheduled?"
                                rows={2}
                              />
                            </div>
                          </div>
                          <div className={styles.formActions}>
                            <button
                              className={styles.button({ variant: 'secondary' })}
                              onClick={() => {
                                setEditingVisit(null);
                                setRescheduleForm({
                                  scheduledDate: visit.scheduledDate,
                                  scheduledTime: visit.scheduledTime,
                                  reason: '',
                                });
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              className={styles.button({ variant: 'primary' })}
                              onClick={() => handleRescheduleVisit(visit.id)}
                              disabled={
                                !rescheduleForm.scheduledDate ||
                                !rescheduleForm.scheduledTime ||
                                !rescheduleForm.reason
                              }
                            >
                              Reschedule Visit
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Complete Visit Form */}
                      {completingVisit === visit.id && (
                        <div className={styles.completeVisitForm}>
                          <h5 className={styles.completeVisitTitle}>Complete Home Visit</h5>
                          <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                              <label
                                className={styles.formLabel}
                                htmlFor={`complete-outcome-${visit.id}`}
                              >
                                Visit Outcome
                              </label>
                              <select
                                id={`complete-outcome-${visit.id}`}
                                className={styles.formSelect}
                                value={completeForm.outcome}
                                onChange={e =>
                                  setCompleteForm(prev => ({
                                    ...prev,
                                    outcome: e.target.value as
                                      | 'approved'
                                      | 'rejected'
                                      | 'conditional',
                                  }))
                                }
                              >
                                <option value="">Select outcome...</option>
                                <option value="approved">Approved - Home is suitable</option>
                                <option value="conditional">
                                  Conditional - Some concerns need addressing
                                </option>
                                <option value="rejected">Rejected - Home is not suitable</option>
                              </select>
                            </div>
                          </div>
                          <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                              <label
                                className={styles.formLabel}
                                htmlFor={`complete-notes-${visit.id}`}
                              >
                                Visit Summary
                              </label>
                              <textarea
                                id={`complete-notes-${visit.id}`}
                                className={styles.formTextarea}
                                value={completeForm.notes}
                                onChange={e =>
                                  setCompleteForm(prev => ({ ...prev, notes: e.target.value }))
                                }
                                placeholder="Provide a detailed summary of the home visit findings..."
                                rows={4}
                              />
                            </div>
                          </div>
                          {completeForm.outcome === 'conditional' && (
                            <div className={styles.formRow}>
                              <div className={styles.formGroup}>
                                <label className={styles.formLabel} htmlFor="conditions-textarea">
                                  Conditions to Address
                                </label>
                                <textarea
                                  id="conditions-textarea"
                                  className={styles.formTextarea}
                                  value={completeForm.conditions}
                                  onChange={e =>
                                    setCompleteForm(prev => ({
                                      ...prev,
                                      conditions: e.target.value,
                                    }))
                                  }
                                  placeholder="List specific conditions that need to be met..."
                                  rows={3}
                                />
                              </div>
                            </div>
                          )}
                          <div className={styles.formActions}>
                            <button
                              className={styles.button({ variant: 'secondary' })}
                              onClick={() => {
                                setCompletingVisit(null);
                                setCompleteForm({
                                  outcome: '',
                                  notes: '',
                                  conditions: '',
                                });
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              className={styles.button({ variant: 'primary' })}
                              onClick={() => handleCompleteVisit(visit.id)}
                              disabled={!completeForm.outcome || !completeForm.notes}
                            >
                              Complete Visit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Timeline Tab */}
          <div className={styles.tabPanel({ active: activeTab === 'timeline' })}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Application Timeline</h3>
                <button
                  type="button"
                  className={styles.button({ variant: 'primary' })}
                  onClick={() => setShowAddEvent(!showAddEvent)}
                >
                  {showAddEvent ? 'Cancel' : 'Add Event'}
                </button>
              </div>

              {showAddEvent && (
                <div className={styles.addEventForm}>
                  <h4 className={styles.addEventTitle}>Add Timeline Event</h4>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="timeline-event-type">
                        Event Type
                      </label>
                      <select
                        id="timeline-event-type"
                        className={styles.formSelect}
                        value={newEventType}
                        onChange={e => setNewEventType(e.target.value as TimelineEventType)}
                      >
                        <option value={TimelineEventType.NOTE_ADDED}>Note</option>
                        <option value={TimelineEventType.REFERENCE_CONTACTED}>
                          Reference Check
                        </option>
                        <option value={TimelineEventType.HOME_VISIT_SCHEDULED}>Home Visit</option>
                        <option value={TimelineEventType.MANUAL_OVERRIDE}>Manual Override</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="timeline-event-desc">
                        Description
                      </label>
                      <textarea
                        id="timeline-event-desc"
                        className={styles.formTextarea}
                        value={newEventDescription}
                        onChange={e => setNewEventDescription(e.target.value)}
                        placeholder="Enter event description..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.button({ variant: 'secondary' })}
                      onClick={() => {
                        setShowAddEvent(false);
                        setNewEventDescription('');
                        setNewEventType(TimelineEventType.NOTE_ADDED);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.button({ variant: 'primary' })}
                      onClick={handleAddEvent}
                      disabled={!newEventDescription.trim() || isAddingEvent}
                    >
                      {isAddingEvent ? 'Adding...' : 'Add Event'}
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.timelineContainer}>
                {timeline.length === 0 ? (
                  <div className={styles.emptyTimeline}>
                    <p>No timeline events yet.</p>
                    <p>
                      Timeline events will appear here as actions are taken on this application.
                    </p>
                  </div>
                ) : (
                  timeline
                    .sort(
                      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    )
                    .map(event => {
                      const iconType = (
                        [
                          'status_change',
                          'reference_check',
                          'home_visit',
                          'note',
                          'system',
                        ] as const
                      ).includes(
                        event.event as
                          | 'status_change'
                          | 'reference_check'
                          | 'home_visit'
                          | 'note'
                          | 'system'
                      )
                        ? (event.event as
                            | 'status_change'
                            | 'reference_check'
                            | 'home_visit'
                            | 'note'
                            | 'system')
                        : 'default';

                      return (
                        <div key={event.id} className={styles.timelineItem}>
                          <div className={styles.timelineIcon({ type: iconType })}>
                            {getTimelineIcon(event.event)}
                          </div>
                          <div className={styles.timelineContent}>
                            <div className={styles.timelineHeader}>
                              <h4 className={styles.timelineTitle}>{getEventTitle(event.event)}</h4>
                              <span className={styles.timelineTimestamp}>
                                {formatTimelineTimestamp(event.timestamp)}
                              </span>
                            </div>
                            <p className={styles.timelineDescription}>
                              {event.event === 'status_change' && event.data?.newStatus
                                ? `Status changed to: ${formatStatusName(event.data.newStatus)}`
                                : event.description}
                            </p>
                            {event.data && Object.keys(event.data).length > 0 && (
                              <div className={styles.timelineData}>
                                <strong>Additional Details:</strong>
                                {event.data.oldStatus && event.data.newStatus ? (
                                  <div style={{ marginTop: '0.5rem' }}>
                                    <span style={{ color: '#ef4444' }}>
                                      From: {formatStatusName(event.data.oldStatus)}
                                    </span>
                                    <br />
                                    <span style={{ color: '#10b981' }}>
                                      To: {formatStatusName(event.data.newStatus)}
                                    </span>
                                    {event.data.notes && (
                                      <>
                                        <br />
                                        <span style={{ color: '#6b7280' }}>
                                          Notes: {event.data.notes}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <pre>{JSON.stringify(event.data, null, 2)}</pre>
                                )}
                              </div>
                            )}
                            <span className={styles.timelineUser}>by {event.userName}</span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visit Details Modal */}
      {viewingVisit && homeVisits.find(v => v.id === viewingVisit) && (
        <div
          className={styles.visitDetailsModal}
          onClick={e => e.target === e.currentTarget && setViewingVisit(null)}
          onKeyDown={e => e.key === 'Escape' && setViewingVisit(null)}
          role="button"
          tabIndex={-1}
          aria-label="Close details"
        >
          <div className={styles.visitDetailsContent}>
            <div className={styles.visitDetailsHeader}>
              <h4>Visit Details</h4>
              <button
                className={styles.button({ variant: 'secondary' })}
                onClick={() => setViewingVisit(null)}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '1rem' }}>
              {(() => {
                const visit = homeVisits.find(v => v.id === viewingVisit);
                if (!visit) {
                  return null;
                }

                const detailVisitStatusVariant = (
                  ['scheduled', 'in_progress', 'completed', 'cancelled'] as const
                ).includes(visit.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled')
                  ? (visit.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled')
                  : 'default';

                return (
                  <>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Original Date</span>
                      <span className={styles.fieldValue}>
                        {new Date(visit.scheduledDate).toLocaleDateString()} at{' '}
                        {visit.scheduledTime}
                      </span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Staff Member</span>
                      <span className={styles.fieldValue}>{visit.assignedStaff}</span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Status</span>
                      <span className={styles.fieldValue}>
                        <span className={styles.visitStatus({ status: detailVisitStatusVariant })}>
                          {visit.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </span>
                    </div>
                    {visit.outcome && (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Outcome</span>
                        <span className={styles.fieldValue}>
                          <span
                            className={styles.visitOutcome({
                              outcome: (['approved', 'conditional', 'rejected'] as const).includes(
                                visit.outcome as 'approved' | 'conditional' | 'rejected'
                              )
                                ? (visit.outcome as 'approved' | 'conditional' | 'rejected')
                                : 'default',
                            })}
                          >
                            {visit.outcome.charAt(0).toUpperCase() + visit.outcome.slice(1)}
                          </span>
                        </span>
                      </div>
                    )}
                    {visit.cancelReason && (
                      <div className={styles.fieldVertical}>
                        <span className={styles.fieldLabel}>Cancellation Reason</span>
                        <div className={styles.fieldValueFullWidth}>{visit.cancelReason}</div>
                      </div>
                    )}
                    {visit.completedAt && (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Completed At</span>
                        <span className={styles.fieldValue}>
                          {new Date(visit.completedAt).toLocaleDateString()} at{' '}
                          {new Date(visit.completedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    {visit.cancelledAt && (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Cancelled At</span>
                        <span className={styles.fieldValue}>
                          {new Date(visit.cancelledAt).toLocaleDateString()} at{' '}
                          {new Date(visit.cancelledAt).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    {visit.notes && (
                      <div className={styles.fieldVertical}>
                        <span className={styles.fieldLabel}>Visit Summary</span>
                        <div className={styles.fieldValueFullWidth}>{visit.notes}</div>
                      </div>
                    )}
                    {visit.outcomeNotes && (
                      <div className={styles.fieldVertical}>
                        <span className={styles.fieldLabel}>Outcome Notes</span>
                        <div className={styles.fieldValueFullWidth}>{visit.outcomeNotes}</div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Stage Transition Modal */}
      {showStageTransition && (
        <StageTransitionModal
          currentStage={getCurrentStage()}
          onClose={() => setShowStageTransition(false)}
          onTransition={handleStageTransition}
        />
      )}
    </div>
  );
};

export default ApplicationReview;

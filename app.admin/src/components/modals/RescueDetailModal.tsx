import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Button, Heading, Text, DateTime } from '@adopt-dont-shop/lib.components';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import {
  FiX,
  FiMail,
  FiPhone,
  FiMapPin,
  FiGlobe,
  FiUsers,
  FiPackage,
  FiUserPlus,
  FiUserMinus,
  FiCheck,
  FiClock,
} from 'react-icons/fi';
import type {
  AdminRescue,
  RescueStatistics,
  StaffMember,
  StaffInvitation,
  InviteStaffPayload,
} from '@/types/rescue';
import { rescueService } from '@/services/rescueService';
import * as styles from './RescueDetailModal.css';

type RescueDetailModalProps = {
  rescueId: string;
  onClose: () => void;
  onUpdate?: () => void;
};

export const RescueDetailModal: React.FC<RescueDetailModalProps> = ({
  rescueId,
  onClose,
  onUpdate,
}) => {
  const [rescue, setRescue] = useState<AdminRescue | null>(null);
  const [statistics, setStatistics] = useState<RescueStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'contact' | 'policies' | 'staff' | 'listings'
  >('overview');

  // Staff management state
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTitle, setInviteTitle] = useState('');

  useEffect(() => {
    const fetchRescueDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const rescueData = await rescueService.getById(rescueId, { includeStats: true });
        setRescue(rescueData);

        if (rescueData.statistics) {
          setStatistics(rescueData.statistics);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rescue details');
      } finally {
        setLoading(false);
      }
    };

    fetchRescueDetails();
  }, [rescueId]);

  const formatDate = (dateString?: string): string => {
    if (!dateString) {
      return 'N/A';
    }
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const fetchStaff = async (showLoading = true) => {
    if (!rescueId) {
      return;
    }

    try {
      if (showLoading) {
        setLoadingStaff(true);
      }
      setStaffError(null);

      const [staffData, invitationsData] = await Promise.all([
        rescueService.getStaff(rescueId, 1, 100),
        rescueService.getInvitations(rescueId),
      ]);

      console.log('Fetched staff:', staffData.data);
      console.log('Fetched invitations:', invitationsData);
      setStaff(staffData.data);
      setInvitations(invitationsData);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to load staff');
    } finally {
      if (showLoading) {
        setLoadingStaff(false);
      }
    }
  };

  const handleInviteStaff = async () => {
    if (!inviteEmail.trim()) {
      setStaffError('Please enter an email address');
      return;
    }

    try {
      setLoadingStaff(true);
      setStaffError(null);

      const payload: InviteStaffPayload = {
        email: inviteEmail.trim(),
        title: inviteTitle.trim() || undefined,
      };

      const newInvitation = await rescueService.inviteStaff(rescueId, payload);
      console.log('Invitation sent:', newInvitation);

      // Reset form
      setInviteEmail('');
      setInviteTitle('');
      setShowInviteForm(false);

      // Refresh staff list (don't show loading, we're already in loading state)
      await fetchStaff(false);
      console.log('Staff and invitations refreshed');
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleRemoveStaff = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) {
      return;
    }

    try {
      setLoadingStaff(true);
      setStaffError(null);

      await rescueService.removeStaff(rescueId, userId);
      await fetchStaff(false);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to remove staff member');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      setLoadingStaff(true);
      setStaffError(null);

      await rescueService.cancelInvitation(rescueId, invitationId);
      await fetchStaff(false);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaff();
    }
  }, [activeTab, rescueId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className={styles.badgeSuccess}>Verified</span>;
      case 'pending':
        return <span className={styles.badgeWarning}>Pending</span>;
      default:
        return <span className={styles.badgeDanger}>{status}</span>;
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role='presentation'
    >
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <Heading level='h2'>{rescue?.name || 'Rescue Details'}</Heading>
            {rescue && (
              <Text style={{ marginTop: '0.5rem' }}>
                {getStatusBadge(rescue.status)} • Registered {formatDate(rescue.createdAt)}
              </Text>
            )}
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className={styles.tabContainer}>
          <button
            className={clsx(styles.tab, activeTab === 'overview' && styles.tabActive)}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={clsx(styles.tab, activeTab === 'contact' && styles.tabActive)}
            onClick={() => setActiveTab('contact')}
          >
            Contact Info
          </button>
          <button
            className={clsx(styles.tab, activeTab === 'policies' && styles.tabActive)}
            onClick={() => setActiveTab('policies')}
          >
            Policies
          </button>
          <button
            className={clsx(styles.tab, activeTab === 'staff' && styles.tabActive)}
            onClick={() => setActiveTab('staff')}
          >
            Staff
          </button>
          <button
            className={clsx(styles.tab, activeTab === 'listings' && styles.tabActive)}
            onClick={() => setActiveTab('listings')}
          >
            Listings
          </button>
        </div>

        <div className={styles.modalBody}>
          {loading && (
            <div
              aria-label='Loading rescue details'
              style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Skeleton width='4rem' height='4rem' radius='50%' />
                <div style={{ flex: 1 }}>
                  <Skeleton height='1.25rem' width='50%' style={{ marginBottom: '0.5rem' }} />
                  <Skeleton height='0.875rem' width='30%' />
                </div>
              </div>
              <SkeletonText lines={4} lastLineWidth='40%' />
              <SkeletonText lines={3} lastLineWidth='55%' />
            </div>
          )}

          {error && <div className={styles.errorMessage}>{error}</div>}

          {!loading && rescue && (
            <>
              {activeTab === 'overview' && (
                <>
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Organization Information</h3>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <div className={styles.infoLabel}>Organization Name</div>
                        <div className={styles.infoValue}>{rescue.name}</div>
                      </div>
                      <div className={styles.infoItem}>
                        <div className={styles.infoLabel}>Status</div>
                        <div className={styles.infoValue}>{getStatusBadge(rescue.status)}</div>
                      </div>
                      <div className={styles.infoItem}>
                        <div className={styles.infoLabel}>Registration Number</div>
                        <div className={styles.infoValue}>{rescue.registrationNumber || 'N/A'}</div>
                      </div>
                      <div className={styles.infoItem}>
                        <div className={styles.infoLabel}>EIN</div>
                        <div className={styles.infoValue}>{rescue.ein || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Location</h3>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <div className={styles.infoLabel}>
                          <FiMapPin /> Address
                        </div>
                        <div className={styles.infoValue}>{rescue.address}</div>
                      </div>
                      <div className={styles.infoItem}>
                        <div className={styles.infoLabel}>City</div>
                        <div className={styles.infoValue}>{rescue.city}</div>
                      </div>
                      <div className={styles.infoItem}>
                        <div className={styles.infoLabel}>State/County</div>
                        <div className={styles.infoValue}>{rescue.state}</div>
                      </div>
                      <div className={styles.infoItem}>
                        <div className={styles.infoLabel}>Postal Code</div>
                        <div className={styles.infoValue}>{rescue.zipCode}</div>
                      </div>
                    </div>
                  </div>

                  {rescue.description && (
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>Description</h3>
                      <div className={styles.infoValue}>{rescue.description}</div>
                    </div>
                  )}

                  {rescue.mission && (
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>Mission</h3>
                      <div className={styles.infoValue}>{rescue.mission}</div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'contact' && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Contact Details</h3>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <div className={styles.infoLabel}>
                        <FiMail /> Email
                      </div>
                      <div className={styles.infoValue}>{rescue.email}</div>
                    </div>
                    <div className={styles.infoItem}>
                      <div className={styles.infoLabel}>
                        <FiPhone /> Phone
                      </div>
                      <div className={styles.infoValue}>{rescue.phone || 'N/A'}</div>
                    </div>
                    <div className={styles.infoItem}>
                      <div className={styles.infoLabel}>
                        <FiGlobe /> Website
                      </div>
                      <div className={styles.infoValue}>
                        {rescue.website ? (
                          <a href={rescue.website} target='_blank' rel='noopener noreferrer'>
                            {rescue.website}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </div>
                    <div className={styles.infoItem}>
                      <div className={styles.infoLabel}>Contact Person</div>
                      <div className={styles.infoValue}>{rescue.contactPerson || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'policies' && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Adoption Policies</h3>
                  {rescue.adoptionPolicies ? (
                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <div className={styles.infoLabel}>Home Visit Required</div>
                        <div className={styles.infoValue}>
                          {rescue.adoptionPolicies.requireHomeVisit ? 'Yes' : 'No'}
                        </div>
                      </div>
                      <div className={styles.infoItem}>
                        <div className={styles.infoLabel}>References Required</div>
                        <div className={styles.infoValue}>
                          {rescue.adoptionPolicies.requireReferences ? 'Yes' : 'No'}
                        </div>
                      </div>
                      <div className={styles.infoItem}>
                        <div className={styles.infoLabel}>Minimum References</div>
                        <div className={styles.infoValue}>
                          {rescue.adoptionPolicies.minimumReferenceCount}
                        </div>
                      </div>
                      <div className={styles.infoItem}>
                        <div className={styles.infoLabel}>Adoption Fee Range</div>
                        <div className={styles.infoValue}>
                          £{rescue.adoptionPolicies.adoptionFeeRange.min} - £
                          {rescue.adoptionPolicies.adoptionFeeRange.max}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.infoValue}>No adoption policies configured</div>
                  )}
                </div>
              )}

              {activeTab === 'staff' && (
                <>
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>Staff Members ({staff?.length || 0})</span>
                        <Button
                          variant='primary'
                          size='sm'
                          onClick={() => setShowInviteForm(!showInviteForm)}
                        >
                          <FiUserPlus style={{ marginRight: '0.5rem' }} />
                          Invite Staff
                        </Button>
                      </div>
                    </h3>

                    {staffError && <div className={styles.errorMessage}>{staffError}</div>}

                    {showInviteForm && (
                      <div className={styles.inviteForm}>
                        <h4 style={{ margin: 0, fontSize: '0.9375rem', color: '#111827' }}>
                          Invite New Staff Member
                        </h4>
                        <div className={styles.formRow}>
                          <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor='invite-email'>
                              Email Address *
                            </label>
                            <input
                              className={styles.input}
                              id='invite-email'
                              type='email'
                              placeholder='staffmember@example.com'
                              value={inviteEmail}
                              onChange={e => setInviteEmail(e.target.value)}
                              disabled={loadingStaff}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor='invite-title'>
                              Job Title (Optional)
                            </label>
                            <input
                              className={styles.input}
                              id='invite-title'
                              type='text'
                              placeholder='e.g., Veterinarian, Coordinator'
                              value={inviteTitle}
                              onChange={e => setInviteTitle(e.target.value)}
                              disabled={loadingStaff}
                            />
                          </div>
                        </div>
                        <div className={styles.formActions}>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              setShowInviteForm(false);
                              setInviteEmail('');
                              setInviteTitle('');
                              setStaffError(null);
                            }}
                            disabled={loadingStaff}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant='primary'
                            size='sm'
                            onClick={handleInviteStaff}
                            disabled={loadingStaff || !inviteEmail.trim()}
                          >
                            Send Invitation
                          </Button>
                        </div>
                      </div>
                    )}

                    {loadingStaff && (
                      <div
                        aria-label='Loading staff'
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          padding: '1rem 0',
                        }}
                      >
                        {Array.from({ length: 3 }, (_, i) => (
                          <div
                            key={i}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                          >
                            <Skeleton width='2.5rem' height='2.5rem' radius='50%' />
                            <div style={{ flex: 1 }}>
                              <Skeleton
                                height='0.875rem'
                                width='40%'
                                style={{ marginBottom: '0.25rem' }}
                              />
                              <Skeleton height='0.75rem' width='60%' />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!loadingStaff &&
                      (staff?.length || 0) === 0 &&
                      (invitations?.length || 0) === 0 && (
                        <div className={styles.infoValue}>
                          No staff members yet. Invite your first team member!
                        </div>
                      )}

                    {!loadingStaff && (staff?.length || 0) > 0 && (
                      <div className={styles.staffList}>
                        {staff?.map(member => (
                          <div className={styles.staffCard} key={member.staffMemberId}>
                            <div className={styles.staffInfo}>
                              <div className={styles.staffName}>
                                {member.firstName} {member.lastName}
                                {member.isVerified && (
                                  <FiCheck
                                    style={{
                                      display: 'inline-block',
                                      marginLeft: '0.5rem',
                                      color: '#10b981',
                                    }}
                                    size={16}
                                  />
                                )}
                              </div>
                              <div className={styles.staffEmail}>{member.email}</div>
                              <div className={styles.staffMeta}>
                                {member.title && <span>{member.title} •</span>}
                                <span>Added {<DateTime timestamp={member.addedAt} />}</span>
                              </div>
                            </div>
                            <div className={styles.staffActions}>
                              <button
                                className={styles.iconButton}
                                title='Remove staff member'
                                onClick={() => handleRemoveStaff(member.userId)}
                                disabled={loadingStaff}
                              >
                                <FiUserMinus color='#ef4444' />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {(invitations?.length || 0) > 0 && (
                    <div className={styles.invitationsList}>
                      <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                          Pending Invitations ({invitations?.length || 0})
                        </h3>
                        {invitations?.map(invitation => (
                          <div className={styles.invitationCard} key={invitation.invitationId}>
                            <div className={styles.staffInfo}>
                              <div className={styles.staffName}>{invitation.email}</div>
                              <div className={styles.staffMeta}>
                                {invitation.title && <span>{invitation.title} •</span>}
                                <span>Invited {<DateTime timestamp={invitation.createdAt} />}</span>
                                <span>
                                  • Expires {<DateTime timestamp={invitation.expiresAt} />}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span
                                className={
                                  invitation.status === 'pending'
                                    ? styles.invitationBadgePending
                                    : styles.invitationBadgeDefault
                                }
                              >
                                <FiClock size={12} />
                                {invitation.status}
                              </span>
                              <button
                                className={styles.iconButton}
                                title='Cancel invitation'
                                onClick={() => handleCancelInvitation(invitation.invitationId)}
                                disabled={loadingStaff}
                              >
                                <FiX color='#ef4444' />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'listings' && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Pet Listings</h3>
                  <div className={styles.infoValue}>Listings management coming soon...</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

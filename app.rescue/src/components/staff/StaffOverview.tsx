import React from 'react';
import { StaffMember } from '../../types/staff';
import * as styles from './StaffOverview.css';

interface StaffOverviewProps {
  staff: StaffMember[];
  loading?: boolean;
}

const StaffOverview: React.FC<StaffOverviewProps> = ({ staff, loading = false }) => {
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.overviewSkeleton}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </div>
    );
  }

  const totalStaff = staff.length;
  const verifiedStaff = staff.filter(s => s.isVerified).length;
  const pendingStaff = totalStaff - verifiedStaff;
  const recentStaff = staff.filter(s => {
    const addedDate = new Date(s.addedAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return addedDate >= thirtyDaysAgo;
  }).length;

  const verificationRate = totalStaff > 0 ? Math.round((verifiedStaff / totalStaff) * 100) : 0;

  const roleDistribution = staff.reduce(
    (acc, member) => {
      const role = member.title || 'No Title';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const topRoles = Object.entries(roleDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className={styles.overviewContainer}>
      <div className={styles.overviewCards}>
        <div className={styles.overviewCard}>
          <div className={styles.cardIcon}>👥</div>
          <div>
            <h3 className={styles.cardContentH3}>{totalStaff}</h3>
            <p className={styles.cardContentP}>Total Staff</p>
          </div>
        </div>

        <div className={styles.overviewCard}>
          <div className={styles.cardIcon}>✅</div>
          <div>
            <h3 className={styles.cardContentH3}>{verifiedStaff}</h3>
            <p className={styles.cardContentP}>Verified</p>
          </div>
        </div>

        <div className={styles.overviewCard}>
          <div className={styles.cardIcon}>⏳</div>
          <div>
            <h3 className={styles.cardContentH3}>{pendingStaff}</h3>
            <p className={styles.cardContentP}>Pending</p>
          </div>
        </div>

        <div className={styles.overviewCard}>
          <div className={styles.cardIcon}>🆕</div>
          <div>
            <h3 className={styles.cardContentH3}>{recentStaff}</h3>
            <p className={styles.cardContentP}>Added Recently</p>
          </div>
        </div>
      </div>

      <div className={styles.overviewDetails}>
        <div className={styles.detailSection}>
          <h4>Verification Status</h4>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${verificationRate}%` }} />
          </div>
          <p className={styles.progressText}>{verificationRate}% of staff members are verified</p>
        </div>

        {topRoles.length > 0 && (
          <div className={styles.detailSection}>
            <h4>Role Distribution</h4>
            <div className={styles.roleList}>
              {topRoles.map(([role, count]) => (
                <div key={role} className={styles.roleItem}>
                  <span className={styles.roleName}>{role}</span>
                  <span className={styles.roleCount}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {totalStaff === 0 && (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyMessage}>
            <h3>No Staff Members Yet</h3>
            <p>Start building your team by adding your first staff member.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffOverview;

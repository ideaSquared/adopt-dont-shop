import React from 'react';
import { MetricCard, SkeletonCard } from '@adopt-dont-shop/lib.components';
import { CheckCircle2, Clock, Sparkles, Users } from 'lucide-react';
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
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
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
        <MetricCard label="Total Staff" value={totalStaff} icon={<Users size="1em" />} />
        <MetricCard label="Verified" value={verifiedStaff} icon={<CheckCircle2 size="1em" />} />
        <MetricCard label="Pending" value={pendingStaff} icon={<Clock size="1em" />} />
        <MetricCard label="Added Recently" value={recentStaff} icon={<Sparkles size="1em" />} />
      </div>

      <div className={styles.overviewDetails}>
        <div className={styles.detailSection}>
          <h4>Verification Status</h4>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-label="Verified staff"
            aria-valuenow={verificationRate}
            aria-valuemin={0}
            aria-valuemax={100}
          >
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

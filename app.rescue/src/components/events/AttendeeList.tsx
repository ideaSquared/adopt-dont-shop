import React from 'react';
import { EventAttendee } from '../../types/events';
import { formatDate } from '@adopt-dont-shop/lib.utils';
import * as styles from './AttendeeList.css';

interface AttendeeListProps {
  attendees: EventAttendee[];
  onCheckIn?: (userId: string) => void;
}

const AttendeeList: React.FC<AttendeeListProps> = ({ attendees, onCheckIn }) => {
  if (!attendees || attendees.length === 0) {
    return (
      <div className={styles.listContainer}>
        <div className={styles.emptyState}>No attendees registered yet.</div>
      </div>
    );
  }

  return (
    <div className={styles.listContainer}>
      <table className={styles.table}>
        <thead className={styles.tableHeader}>
          <tr>
            <th className={styles.tableHeaderCell}>Name</th>
            <th className={styles.tableHeaderCell}>Email</th>
            <th className={styles.tableHeaderCell}>Registered</th>
            <th className={styles.tableHeaderCell}>Status</th>
            {onCheckIn && <th className={styles.tableHeaderCell}>Action</th>}
          </tr>
        </thead>
        <tbody>
          {attendees.map(attendee => (
            <tr
              key={attendee.userId}
              className={styles.tableRow({ checkedIn: attendee.checkedIn })}
            >
              <td className={styles.tableCell}>{attendee.name}</td>
              <td className={styles.tableCell}>{attendee.email}</td>
              <td className={styles.tableCell}>{formatDate(new Date(attendee.registeredAt))}</td>
              <td className={styles.tableCell}>
                <span className={styles.checkInBadge({ checkedIn: attendee.checkedIn })}>
                  {attendee.checkedIn
                    ? `✓ Checked In${attendee.checkedInAt ? ` - ${formatDate(new Date(attendee.checkedInAt))}` : ''}`
                    : 'Not Checked In'}
                </span>
              </td>
              {onCheckIn && (
                <td className={styles.tableCell}>
                  {!attendee.checkedIn ? (
                    <button
                      className={styles.checkInButton}
                      onClick={() => onCheckIn(attendee.userId)}
                    >
                      Check In
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#10b981' }}>✓ Checked In</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendeeList;

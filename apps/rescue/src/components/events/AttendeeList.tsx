import React from 'react';
import { DataTable, type DataTableColumn } from '@adopt-dont-shop/lib.components';
import { EventAttendee } from '../../types/events';
import { formatDate } from '@adopt-dont-shop/lib.utils';
import * as styles from './AttendeeList.css';

interface AttendeeListProps {
  attendees: EventAttendee[];
  onCheckIn?: (userId: string) => void;
}

const AttendeeList: React.FC<AttendeeListProps> = ({ attendees, onCheckIn }) => {
  const columns: DataTableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'registered', label: 'Registered' },
    {
      key: 'status',
      label: 'Status',
      render: (_value, row) => (
        <span className={styles.checkInBadge({ checkedIn: Boolean(row.checkedIn) })}>
          {String(row.statusLabel)}
        </span>
      ),
    },
    ...(onCheckIn
      ? [
          {
            key: 'action',
            label: 'Action',
            render: (_value, row) =>
              row.checkedIn ? (
                <span className={styles.checkedInBadge}>✓ Checked In</span>
              ) : (
                <button
                  className={styles.checkInButton}
                  onClick={() => onCheckIn?.(String(row.userId))}
                >
                  Check In
                </button>
              ),
          } satisfies DataTableColumn,
        ]
      : []),
  ];

  const rows = attendees.map(attendee => ({
    name: attendee.name,
    email: attendee.email,
    registered: formatDate(attendee.registeredAt),
    checkedIn: attendee.checkedIn,
    statusLabel: attendee.checkedIn
      ? `✓ Checked In${attendee.checkedInAt ? ` - ${formatDate(attendee.checkedInAt)}` : ''}`
      : 'Not Checked In',
    userId: attendee.userId,
  }));

  return (
    <div className={styles.listContainer}>
      <DataTable
        title="Attendees"
        columns={columns}
        rows={rows}
        emptyMessage="No attendees registered yet."
      />
    </div>
  );
};

export default AttendeeList;

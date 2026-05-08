import React, { useState } from 'react';
import { Event, EventAttendee } from '../../types/events';
import { formatDate, formatTime } from '@adopt-dont-shop/lib.utils';
import StatusBadge from '../common/StatusBadge';
import AttendeeList from './AttendeeList';
import * as styles from './EventDetails.css';

interface EventDetailsProps {
  event: Event;
  attendees?: EventAttendee[];
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdateStatus?: (status: string) => void;
  onCheckInAttendee?: (userId: string) => void;
}

const EventDetails: React.FC<EventDetailsProps> = ({
  event,
  attendees,
  onEdit,
  onDelete,
  onUpdateStatus,
  onCheckInAttendee,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>(event.status);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setSelectedStatus(newStatus);
    if (onUpdateStatus) {
      onUpdateStatus(newStatus);
    }
  };

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const isSameDay = startDate.toDateString() === endDate.toDateString();

  const attendancePercentage =
    event.capacity && event.currentAttendance
      ? (event.currentAttendance / event.capacity) * 100
      : 0;

  return (
    <div className={styles.detailsContainer}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>{event.name}</h1>
            <StatusBadge status={event.status} />
          </div>
          <div className={styles.headerActions}>
            {onEdit && (
              <button className={styles.button({ variant: 'secondary' })} onClick={onEdit}>
                ✏️ Edit
              </button>
            )}
            {onDelete && (
              <button className={styles.button({ variant: 'danger' })} onClick={onDelete}>
                🗑️ Delete
              </button>
            )}
          </div>
        </div>

        <div className={styles.metaInfo}>
          <div className={styles.metaItem}>
            <span>📅</span>
            <span>
              {formatDate(startDate)}
              {!isSameDay && ` - ${formatDate(endDate)}`}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span>🕐</span>
            <span>
              {formatTime(startDate)} - {formatTime(endDate)}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span>{event.location.type === 'virtual' ? '💻' : '📍'}</span>
            <span>
              {event.location.type === 'virtual'
                ? 'Virtual Event'
                : event.location.venue ||
                  `${event.location.address}, ${event.location.city}` ||
                  'Location TBD'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Description</h3>
          <p className={styles.description}>{event.description}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Event Information</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Event Type</div>
              <div className={styles.infoValue}>{event.type.replace('_', ' ').toUpperCase()}</div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Status</div>
              {onUpdateStatus ? (
                <select
                  className={styles.statusSelect}
                  value={selectedStatus}
                  onChange={handleStatusChange}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              ) : (
                <div className={styles.infoValue}>
                  {event.status.replace('_', ' ').toUpperCase()}
                </div>
              )}
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Visibility</div>
              <div className={styles.infoValue}>{event.isPublic ? 'Public' : 'Private'}</div>
            </div>

            {event.capacity && (
              <div className={styles.infoCard}>
                <div className={styles.infoLabel}>Capacity</div>
                <div className={styles.infoValue}>
                  {event.currentAttendance || 0} / {event.capacity} registered
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${attendancePercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {event.location.type === 'physical' && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Location Details</h3>
            <div className={styles.infoGrid}>
              {event.location.venue && (
                <div className={styles.infoCard}>
                  <div className={styles.infoLabel}>Venue</div>
                  <div className={styles.infoValue}>{event.location.venue}</div>
                </div>
              )}
              {event.location.address && (
                <div className={styles.infoCard}>
                  <div className={styles.infoLabel}>Address</div>
                  <div className={styles.infoValue}>
                    {event.location.address}
                    <br />
                    {event.location.city} {event.location.postcode}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {event.location.type === 'virtual' && event.location.virtualLink && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Virtual Meeting Link</h3>
            <div className={styles.infoCard}>
              <div className={styles.infoValue}>
                <a
                  href={event.location.virtualLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.virtualLink}
                >
                  {event.location.virtualLink}
                </a>
              </div>
            </div>
          </div>
        )}

        {event.registrationRequired && attendees && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Attendees ({attendees.length}
              {event.capacity && ` / ${event.capacity}`})
            </h3>
            <AttendeeList attendees={attendees} onCheckIn={onCheckInAttendee} />
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetails;

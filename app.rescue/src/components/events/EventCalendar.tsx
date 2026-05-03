import React, { useState, useMemo } from 'react';
import { Event, EventCalendarDay } from '../../types/events';
import * as styles from './EventCalendar.css';

interface EventCalendarProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  onDateClick?: (date: Date) => void;
}

const getEventColor = (type: string): string => {
  switch (type) {
    case 'adoption':
      return '#3b82f6';
    case 'fundraising':
      return '#10b981';
    case 'volunteer':
      return '#f59e0b';
    case 'community':
      return '#8b5cf6';
    default:
      return '#6b7280';
  }
};

const EventCalendar: React.FC<EventCalendarProps> = ({ events, onEventClick, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: EventCalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        events: events.filter(e => isSameDay(new Date(e.startDate), date)),
        isToday: isSameDay(date, today),
        isCurrentMonth: false,
      });
    }

    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        events: events.filter(e => isSameDay(new Date(e.startDate), date)),
        isToday: isSameDay(date, today),
        isCurrentMonth: true,
      });
    }

    // Add days from next month
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        events: events.filter(e => isSameDay(new Date(e.startDate), date)),
        isToday: isSameDay(date, today),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate, events]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <h3 className={styles.monthTitle}>{monthName}</h3>
        <div className={styles.navButtons}>
          <button className={styles.navButton} onClick={handlePrevMonth}>
            ← Prev
          </button>
          <button className={styles.navButton} onClick={handleToday}>
            Today
          </button>
          <button className={styles.navButton} onClick={handleNextMonth}>
            Next →
          </button>
        </div>
      </div>

      <div className={styles.calendarGrid}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className={styles.dayHeader}>
            {day}
          </div>
        ))}

        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={styles.dayCell({ isToday: day.isToday, isCurrentMonth: day.isCurrentMonth })}
            onClick={() => onDateClick && onDateClick(day.date)}
            onKeyDown={e =>
              (e.key === 'Enter' || e.key === ' ') && onDateClick && onDateClick(day.date)
            }
            role="button"
            tabIndex={0}
          >
            <div className={styles.dayNumber({ isToday: day.isToday })}>{day.date.getDate()}</div>

            {day.events.slice(0, 2).map(event => (
              <div
                key={event.id}
                className={styles.eventDot}
                style={{ background: getEventColor(event.type) }}
                onClick={e => {
                  e.stopPropagation();
                  if (onEventClick) {
                    onEventClick(event);
                  }
                }}
                onKeyDown={e => {
                  e.stopPropagation();
                  if ((e.key === 'Enter' || e.key === ' ') && onEventClick) {
                    onEventClick(event);
                  }
                }}
                role="button"
                tabIndex={0}
                title={event.name}
              >
                {event.name}
              </div>
            ))}

            {day.events.length > 2 && (
              <div className={styles.moreEvents}>+{day.events.length - 2} more</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventCalendar;

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Event, EventCalendarDay } from '../../types/events';

interface EventCalendarProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  onDateClick?: (date: Date) => void;
}

const CalendarContainer = styled.div`
  background: white;
  border: 1px solid ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
  border-radius: 12px;
  padding: 1.5rem;
`;

const CalendarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const MonthTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.text?.primary || '#111827'};
`;

const NavButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const NavButton = styled.button`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${props => props.theme.colors.neutral?.[300] || '#d1d5db'};
  background: white;
  color: ${props => props.theme.text?.primary || '#111827'};
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.neutral?.[100] || '#f3f4f6'};
  }
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
`;

const DayHeader = styled.div`
  padding: 0.75rem;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => props.theme.text?.secondary || '#6b7280'};
  text-transform: uppercase;
`;

const DayCell = styled.div<{ $isToday?: boolean; $isCurrentMonth?: boolean; $hasEvents?: boolean }>`
  min-height: 100px;
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props =>
    props.$isToday
      ? props.theme.colors.primary?.[50] || '#eff6ff'
      : props.$isCurrentMonth
        ? 'white'
        : props.theme.colors.neutral?.[50] || '#f9fafb'};

  ${props =>
    props.$isToday &&
    `
    border-color: ${props.theme.colors.primary?.[500] || '#3b82f6'};
    border-width: 2px;
  `}

  opacity: ${props => (props.$isCurrentMonth ? 1 : 0.5)};

  &:hover {
    background: ${props => props.theme.colors.primary?.[50] || '#eff6ff'};
    border-color: ${props => props.theme.colors.primary?.[300] || '#93c5fd'};
  }
`;

const DayNumber = styled.div<{ $isToday?: boolean }>`
  font-size: 0.875rem;
  font-weight: ${props => (props.$isToday ? '700' : '500')};
  color: ${props =>
    props.$isToday
      ? props.theme.colors.primary?.[600] || '#2563eb'
      : props.theme.text?.primary || '#111827'};
  margin-bottom: 0.5rem;
`;

const EventDot = styled.div<{ $color: string }>`
  width: 100%;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.25rem;
  background: ${props => props.$color};
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 500;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const MoreEvents = styled.div`
  font-size: 0.625rem;
  color: ${props => props.theme.text?.secondary || '#6b7280'};
  font-weight: 500;
  margin-top: 0.25rem;
`;

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

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

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
    <CalendarContainer>
      <CalendarHeader>
        <MonthTitle>{monthName}</MonthTitle>
        <NavButtons>
          <NavButton onClick={handlePrevMonth}>← Prev</NavButton>
          <NavButton onClick={handleToday}>Today</NavButton>
          <NavButton onClick={handleNextMonth}>Next →</NavButton>
        </NavButtons>
      </CalendarHeader>

      <CalendarGrid>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <DayHeader key={day}>{day}</DayHeader>
        ))}

        {calendarDays.map((day, index) => (
          <DayCell
            key={index}
            $isToday={day.isToday}
            $isCurrentMonth={day.isCurrentMonth}
            $hasEvents={day.events.length > 0}
            onClick={() => onDateClick && onDateClick(day.date)}
          >
            <DayNumber $isToday={day.isToday}>{day.date.getDate()}</DayNumber>

            {day.events.slice(0, 2).map(event => (
              <EventDot
                key={event.id}
                $color={getEventColor(event.type)}
                onClick={e => {
                  e.stopPropagation();
                  if (onEventClick) onEventClick(event);
                }}
                title={event.name}
              >
                {event.name}
              </EventDot>
            ))}

            {day.events.length > 2 && <MoreEvents>+{day.events.length - 2} more</MoreEvents>}
          </DayCell>
        ))}
      </CalendarGrid>
    </CalendarContainer>
  );
};

export default EventCalendar;

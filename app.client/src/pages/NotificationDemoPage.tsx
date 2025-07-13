import NotificationCenterComponent from '@/components/notifications/NotificationCenter';
import { useNotifications } from '@/contexts/NotificationContext';
import notificationService from '@/services/notificationService';
import { Button } from '@adopt-dont-shop/components';
import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;

  h1 {
    font-size: 2.5rem;
    color: ${props => props.theme.text.primary};
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.1rem;
    color: ${props => props.theme.text.secondary};
    max-width: 600px;
    margin: 0 auto;
  }
`;

const Section = styled.section`
  background: ${props => props.theme.background.secondary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;

  h2 {
    font-size: 1.5rem;
    color: ${props => props.theme.text.primary};
    margin-bottom: 1rem;
  }

  p {
    color: ${props => props.theme.text.secondary};
    margin-bottom: 1.5rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const StatusCard = styled.div`
  background: ${props => props.theme.background.primary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .status-item {
    text-align: center;

    .label {
      font-size: 0.875rem;
      color: ${props => props.theme.text.secondary};
      margin-bottom: 0.5rem;
    }

    .value {
      font-size: 1.25rem;
      font-weight: 600;
      color: ${props => props.theme.text.primary};
    }
  }
`;

const NotificationModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled.div`
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
`;

export const NotificationDemoPage: React.FC = () => {
  const {
    unreadCount,
    isLoading,
    preferences,
    requestPermission,
    updatePreferences,
    refreshCount,
    startPolling,
  } = useNotifications();

  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<(() => void) | null>(null);

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      alert("Push notifications enabled! You'll now receive browser notifications.");
    } else {
      alert('Push notifications denied. You can enable them in your browser settings.');
    }
  };

  const handleToggleNotifications = async (type: 'email' | 'push' | 'sms' | 'marketing') => {
    if (!preferences) return;

    try {
      await updatePreferences({
        [type]: !preferences[type],
      });
      alert(`${type} notifications ${!preferences[type] ? 'enabled' : 'disabled'}`);
    } catch (error) {
      alert('Failed to update preferences');
    }
  };

  const handleSimulateNotification = () => {
    const mockNotification = {
      notification_id: `mock_${Date.now()}`,
      title: 'New Application Update',
      message:
        'Your application for Luna has been approved! Please check your email for next steps.',
      type: 'application_status',
      priority: 'normal' as const,
      created_at: new Date().toISOString(),
      data: {
        application_id: 'app_123',
        pet_name: 'Luna',
        action_url: '/applications/app_123',
      },
    };

    notificationService.simulateNewNotification(mockNotification);
  };

  const handleStartPolling = () => {
    if (isPolling) {
      pollingInterval?.();
      setPollingInterval(null);
      setIsPolling(false);
    } else {
      const stopPolling = startPolling(10000); // Poll every 10 seconds for demo
      setPollingInterval(() => stopPolling);
      setIsPolling(true);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <Header>
          <h1>Loading Notification System...</h1>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <h1>🔔 Notification System Demo</h1>
        <p>
          Experience our comprehensive notification system with email, push, and SMS support. Manage
          your preferences and see real-time updates in action.
        </p>
      </Header>

      <Section>
        <h2>📊 Current Status</h2>
        <StatusCard>
          <div className='status-item'>
            <div className='label'>Unread Notifications</div>
            <div className='value'>{unreadCount}</div>
          </div>
          <div className='status-item'>
            <div className='label'>Email Notifications</div>
            <div className='value'>{preferences?.email ? '✅' : '❌'}</div>
          </div>
          <div className='status-item'>
            <div className='label'>Push Notifications</div>
            <div className='value'>{preferences?.push ? '✅' : '❌'}</div>
          </div>
          <div className='status-item'>
            <div className='label'>SMS Notifications</div>
            <div className='value'>{preferences?.sms ? '✅' : '❌'}</div>
          </div>
        </StatusCard>
      </Section>

      <Section>
        <h2>🔧 Quick Actions</h2>
        <p>Test different notification features and see how they work.</p>

        <ButtonGroup>
          <Button onClick={() => setShowNotificationCenter(true)}>Open Notification Center</Button>
          <Button variant='secondary' onClick={handleRequestPermission}>
            Request Push Permission
          </Button>
          <Button variant='secondary' onClick={handleSimulateNotification}>
            Simulate Notification
          </Button>
          <Button variant='secondary' onClick={refreshCount}>
            Refresh Count
          </Button>
          <Button variant={isPolling ? 'danger' : 'secondary'} onClick={handleStartPolling}>
            {isPolling ? 'Stop Polling' : 'Start Polling'}
          </Button>
        </ButtonGroup>
      </Section>

      <Section>
        <h2>⚙️ Preferences</h2>
        <p>Toggle different notification types to see how preferences work.</p>

        <ButtonGroup>
          <Button
            variant={preferences?.email ? 'primary' : 'secondary'}
            onClick={() => handleToggleNotifications('email')}
          >
            Email: {preferences?.email ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant={preferences?.push ? 'primary' : 'secondary'}
            onClick={() => handleToggleNotifications('push')}
          >
            Push: {preferences?.push ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant={preferences?.sms ? 'primary' : 'secondary'}
            onClick={() => handleToggleNotifications('sms')}
          >
            SMS: {preferences?.sms ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant={preferences?.marketing ? 'primary' : 'secondary'}
            onClick={() => handleToggleNotifications('marketing')}
          >
            Marketing: {preferences?.marketing ? 'ON' : 'OFF'}
          </Button>
        </ButtonGroup>
      </Section>

      <Section>
        <h2>📋 Implementation Details</h2>
        <p>This notification system includes:</p>
        <ul style={{ color: 'inherit', paddingLeft: '1.5rem' }}>
          <li>✅ Multi-channel delivery (Email, Push, SMS)</li>
          <li>✅ User preference management</li>
          <li>✅ Real-time notification center</li>
          <li>✅ Quiet hours support</li>
          <li>✅ Priority-based filtering</li>
          <li>✅ Browser notification integration</li>
          <li>✅ Polling fallback for real-time updates</li>
          <li>✅ React hooks for easy integration</li>
        </ul>
      </Section>

      {showNotificationCenter && (
        <NotificationModal>
          <ModalContent>
            <NotificationCenterComponent onClose={() => setShowNotificationCenter(false)} />
          </ModalContent>
        </NotificationModal>
      )}
    </Container>
  );
};

export default NotificationDemoPage;

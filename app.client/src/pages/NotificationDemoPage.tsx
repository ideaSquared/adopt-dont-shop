import NotificationCenterComponent from '@/components/notifications/NotificationCenter';
import { useNotifications } from '@/contexts/NotificationContext';
import notificationService from '@/services/notificationService';
import { Button } from '@adopt-dont-shop/lib.components';
import React, { useState } from 'react';
import * as styles from './NotificationDemoPage.css';

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
    if (!preferences) {
      return;
    }

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
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Loading Notification System...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🔔 Notification System Demo</h1>
        <p>
          Experience our comprehensive notification system with email, push, and SMS support. Manage
          your preferences and see real-time updates in action.
        </p>
      </div>

      <section className={styles.section}>
        <h2>📊 Current Status</h2>
        <div className={styles.statusCard}>
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
        </div>
      </section>

      <section className={styles.section}>
        <h2>🔧 Quick Actions</h2>
        <p>Test different notification features and see how they work.</p>

        <div className={styles.buttonGroup}>
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
        </div>
      </section>

      <section className={styles.section}>
        <h2>⚙️ Preferences</h2>
        <p>Toggle different notification types to see how preferences work.</p>

        <div className={styles.buttonGroup}>
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
        </div>
      </section>

      <section className={styles.section}>
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
      </section>

      {showNotificationCenter && (
        <div className={styles.notificationModal}>
          <div className={styles.modalContent}>
            <NotificationCenterComponent onClose={() => setShowNotificationCenter(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDemoPage;

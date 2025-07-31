import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { ProtectedRoute } from '@/components/navigation/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { PetsPage } from '@/pages/pets/PetsPage';
import { ApplicationsPage } from '@/pages/applications/ApplicationsPage';
import { StaffPage } from '@/pages/staff/StaffPage';
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { CommunicationPage } from '@/pages/communication/CommunicationPage';
import { 
  PETS_VIEW, 
  APPLICATIONS_VIEW, 
  STAFF_VIEW, 
  ANALYTICS_VIEW, 
  RESCUE_SETTINGS_VIEW,
  CHAT_VIEW 
} from '@adopt-dont-shop/lib-permissions';

/**
 * Main App component for the Rescue App
 * Provides routing, authentication, and global state management
 */
function App() {
  return (
    <div className='app'>
      <AuthProvider>
        <AppContextProviders>
          <AppRoutes />
        </AppContextProviders>
      </AuthProvider>
    </div>
  );
}

/**
 * Context providers wrapper that depends on authentication
 */
function AppContextProviders({ children }: { children: React.ReactNode }) {
  return (
    <PermissionsProvider>
      <FeatureFlagsProvider>
        <AnalyticsProvider>
          <NotificationsProvider>
            <ChatProvider>
              {children}
            </ChatProvider>
          </NotificationsProvider>
        </AnalyticsProvider>
      </FeatureFlagsProvider>
    </PermissionsProvider>
  );
}

/**
 * Application routes configuration with permission-based access control
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path='/login' element={<LoginPage />} />

      {/* Protected Routes with specific permissions */}
      
      {/* Dashboard - Accessible to all authenticated users */}
      <Route
        path='/dashboard'
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Pet Management - Requires pets.read permission */}
      <Route
        path='/pets'
        element={
          <ProtectedRoute requiredPermission={PETS_VIEW}>
            <AppLayout>
              <PetsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Application Management - Requires applications.read permission */}
      <Route
        path='/applications'
        element={
          <ProtectedRoute requiredPermission={APPLICATIONS_VIEW}>
            <AppLayout>
              <ApplicationsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Staff Management - Requires users.read permission */}
      <Route
        path='/staff'
        element={
          <ProtectedRoute requiredPermission={STAFF_VIEW}>
            <AppLayout>
              <StaffPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Analytics - Requires admin.reports permission */}
      <Route
        path='/analytics'
        element={
          <ProtectedRoute requiredPermission={ANALYTICS_VIEW}>
            <AppLayout>
              <AnalyticsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Communication - Requires chats.read permission */}
      <Route
        path='/communication'
        element={
          <ProtectedRoute requiredPermission={CHAT_VIEW}>
            <AppLayout>
              <CommunicationPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Settings - Requires rescues.read permission */}
      <Route
        path='/settings'
        element={
          <ProtectedRoute requiredPermission={RESCUE_SETTINGS_VIEW}>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path='/' element={<Navigate to='/dashboard' replace />} />

      {/* Catch all - redirect to dashboard */}
      <Route path='*' element={<Navigate to='/dashboard' replace />} />
    </Routes>
  );
}

export default App;

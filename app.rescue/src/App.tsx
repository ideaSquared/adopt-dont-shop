import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from '@adopt-dont-shop/components';
import { AuthProvider } from '@/contexts/AuthContext';
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

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Main App component for the Rescue App
 * Provides routing, authentication, and global state management
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className='App'>
              <Routes>
                {/* Public Routes */}
                <Route path='/login' element={<LoginPage />} />

                {/* Protected Routes */}
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

                <Route
                  path='/pets'
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <PetsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/applications'
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ApplicationsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/staff'
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <StaffPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/analytics'
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AnalyticsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/communication'
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <CommunicationPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/settings'
                  element={
                    <ProtectedRoute>
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
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

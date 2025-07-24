import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from '@adopt-dont-shop/components';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/navigation/ProtectedRoute';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';

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
                      <DashboardPage />
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

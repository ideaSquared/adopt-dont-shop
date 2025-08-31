import { ThemeProvider } from '@adopt-dont-shop/components';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from '@/contexts/AuthContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { StatsigWrapper } from '@/contexts/StatsigContext';
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <StatsigWrapper>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PermissionsProvider>
              <ThemeProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </ThemeProvider>
            </PermissionsProvider>
          </AuthProvider>
        </QueryClientProvider>
      </StatsigWrapper>
    </ErrorBoundary>
  </React.StrictMode>
);

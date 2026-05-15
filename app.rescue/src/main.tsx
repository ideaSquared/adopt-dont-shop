import { ThemeProvider, Toaster, toast } from '@adopt-dont-shop/lib.components';
import { captureException, initSentry, reportWebVitals } from '@adopt-dont-shop/lib.observability';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppWithAuth } from './components/AppWithAuth';
import { ChatProvider } from '@/contexts/ChatContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { StatsigWrapper } from '@/contexts/StatsigContext';
import ErrorBoundary from './components/ErrorBoundary';

// ADS-406: initialise Sentry as early as possible so any synchronous module-load
// error is captured. No-ops when VITE_SENTRY_DSN is unset.
initSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  appName: 'rescue',
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_RELEASE,
});

// ADS-507: report Core Web Vitals via Sentry until /api/v1/web-vitals exists.
reportWebVitals(metric => {
  captureException(`web-vital:${metric.name}`, {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
  });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    // ADS-125: surface mutation failures as toast notifications. We keep the
    // message generic so we don't leak server internals; specific mutations
    // can opt out by providing their own onError.
    mutations: {
      onError: () => {
        toast.error('Something went wrong. Please try again.', { duration: 6000 });
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppWithAuth>
          <StatsigWrapper>
            <PermissionsProvider>
              <ThemeProvider>
                <ChatProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                  <Toaster />
                </ChatProvider>
              </ThemeProvider>
            </PermissionsProvider>
          </StatsigWrapper>
        </AppWithAuth>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

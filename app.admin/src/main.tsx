import { ThemeProvider } from '@adopt-dont-shop/lib.components';
import { AuthProvider } from '@adopt-dont-shop/lib.auth';
import { attachStoredCookieConsent } from '@adopt-dont-shop/lib.legal';
import { captureException, initSentry, reportWebVitals } from '@adopt-dont-shop/lib.observability';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { StatsigWrapper } from './contexts/StatsigContext';

// ADS-406: initialise Sentry as early as possible so any synchronous module-load
// error is captured. No-ops when VITE_SENTRY_DSN is unset.
initSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  appName: 'admin',
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_RELEASE,
});

// ADS-507: report Core Web Vitals. For now we just forward to Sentry so the
// metrics end up in one place; a dedicated /api/v1/web-vitals backend endpoint
// is a follow-up.
reportWebVitals(metric => {
  captureException(`web-vital:${metric.name}`, {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
  });
});

// ADS-476: explicit defaults so every component remount doesn't refetch and
// auth/404 errors don't retry 3× before failing. Defaults copied from app.rescue;
// without these, @tanstack/react-query uses staleTime: 0 and retry: 3.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// ADS-497 (slice 5): on first sign-in OR rehydrate, replay an anonymous
// cookie-banner choice (if any) against the user's account. Idempotent
// per (userId, cookiesVersion).
const handleAuthEvent = (event: string, data?: Record<string, unknown>) => {
  if (event !== 'auth_session_authenticated') {
    return;
  }
  const userId = typeof data?.user_id === 'string' ? data.user_id : null;
  if (userId) {
    void attachStoredCookieConsent(userId);
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider
          allowedUserTypes={['admin', 'moderator']}
          appType='admin'
          onAuthEvent={handleAuthEvent}
        >
          <StatsigWrapper>
            <ThemeProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </ThemeProvider>
          </StatsigWrapper>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

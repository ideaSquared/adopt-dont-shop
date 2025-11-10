import { ThemeProvider } from '@adopt-dont-shop/components';
import { AuthProvider } from '@adopt-dont-shop/lib-auth';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { StatsigWrapper } from './contexts/StatsigContext';
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider allowedUserTypes={['adopter']} appType='client'>
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

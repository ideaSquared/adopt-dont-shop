import { Route, Routes } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { DevLoginPanel } from '@/components/dev/DevLoginPanel';
import { Footer } from '@adopt-dont-shop/lib.components';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';

function App() {
  return (
    <PermissionsProvider>
      <FeatureFlagsProvider>
        <NotificationsProvider>
          <AnalyticsProvider>
            <div className="app">
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
            </Routes>
          </main>
          <DevLoginPanel />
          <Footer />
        </div>
      </AnalyticsProvider>
    </NotificationsProvider>
  </FeatureFlagsProvider>
</PermissionsProvider>
  );
}

export default App;
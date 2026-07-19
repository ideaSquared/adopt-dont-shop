import { Route, Routes } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { DevLoginPanel } from '@/components/dev/DevLoginPanel';
import { Footer } from '@adopt-dont-shop/lib.components';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';

function App() {
  return (
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
  );
}

export default App;
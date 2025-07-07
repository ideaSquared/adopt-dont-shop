import { AuthProvider } from '@/contexts/AuthContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import {
  ApplicationDetailsPage,
  ApplicationPage,
  FavoritesPage,
  HomePage,
  LoginPage,
  PetDetailsPage,
  ProfilePage,
  RegisterPage,
  RescueDetailsPage,
  SearchPage,
} from '@/pages';
import { Footer } from '@adopt-dont-shop/components';
import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { DevLoginPanel } from './components/dev/DevLoginPanel';
import { DiscoveryPage } from './components/discovery/DiscoveryPage';
import { AppNavbar } from './components/navigation/AppNavbar';
import { SwipeOnboarding } from './components/onboarding/SwipeOnboarding';
import { SwipeFloatingButton } from './components/ui/SwipeFloatingButton';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <AuthProvider>
      <FavoritesProvider>
        <div className='app'>
          <AppNavbar />
          <main>
            <Routes>
              <Route path='/' element={<HomePage />} />
              <Route path='/discover' element={<DiscoveryPage />} />
              <Route path='/search' element={<SearchPage />} />
              <Route path='/pets/:id' element={<PetDetailsPage />} />
              <Route path='/rescues/:id' element={<RescueDetailsPage />} />
              <Route path='/apply/:petId' element={<ApplicationPage />} />
              <Route path='/applications/:id' element={<ApplicationDetailsPage />} />
              <Route path='/profile' element={<ProfilePage />} />
              <Route path='/favorites' element={<FavoritesPage />} />
              <Route path='/login' element={<LoginPage />} />
              <Route path='/register' element={<RegisterPage />} />
            </Routes>
          </main>
          <SwipeFloatingButton />
          <DevLoginPanel />
          {showOnboarding && <SwipeOnboarding onClose={() => setShowOnboarding(false)} />}
          <Footer />
        </div>
      </FavoritesProvider>
    </AuthProvider>
  );
}

export default App;

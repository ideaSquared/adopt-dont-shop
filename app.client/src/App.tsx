import { AuthProvider } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
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
import NotificationDemoPage from '@/pages/NotificationDemoPage';
import { Footer } from '@adopt-dont-shop/components';
import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ChatPage } from './components/chat/ChatPage';
import { DevLoginPanel } from './components/dev/DevLoginPanel';
import { DiscoveryPage } from './components/discovery/DiscoveryPage';
import { AppNavbar } from './components/navigation/AppNavbar';
import { SwipeOnboarding } from './components/onboarding/SwipeOnboarding';
import { SwipeFloatingButton } from './components/ui/SwipeFloatingButton';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <AuthProvider>
      <NotificationProvider>
        <ChatProvider>
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
                  <Route path='/chat' element={<ChatPage />} />
                  <Route path='/chat/:conversationId' element={<ChatPage />} />
                  <Route path='/login' element={<LoginPage />} />
                  <Route path='/register' element={<RegisterPage />} />
                  <Route path='/notifications-demo' element={<NotificationDemoPage />} />
                </Routes>
              </main>
              <SwipeFloatingButton />
              <DevLoginPanel />
              {showOnboarding && <SwipeOnboarding onClose={() => setShowOnboarding(false)} />}
              <Footer />
            </div>
          </FavoritesProvider>
        </ChatProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;

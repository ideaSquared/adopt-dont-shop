import { lazy, Suspense, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Footer, Spinner } from '@adopt-dont-shop/lib.components';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { DevLoginPanel } from './components/dev/DevLoginPanel';
import { AppNavbar } from './components/navigation/AppNavbar';
import { SwipeOnboarding } from './components/onboarding/SwipeOnboarding';
import { SwipeFloatingButton } from './components/ui/SwipeFloatingButton';

const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const DiscoveryPage = lazy(() =>
  import('./components/discovery/DiscoveryPage').then(m => ({ default: m.DiscoveryPage }))
);
const SearchPage = lazy(() => import('@/pages/SearchPage').then(m => ({ default: m.SearchPage })));
const PetDetailsPage = lazy(() =>
  import('@/pages/PetDetailsPage').then(m => ({ default: m.PetDetailsPage }))
);
const RescueDetailsPage = lazy(() =>
  import('@/pages/RescueDetailsPage').then(m => ({ default: m.RescueDetailsPage }))
);
const ApplicationPage = lazy(() =>
  import('@/pages/ApplicationPage').then(m => ({ default: m.ApplicationPage }))
);
const ApplicationDetailsPage = lazy(() =>
  import('@/pages/ApplicationDetailsPage').then(m => ({ default: m.ApplicationDetailsPage }))
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage }))
);
const FavoritesPage = lazy(() =>
  import('@/pages/FavoritesPage').then(m => ({ default: m.FavoritesPage }))
);
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then(m => ({ default: m.NotificationsPage }))
);
const ChatPage = lazy(() =>
  import('./components/chat/ChatPage').then(m => ({ default: m.ChatPage }))
);
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('@/pages/RegisterPage').then(m => ({ default: m.RegisterPage }))
);
const VerifyEmailPage = lazy(() =>
  import('@/pages/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage }))
);
const BlogPage = lazy(() => import('@/pages/BlogPage').then(m => ({ default: m.BlogPage })));
const BlogPostPage = lazy(() =>
  import('@/pages/BlogPostPage').then(m => ({ default: m.BlogPostPage }))
);
const HelpPage = lazy(() => import('@/pages/HelpPage').then(m => ({ default: m.HelpPage })));
const HelpArticlePage = lazy(() =>
  import('@/pages/HelpArticlePage').then(m => ({ default: m.HelpArticlePage }))
);

const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
    }}
  >
    <Spinner size='lg' label='Loading page' />
  </div>
);

function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <PermissionsProvider>
      <AnalyticsProvider>
        <NotificationsProvider>
          <ChatProvider>
            <FavoritesProvider>
              <div className='app'>
                <AppNavbar />
                <main>
                  <Suspense fallback={<PageLoader />}>
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
                      <Route path='/notifications' element={<NotificationsPage />} />
                      <Route path='/chat' element={<ChatPage />} />
                      <Route path='/chat/:conversationId' element={<ChatPage />} />
                      <Route path='/login' element={<LoginPage />} />
                      <Route path='/register' element={<RegisterPage />} />
                      <Route path='/verify-email' element={<VerifyEmailPage />} />
                      <Route path='/forgot-password' element={<ForgotPasswordPage />} />
                      <Route path='/reset-password' element={<ResetPasswordPage />} />
                      <Route path='/blog' element={<BlogPage />} />
                      <Route path='/blog/:slug' element={<BlogPostPage />} />
                      <Route path='/help' element={<HelpPage />} />
                      <Route path='/help/:slug' element={<HelpArticlePage />} />
                    </Routes>
                  </Suspense>
                </main>
                <SwipeFloatingButton />
                <DevLoginPanel />
                {showOnboarding && <SwipeOnboarding onClose={() => setShowOnboarding(false)} />}
                <Footer />
              </div>
            </FavoritesProvider>
          </ChatProvider>
        </NotificationsProvider>
      </AnalyticsProvider>
    </PermissionsProvider>
  );
}

export default App;

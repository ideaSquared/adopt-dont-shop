import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Spinner } from '@adopt-dont-shop/lib.components';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { DevLoginPanel } from './components/dev/DevLoginPanel';
import { AppShell } from './components/layout/AppShell';
import { PublicAuthLayout } from './components/layout/PublicAuthLayout';

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
const ApplicationDashboard = lazy(() =>
  import('@/pages/ApplicationDashboard').then(m => ({ default: m.ApplicationDashboard }))
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
const CheckYourEmailPage = lazy(() =>
  import('@/pages/CheckYourEmailPage').then(m => ({ default: m.CheckYourEmailPage }))
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
  return (
    <PermissionsProvider>
      <AnalyticsProvider>
        <NotificationsProvider>
          <ChatProvider>
            <FavoritesProvider>
              <DevLoginPanel />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route element={<PublicAuthLayout />}>
                    <Route path='/login' element={<LoginPage />} />
                    <Route path='/register' element={<RegisterPage />} />
                    <Route path='/verify-email' element={<VerifyEmailPage />} />
                    <Route path='/check-your-email' element={<CheckYourEmailPage />} />
                    <Route path='/forgot-password' element={<ForgotPasswordPage />} />
                    <Route path='/reset-password' element={<ResetPasswordPage />} />
                  </Route>

                  <Route element={<AppShell />}>
                    <Route path='/' element={<HomePage />} />
                    <Route path='/discover' element={<DiscoveryPage />} />
                    <Route path='/search' element={<SearchPage />} />
                    <Route path='/pets/:id' element={<PetDetailsPage />} />
                    <Route path='/rescues/:id' element={<RescueDetailsPage />} />
                    <Route path='/apply/:petId' element={<ApplicationPage />} />
                    <Route path='/applications' element={<ApplicationDashboard />} />
                    <Route path='/applications/:id' element={<ApplicationDetailsPage />} />
                    <Route path='/profile' element={<ProfilePage />} />
                    <Route path='/favorites' element={<FavoritesPage />} />
                    <Route path='/notifications' element={<NotificationsPage />} />
                    <Route path='/chat' element={<ChatPage />} />
                    <Route path='/chat/:conversationId' element={<ChatPage />} />
                    <Route path='/blog' element={<BlogPage />} />
                    <Route path='/blog/:slug' element={<BlogPostPage />} />
                    <Route path='/help' element={<HelpPage />} />
                    <Route path='/help/:slug' element={<HelpArticlePage />} />
                  </Route>
                </Routes>
              </Suspense>
            </FavoritesProvider>
          </ChatProvider>
        </NotificationsProvider>
      </AnalyticsProvider>
    </PermissionsProvider>
  );
}

export default App;

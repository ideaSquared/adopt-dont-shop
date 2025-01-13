import {
  CompleteAccountSetup,
  CreateAccount,
  ForgotPassword,
  Login,
  ResetPassword,
  Settings,
  VerifyEmail,
} from '@adoptdontshop/pages/account'
import { Conversations } from '@adoptdontshop/pages/chat'
import {
  Conversations as AdminConversations,
  Applications,
  FeatureFlags,
  Logs,
  Pets,
  Ratings,
  Rescue,
  Rescues,
  Staff,
  Users,
} from '@adoptdontshop/pages/dashboard'
import { Home } from '@adoptdontshop/pages/landing'
import { Swipe } from '@adoptdontshop/pages/swipe'
import {
  PermissionProvider,
  ProtectedRoute,
  Role,
} from '@adoptdontshop/permissions'
import React from 'react'
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import { UserProvider, useUser } from './contexts/auth/UserContext'
import {
  FeatureFlagProvider,
  useFeatureFlag,
} from './contexts/feature-flags/FeatureFlagContext'
import { ThemeProvider } from './contexts/theme/ThemeContext'
import GlobalStyles from './styles/GlobalStyles'

const AppContent: React.FC = () => {
  const { user } = useUser()
  const userRoles = user ? user.roles : []
  const chatBetaEnabled = useFeatureFlag('chat_beta')

  return (
    <PermissionProvider roles={userRoles}>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/complete-account" element={<CompleteAccountSetup />} />
          <Route
            element={
              <ProtectedRoute requiredRoles={[Role.USER, Role.VERIFIED_USER]} />
            }
          >
            <Route path="/settings" element={<Settings />} />
            <Route path="/swipe" element={<Swipe />} />
            {chatBetaEnabled ? (
              <Route path="/chat" element={<Conversations />} />
            ) : (
              <Route path="/chat" element={<Navigate to="/" />} />
            )}
          </Route>
          <Route element={<ProtectedRoute requiredRoles={[Role.STAFF]} />}>
            <Route
              path="/applications"
              element={<Applications isAdminView={false} />}
            />
          </Route>
          <Route element={<ProtectedRoute requiredRoles={[Role.STAFF]} />}>
            <Route path="/pets" element={<Pets isAdminView={false} />} />
          </Route>
          <Route element={<ProtectedRoute requiredRoles={[Role.STAFF]} />}>
            <Route path="/staff" element={<Staff />} />
          </Route>
          <Route element={<ProtectedRoute requiredRoles={[Role.STAFF]} />}>
            <Route path="/rescue" element={<Rescue />} />
          </Route>
          <Route element={<ProtectedRoute requiredRoles={[Role.ADMIN]} />}>
            <Route path="/logs" element={<Logs />} />
            <Route path="/users" element={<Users />} />
            {chatBetaEnabled ? (
              <Route path="/conversations" element={<AdminConversations />} />
            ) : (
              <Route path="/conversations" element={<Navigate to="/" />} />
            )}
            <Route path="/rescues" element={<Rescues />} />
            <Route path="/feature-flags" element={<FeatureFlags />} />
            <Route path="/ratings" element={<Ratings />} />
            <Route path="/admin/pets" element={<Pets isAdminView={true} />} />
            <Route
              path="/admin/applications"
              element={<Applications isAdminView={true} />}
            />
          </Route>
        </Routes>
      </Router>
    </PermissionProvider>
  )
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <GlobalStyles />
      <FeatureFlagProvider>
        <UserProvider>
          <AppContent />
        </UserProvider>
      </FeatureFlagProvider>
    </ThemeProvider>
  )
}

export default App

import { Navbar } from '@adoptdontshop/components'
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
import { UserProvider, useUser } from 'contexts/auth/UserContext'
import {
  FeatureFlagProvider,
  useFeatureFlag,
} from 'contexts/feature-flags/FeatureFlagContext'
import React from 'react'
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import GlobalStyles from './styles/GlobalStyles'
import { theme } from './styles/theme'

const AppContent: React.FC = () => {
  const { user } = useUser() // Retrieve the user from context

  const userRoles = user ? user.roles : [] // Extract roles from the user

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
            <Route path="/applications" element={<Applications />} />
          </Route>
          <Route element={<ProtectedRoute requiredRoles={[Role.STAFF]} />}>
            <Route path="/ratings" element={<Ratings />} />
            <Route path="/pets" element={<Pets />} />
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
          </Route>
        </Routes>
      </Router>
    </PermissionProvider>
  )
}

const App: React.FC = () => {
  return (
    <FeatureFlagProvider>
      <ThemeProvider theme={theme}>
        <UserProvider>
          <GlobalStyles />
          <AppContent />
        </UserProvider>
      </ThemeProvider>
    </FeatureFlagProvider>
  )
}

export default App

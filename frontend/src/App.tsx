import {
  CompleteAccountSetup,
  CreateAccount,
  ForgotPassword,
  Login,
  ResetPassword,
  Settings,
  VerifyEmail,
} from '@adoptdontshop/pages/account'
import { ChatContainer } from '@adoptdontshop/pages/chat'
import {
  Applications,
  AuditLogs,
  Conversations,
  FeatureFlags,
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
  useParams,
} from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import { AlertProvider } from './contexts/alert/AlertContext'
import { UserProvider, useUser } from './contexts/auth/UserContext'
import {
  FeatureFlagProvider,
  useFeatureFlag,
} from './contexts/feature-flags/FeatureFlagContext'
import { ThemeProvider } from './contexts/theme/ThemeContext'
import {
  AdminQuestionConfigForm,
  AdminQuestionConfigList,
} from './pages/admin/ApplicationQuestionConfig'
import {
  ApplicationForm,
  ApplicationQuestionConfig,
  ApplicationReview,
} from './pages/applications'
import { Dashboard } from './pages/dashboard/Dashboard'
import GlobalStyles from './styles/GlobalStyles'

// Wrapper components for routes that need URL parameters
const ApplicationFormWrapper: React.FC = () => {
  const { rescueId, petId } = useParams<{ rescueId: string; petId: string }>()
  if (!rescueId || !petId) return <Navigate to="/" />
  return <ApplicationForm rescueId={rescueId} petId={petId} />
}

const ApplicationReviewWrapper: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>()
  if (!applicationId) return <Navigate to="/applications" />
  return <ApplicationReview applicationId={applicationId} />
}

const ApplicationQuestionConfigWrapper: React.FC = () => {
  const { rescue } = useUser()
  if (!rescue) return <Navigate to="/applications" />
  return <ApplicationQuestionConfig rescueId={rescue.rescue_id} />
}

const AppContent: React.FC = () => {
  const { user } = useUser()
  const userRoles = user ? user.roles : []
  const chatBetaEnabled = useFeatureFlag('chat_beta')

  return (
    <PermissionProvider roles={userRoles}>
      <Router>
        <Navbar />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/complete-account" element={<CompleteAccountSetup />} />

          {/* User routes */}
          <Route
            element={
              <ProtectedRoute requiredRoles={[Role.USER, Role.VERIFIED_USER]} />
            }
          >
            <Route path="/settings" element={<Settings />} />
            <Route path="/swipe" element={<Swipe />} />
            {chatBetaEnabled && (
              <Route path="/chat/:conversationId" element={<ChatContainer />} />
            )}
            <Route
              path="/apply/:rescueId/:petId"
              element={<ApplicationFormWrapper />}
            />
          </Route>

          {/* Staff routes */}
          <Route element={<ProtectedRoute requiredRoles={[Role.STAFF]} />}>
            <Route
              path="/applications"
              element={<Applications isAdminView={false} />}
            />
            <Route
              path="/applications/:applicationId"
              element={<ApplicationReviewWrapper />}
            />
            <Route
              path="/applications/questions"
              element={<ApplicationQuestionConfigWrapper />}
            />
            <Route path="/pets" element={<Pets isAdminView={false} />} />
            <Route path="/staff" element={<Staff />} />
            <Route
              path="/dashboard"
              element={<Dashboard isAdminView={false} />}
            />
            <Route path="/rescue" element={<Rescue />} />
            <Route
              path="/chat"
              element={<Conversations isAdminView={false} />}
            />
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute requiredRoles={[Role.ADMIN]} />}>
            <Route
              path="/admin/dashboard"
              element={<Dashboard isAdminView={true} />}
            />
            <Route path="/admin/logs" element={<AuditLogs />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/rescues" element={<Rescues />} />
            <Route path="/admin/feature-flags" element={<FeatureFlags />} />
            <Route path="/admin/ratings" element={<Ratings />} />
            <Route path="/admin/pets" element={<Pets isAdminView={true} />} />
            <Route
              path="/admin/applications"
              element={<Applications isAdminView={true} />}
            />
            <Route
              path="/admin/applications/:applicationId"
              element={<ApplicationReviewWrapper />}
            />
            <Route
              path="/admin/applications/questions"
              element={<AdminQuestionConfigList />}
            />
            <Route
              path="/admin/applications/questions/create"
              element={<AdminQuestionConfigForm />}
            />
            <Route
              path="/admin/applications/questions/:configId"
              element={<AdminQuestionConfigForm />}
            />
            <Route
              path="/admin/chat"
              element={<Conversations isAdminView={true} />}
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
          <AlertProvider>
            <AppContent />
          </AlertProvider>
        </UserProvider>
      </FeatureFlagProvider>
    </ThemeProvider>
  )
}

export default App

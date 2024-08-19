import { Navbar } from '@adoptdontshop/components'
import {
  CreateAccount,
  ForgotPassword,
  Login,
  ResetPassword,
  Settings,
} from '@adoptdontshop/pages/account'
import { Conversations } from '@adoptdontshop/pages/chat'
import {
  Conversations as AdminConversations,
  Applications,
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
import React from 'react'
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import GlobalStyles from './styles/GlobalStyles'
import { theme } from './styles/theme'

const AppContent: React.FC = () => {
  const { user } = useUser() // Retrieve the user from context

  const userRoles = user ? user.roles : [] // Extract roles from the user

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

          <Route element={<ProtectedRoute requiredRole={Role.USER} />}>
            <Route path="/settings" element={<Settings />} />
            <Route path="/swipe" element={<Swipe />} />
            <Route path="/chat" element={<Conversations />} />
          </Route>

          <Route element={<ProtectedRoute requiredRole={Role.STAFF} />}>
            <Route path="/applications" element={<Applications />} />
          </Route>
          <Route element={<ProtectedRoute requiredRole={Role.STAFF} />}>
            <Route path="/ratings" element={<Ratings />} />
            <Route path="/pets" element={<Pets />} />
          </Route>
          <Route element={<ProtectedRoute requiredRole={Role.STAFF} />}>
            <Route path="/staff" element={<Staff />} />
          </Route>
          <Route element={<ProtectedRoute requiredRole={Role.STAFF} />}>
            <Route path="/rescue" element={<Rescue />} />
            <Route path="/rescues" element={<Rescues />} />
          </Route>
          <Route element={<ProtectedRoute requiredRole={Role.ADMIN} />}>
            <Route path="/logs" element={<Logs />} />
            <Route path="/users" element={<Users />} />
            <Route path="/conversations" element={<AdminConversations />} />
          </Route>
        </Routes>
      </Router>
    </PermissionProvider>
  )
}

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <UserProvider>
        <GlobalStyles />
        <AppContent />
      </UserProvider>
    </ThemeProvider>
  )
}

export default App

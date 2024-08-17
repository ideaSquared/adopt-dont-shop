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
  Permission,
  PermissionProvider,
  ProtectedRoute,
  Role,
} from '@adoptdontshop/permissions'
import React from 'react'
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import GlobalStyles from './styles/GlobalStyles'
import { theme } from './styles/theme'

const App: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const TEST_userRoles: Role[] = []
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const TEST_rescueRoles: Role[] = [
    Role.STAFF,
    Role.RESCUE_MANAGER,
    Role.STAFF_MANAGER,
    Role.PET_MANAGER,
    Role.COMMUNICATIONS_MANAGER,
    Role.APPLICATION_MANAGER,
  ]
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const TEST_adminRoles: Role[] = [Role.ADMIN, Role.STAFF]

  return (
    <ThemeProvider theme={theme}>
      <PermissionProvider roles={TEST_adminRoles}>
        <GlobalStyles />
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/create-account" element={<CreateAccount />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/swipe" element={<Swipe />} />
            <Route path="/chat" element={<Conversations />} />

            <Route
              element={
                <ProtectedRoute
                  requiredPermission={Permission.VIEW_APPLICATIONS}
                />
              }
            >
              <Route path="/applications" element={<Applications />} />
            </Route>
            <Route
              element={
                <ProtectedRoute requiredPermission={Permission.VIEW_PET} />
              }
            >
              <Route path="/ratings" element={<Ratings />} />
              <Route path="/pets" element={<Pets />} />
            </Route>
            <Route
              element={
                <ProtectedRoute requiredPermission={Permission.VIEW_STAFF} />
              }
            >
              <Route path="/staff" element={<Staff />} />
            </Route>
            <Route
              element={
                <ProtectedRoute
                  requiredPermission={Permission.VIEW_RESCUE_INFO}
                />
              }
            >
              <Route path="/rescue" element={<Rescue />} />
              <Route path="/rescues" element={<Rescues />} />
            </Route>
            <Route
              element={
                <ProtectedRoute requiredPermission={Permission.VIEW_MESSAGES} />
              }
            >
              <Route path="/conversations" element={<Conversations />} />
            </Route>
            <Route
              element={
                <ProtectedRoute
                  requiredPermission={Permission.VIEW_DASHBOARD}
                />
              }
            >
              <Route path="/logs" element={<Logs />} />
              <Route path="/users" element={<Users />} />
            </Route>
          </Routes>
        </Router>
      </PermissionProvider>
    </ThemeProvider>
  )
}

export default App

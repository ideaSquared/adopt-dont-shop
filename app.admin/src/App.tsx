import { Routes, Route } from 'react-router-dom';
import { LoginPage, RegisterPage } from './pages';
import { Button, Card } from '@adopt-dont-shop/components';
import { useAuth } from '@adopt-dont-shop/lib-auth';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Admin Dashboard</h1>
          {user && <p>Welcome, {user.firstName} {user.lastName} ({user.email})</p>}
        </div>
        <Button variant='secondary' onClick={logout}>Sign Out</Button>
      </div>

      <Card>
        <h2>Admin Features</h2>
        <ul>
          <li>User Management</li>
          <li>Rescue Management</li>
          <li>Content Moderation</li>
          <li>System Analytics</li>
          <li>Support Tickets</li>
        </ul>
      </Card>
    </div>
  );
};

const AdminApp = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />} />
        <Route path='*' element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path='/' element={<Dashboard />} />
      <Route path='*' element={<Dashboard />} />
    </Routes>
  );
};

export default AdminApp;

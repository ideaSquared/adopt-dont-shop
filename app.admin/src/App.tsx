// Admin App Placeholder - To be implemented during migration
import { Button, Card } from '@adopt-dont-shop/components';

const AdminApp = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Admin Dashboard</h1>
      <p>This will be implemented during the migration process.</p>

      <Card>
        <h2>Admin Features</h2>
        <ul>
          <li>User Management</li>
          <li>Rescue Management</li>
          <li>Content Moderation</li>
          <li>System Analytics</li>
          <li>Support Tickets</li>
        </ul>

        <Button variant='primary'>Access Admin Panel</Button>
      </Card>
    </div>
  );
};

export default AdminApp;

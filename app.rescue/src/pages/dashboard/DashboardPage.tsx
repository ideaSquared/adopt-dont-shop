import React from 'react';
import { Card, CardHeader, CardContent, Heading, Text, Button } from '@adopt-dont-shop/components';
import { useAuth, usePermissions } from '@/contexts/AuthContext';
import { Permission } from '@/types';

/**
 * Dashboard page for the Rescue App
 * Shows role-specific overview and quick actions
 */
export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  if (!user) {
    return null;
  }

  const quickActions = [
    {
      title: 'View Animals',
      description: 'Browse all animals in your rescue',
      action: () => {
        // Navigate to animals - will be implemented in Phase 2
      },
      permission: Permission.PETS_VIEW,
    },
    {
      title: 'Add New Animal',
      description: 'Register a new animal profile',
      action: () => {
        // Navigate to add animal - will be implemented in Phase 2
      },
      permission: Permission.PETS_CREATE,
    },
    {
      title: 'Manage Applications',
      description: 'Review adoption applications',
      action: () => {
        // Navigate to applications - will be implemented in Phase 2
      },
      permission: Permission.APPLICATIONS_VIEW,
    },
    {
      title: 'User Management',
      description: 'Manage rescue staff and volunteers',
      action: () => {
        // Navigate to user management - will be implemented in Phase 2
      },
      permission: Permission.STAFF_VIEW,
    },
    {
      title: 'Rescue Settings',
      description: 'Configure rescue information',
      action: () => {
        // Navigate to settings - will be implemented in Phase 2
      },
      permission: Permission.RESCUE_SETTINGS_VIEW,
    },
  ];

  const availableActions = quickActions.filter(action => hasPermission(action.permission));

  return (
    <div className='container mx-auto px-4 py-8'>
      {/* Welcome Section */}
      <div className='mb-8'>
        <Heading level='h1' className='text-3xl font-bold text-gray-900 mb-2'>
          Welcome back, {user.first_name}!
        </Heading>
        <Text className='text-lg text-gray-600'>Your Rescue Dashboard</Text>
      </div>

      {/* Stats Cards - Placeholder for Phase 2 */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        <Card>
          <CardContent className='p-6'>
            <div className='text-center'>
              <div className='text-3xl font-bold text-blue-600 mb-2'>--</div>
              <Text className='text-sm text-gray-600'>Total Animals</Text>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='text-center'>
              <div className='text-3xl font-bold text-green-600 mb-2'>--</div>
              <Text className='text-sm text-gray-600'>Available for Adoption</Text>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='text-center'>
              <div className='text-3xl font-bold text-yellow-600 mb-2'>--</div>
              <Text className='text-sm text-gray-600'>Pending Applications</Text>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='text-center'>
              <div className='text-3xl font-bold text-purple-600 mb-2'>--</div>
              <Text className='text-sm text-gray-600'>Recent Adoptions</Text>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className='mb-8'>
        <Heading level='h2' className='text-2xl font-semibold text-gray-900 mb-6'>
          Quick Actions
        </Heading>

        {availableActions.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {availableActions.map((action, index) => (
              <Card key={index} className='hover:shadow-lg transition-shadow'>
                <CardHeader>
                  <Heading level='h3' className='text-lg font-medium'>
                    {action.title}
                  </Heading>
                </CardHeader>
                <CardContent>
                  <Text className='text-gray-600 mb-4'>{action.description}</Text>
                  <Button variant='primary' size='sm' onClick={action.action} className='w-full'>
                    {action.title}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className='p-8 text-center'>
              <Text className='text-gray-600'>
                No actions available for your current role. Please contact your administrator.
              </Text>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity - Placeholder for Phase 2 */}
      <div>
        <Heading level='h2' className='text-2xl font-semibold text-gray-900 mb-6'>
          Recent Activity
        </Heading>
        <Card>
          <CardContent className='p-8 text-center'>
            <Text className='text-gray-600'>Activity feed will be available in Phase 2</Text>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

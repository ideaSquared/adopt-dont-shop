import { useAuth } from '@adopt-dont-shop/lib-auth';
import { DevPanelComponent } from '@adopt-dont-shop/lib-dev-tools';
import React from 'react';

// Check if we're in development mode
const isDevelopment = () => {
  return import.meta.env.MODE === 'development' || import.meta.env.DEV;
};

const DevLoginPanel: React.FC = () => {
  const authContext = useAuth();

  return (
    <DevPanelComponent
      title='Client Dev Login Panel'
      authContext={authContext}
      isDevelopment={isDevelopment}
      userTypes={['adopter']}
      useApiData={true}
    />
  );
};

export { DevLoginPanel };
export default DevLoginPanel;

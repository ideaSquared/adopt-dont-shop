import { useAuth } from '@/contexts/AuthContext';
import { DevPanelComponent } from '@adopt-dont-shop/lib-dev-tools';
import React from 'react';

// Check if we're in development mode
const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

const DevLoginPanel: React.FC = () => {
  const authContext = useAuth();
  
  return (
    <DevPanelComponent
      title="Client Dev Login Panel"
      authContext={authContext}
      isDevelopment={isDevelopment}
      userTypes={['adopter']}
      useApiData={true}
    />
  );
};

export { DevLoginPanel };
export default DevLoginPanel;

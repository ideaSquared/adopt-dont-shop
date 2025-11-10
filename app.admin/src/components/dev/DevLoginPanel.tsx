import { useAuth } from '@adopt-dont-shop/lib-auth';
import { DevPanelComponent } from '@adopt-dont-shop/lib-dev-tools';
import { isDevelopment } from '@/utils/env';
import React from 'react';

const DevLoginPanel: React.FC = () => {
  const authContext = useAuth();

  return (
    <DevPanelComponent
      title="Admin Dev Login Panel"
      authContext={authContext}
      isDevelopment={isDevelopment}
      userTypes={['admin', 'moderator']}
      useApiData={true}
    />
  );
};

export { DevLoginPanel };
export default DevLoginPanel;

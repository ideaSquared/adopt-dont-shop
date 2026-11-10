import { useAuth } from '@adopt-dont-shop/lib.auth';
import { DevPanelComponent } from '@adopt-dont-shop/lib.dev-tools';
import { isDevelopment } from '@adopt-dont-shop/lib.utils';
import React from 'react';

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

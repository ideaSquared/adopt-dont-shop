import React from 'react';
import styled from 'styled-components';
import { TwoFactorSettings } from '@adopt-dont-shop/lib.auth';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  p {
    font-size: 1.1rem;
    color: #6b7280;
    margin: 0;
  }
`;

const Section = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 2rem;
  margin-bottom: 1.5rem;

  h2 {
    font-size: 1.25rem;
    color: #374151;
    margin: 0 0 0.5rem 0;
  }

  > p {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0 0 1.5rem 0;
  }
`;

const AccountSettings: React.FC = () => {
  return (
    <PageContainer>
      <PageHeader>
        <h1>Account Settings</h1>
        <p>Manage your account security settings.</p>
      </PageHeader>

      <Section>
        <h2>Two-Factor Authentication</h2>
        <p>
          Add an extra layer of security to your admin account by requiring a verification code when
          you sign in.
        </p>
        <TwoFactorSettings />
      </Section>
    </PageContainer>
  );
};

export default AccountSettings;

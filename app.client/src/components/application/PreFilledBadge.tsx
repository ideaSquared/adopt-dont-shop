import React from 'react';
import styled from 'styled-components';

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.5rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 500;
  color: ${props => props.theme.colors.primary[700]};
  background: ${props => props.theme.colors.primary[50]};
  border: 1px solid ${props => props.theme.colors.primary[200]};
  border-radius: 9999px;
  line-height: 1.2;
  vertical-align: middle;
`;

type Props = {
  label?: string;
};

export const PreFilledBadge: React.FC<Props> = ({ label = 'Pre-filled from your profile' }) => (
  <Chip title={label} aria-label={label}>
    <span aria-hidden='true'>✨</span>
    <span>Pre-filled</span>
  </Chip>
);

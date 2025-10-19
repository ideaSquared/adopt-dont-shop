import React from 'react';
import styled from 'styled-components';
import { Card } from '@adopt-dont-shop/components';
import { MdCheckCircle, MdHome, MdPeople, MdPets, MdAttachMoney } from 'react-icons/md';

interface AdoptionPolicy {
  requireHomeVisit: boolean;
  requireReferences: boolean;
  minimumReferenceCount: number;
  requireVeterinarianReference: boolean;
  adoptionFeeRange: {
    min: number;
    max: number;
  };
  requirements: string[];
  policies: string[];
  returnPolicy?: string;
  spayNeuterPolicy?: string;
  followUpPolicy?: string;
}

interface AdoptionPoliciesDisplayProps {
  adoptionPolicies?: AdoptionPolicy | null;
  rescueName?: string;
}

const PolicyCard = styled(Card)`
  padding: 2rem;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.text.primary};
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .icon {
    width: 24px;
    height: 24px;
  }
`;

const RequirementsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const RequirementItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: ${props => props.theme.background.secondary};
  border-radius: 8px;

  .icon {
    width: 20px;
    height: 20px;
    color: ${props => props.theme.colors.success};
    flex-shrink: 0;
    margin-top: 2px;
  }

  .text {
    font-size: 0.9rem;
    color: ${props => props.theme.text.secondary};
    line-height: 1.4;
  }
`;

const FeeRange = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: ${props => props.theme.background.secondary};
  border-radius: 12px;
  margin-bottom: 2rem;

  .icon {
    width: 32px;
    height: 32px;
    color: ${props => props.theme.colors.primary};
  }

  .fee-info {
    flex: 1;

    .label {
      font-size: 0.875rem;
      color: ${props => props.theme.text.secondary};
      margin-bottom: 0.25rem;
    }

    .amount {
      font-size: 1.5rem;
      font-weight: 700;
      color: ${props => props.theme.text.primary};
    }
  }
`;

const ListSection = styled.div`
  margin-bottom: 2rem;

  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: ${props => props.theme.text.primary};
    margin: 0 0 1rem 0;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid ${props => props.theme.border.color.secondary};

    &:last-child {
      border-bottom: none;
    }

    .bullet {
      width: 6px;
      height: 6px;
      background: ${props => props.theme.colors.primary};
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 0.5rem;
    }

    .text {
      font-size: 0.95rem;
      color: ${props => props.theme.text.secondary};
      line-height: 1.6;
    }
  }
`;

const PolicyDetailSection = styled.div`
  margin-bottom: 2rem;

  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: ${props => props.theme.text.primary};
    margin: 0 0 0.75rem 0;
  }

  p {
    font-size: 0.95rem;
    color: ${props => props.theme.text.secondary};
    line-height: 1.6;
    margin: 0;
    padding: 1rem;
    background: ${props => props.theme.background.secondary};
    border-radius: 8px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: ${props => props.theme.text.secondary};

  .icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 1rem;
    opacity: 0.4;
  }

  h3 {
    font-size: 1.25rem;
    color: ${props => props.theme.text.primary};
    margin: 0 0 0.5rem 0;
  }

  p {
    font-size: 0.95rem;
    margin: 0;
  }
`;

export const AdoptionPoliciesDisplay: React.FC<AdoptionPoliciesDisplayProps> = ({
  adoptionPolicies,
  rescueName = 'This rescue',
}) => {
  if (!adoptionPolicies) {
    return (
      <PolicyCard>
        <SectionTitle>
          <MdPets className="icon" />
          Adoption Information
        </SectionTitle>
        <EmptyState>
          <MdPets className="icon" />
          <h3>No adoption information available</h3>
          <p>{rescueName} hasn't provided adoption policies yet. Please contact them directly for more information.</p>
        </EmptyState>
      </PolicyCard>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <PolicyCard>
      <SectionTitle>
        <MdPets className="icon" />
        Adoption Information
      </SectionTitle>

      {/* Adoption Fee Range */}
      <FeeRange>
        <MdAttachMoney className="icon" />
        <div className="fee-info">
          <div className="label">Adoption Fee Range</div>
          <div className="amount">
            {formatCurrency(adoptionPolicies.adoptionFeeRange.min)} - {formatCurrency(adoptionPolicies.adoptionFeeRange.max)}
          </div>
        </div>
      </FeeRange>

      {/* Application Requirements */}
      <RequirementsGrid>
        {adoptionPolicies.requireHomeVisit && (
          <RequirementItem>
            <MdHome className="icon" />
            <span className="text">Home visit required</span>
          </RequirementItem>
        )}
        {adoptionPolicies.requireReferences && (
          <RequirementItem>
            <MdPeople className="icon" />
            <span className="text">
              {adoptionPolicies.minimumReferenceCount} reference{adoptionPolicies.minimumReferenceCount !== 1 ? 's' : ''} required
            </span>
          </RequirementItem>
        )}
        {adoptionPolicies.requireVeterinarianReference && (
          <RequirementItem>
            <MdCheckCircle className="icon" />
            <span className="text">Veterinarian reference required</span>
          </RequirementItem>
        )}
      </RequirementsGrid>

      {/* Requirements List */}
      {adoptionPolicies.requirements && adoptionPolicies.requirements.length > 0 && (
        <ListSection>
          <h3>Requirements</h3>
          <ul>
            {adoptionPolicies.requirements.map((requirement, index) => (
              <li key={index}>
                <div className="bullet" />
                <span className="text">{requirement}</span>
              </li>
            ))}
          </ul>
        </ListSection>
      )}

      {/* Policies List */}
      {adoptionPolicies.policies && adoptionPolicies.policies.length > 0 && (
        <ListSection>
          <h3>Policies</h3>
          <ul>
            {adoptionPolicies.policies.map((policy, index) => (
              <li key={index}>
                <div className="bullet" />
                <span className="text">{policy}</span>
              </li>
            ))}
          </ul>
        </ListSection>
      )}

      {/* Additional Policy Details */}
      {adoptionPolicies.returnPolicy && (
        <PolicyDetailSection>
          <h3>Return Policy</h3>
          <p>{adoptionPolicies.returnPolicy}</p>
        </PolicyDetailSection>
      )}

      {adoptionPolicies.spayNeuterPolicy && (
        <PolicyDetailSection>
          <h3>Spay/Neuter Policy</h3>
          <p>{adoptionPolicies.spayNeuterPolicy}</p>
        </PolicyDetailSection>
      )}

      {adoptionPolicies.followUpPolicy && (
        <PolicyDetailSection>
          <h3>Follow-up Policy</h3>
          <p>{adoptionPolicies.followUpPolicy}</p>
        </PolicyDetailSection>
      )}
    </PolicyCard>
  );
};

import React from 'react';
import { Card } from '@adopt-dont-shop/lib.components';
import { MdCheckCircle, MdHome, MdPeople, MdPets, MdAttachMoney } from 'react-icons/md';
import * as styles from './AdoptionPoliciesDisplay.css';

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

export const AdoptionPoliciesDisplay: React.FC<AdoptionPoliciesDisplayProps> = ({
  adoptionPolicies,
  rescueName = 'This rescue',
}) => {
  if (!adoptionPolicies) {
    return (
      <Card className={styles.policyCard}>
        <h2 className={styles.sectionTitle}>
          <MdPets className='icon' />
          Adoption Information
        </h2>
        <div className={styles.emptyState}>
          <MdPets className='icon' />
          <h3>No adoption information available</h3>
          <p>
            {rescueName} hasn't provided adoption policies yet. Please contact them directly for
            more information.
          </p>
        </div>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <Card className={styles.policyCard}>
      <h2 className={styles.sectionTitle}>
        <MdPets className='icon' />
        Adoption Information
      </h2>

      {/* Adoption Fee Range */}
      <div className={styles.feeRange}>
        <MdAttachMoney className='icon' />
        <div className='fee-info'>
          <div className='label'>Adoption Fee Range</div>
          <div className='amount'>
            {formatCurrency(adoptionPolicies.adoptionFeeRange.min)} -{' '}
            {formatCurrency(adoptionPolicies.adoptionFeeRange.max)}
          </div>
        </div>
      </div>

      {/* Application Requirements */}
      <div className={styles.requirementsGrid}>
        {adoptionPolicies.requireHomeVisit && (
          <div className={styles.requirementItem}>
            <MdHome className='icon' />
            <span className='text'>Home visit required</span>
          </div>
        )}
        {adoptionPolicies.requireReferences && (
          <div className={styles.requirementItem}>
            <MdPeople className='icon' />
            <span className='text'>
              {adoptionPolicies.minimumReferenceCount} reference
              {adoptionPolicies.minimumReferenceCount !== 1 ? 's' : ''} required
            </span>
          </div>
        )}
        {adoptionPolicies.requireVeterinarianReference && (
          <div className={styles.requirementItem}>
            <MdCheckCircle className='icon' />
            <span className='text'>Veterinarian reference required</span>
          </div>
        )}
      </div>

      {/* Requirements List */}
      {adoptionPolicies.requirements && adoptionPolicies.requirements.length > 0 && (
        <div className={styles.listSection}>
          <h3>Requirements</h3>
          <ul>
            {adoptionPolicies.requirements.map(requirement => (
              <li key={requirement}>
                <div className='bullet' />
                <span className='text'>{requirement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Policies List */}
      {adoptionPolicies.policies && adoptionPolicies.policies.length > 0 && (
        <div className={styles.listSection}>
          <h3>Policies</h3>
          <ul>
            {adoptionPolicies.policies.map(policy => (
              <li key={policy}>
                <div className='bullet' />
                <span className='text'>{policy}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Additional Policy Details */}
      {adoptionPolicies.returnPolicy && (
        <div className={styles.policyDetailSection}>
          <h3>Return Policy</h3>
          <p>{adoptionPolicies.returnPolicy}</p>
        </div>
      )}

      {adoptionPolicies.spayNeuterPolicy && (
        <div className={styles.policyDetailSection}>
          <h3>Spay/Neuter Policy</h3>
          <p>{adoptionPolicies.spayNeuterPolicy}</p>
        </div>
      )}

      {adoptionPolicies.followUpPolicy && (
        <div className={styles.policyDetailSection}>
          <h3>Follow-up Policy</h3>
          <p>{adoptionPolicies.followUpPolicy}</p>
        </div>
      )}
    </Card>
  );
};

import { Pet } from '@/services';
import React from 'react';
import styled from 'styled-components';
import { resolveFileUrl } from '../../utils/fileUtils';

interface PetSummaryProps {
  pet: Pet;
}

const SummaryCard = styled.div`
  background: ${props => props.theme.background.primary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 12px;
  padding: 1.5rem;
  position: sticky;
  top: 2rem;
`;

const PetImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const PetName = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.text.primary};
  margin: 0 0 0.5rem 0;
`;

const PetDetails = styled.div`
  margin-bottom: 1rem;
`;

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid ${props => props.theme.border.color.primary};

  &:last-child {
    border-bottom: none;
  }
`;

const DetailLabel = styled.span`
  font-weight: 500;
  color: ${props => props.theme.text.secondary};
  font-size: 0.875rem;
`;

const DetailValue = styled.span`
  color: ${props => props.theme.text.primary};
  font-size: 0.875rem;
`;

const RescueInfo = styled.div`
  padding: 1rem;
  background: ${props => props.theme.background.secondary};
  border-radius: 8px;
  margin-top: 1rem;
`;

const RescueName = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.text.primary};
  margin: 0 0 0.5rem 0;
`;

const RescueLocation = styled.p`
  font-size: 0.875rem;
  color: ${props => props.theme.text.secondary};
  margin: 0;
`;

const AdoptionFee = styled.div`
  text-align: center;
  padding: 1rem;
  background: ${props => props.theme.colors.primary[50]};
  border-radius: 8px;
  margin-top: 1rem;
`;

const FeeLabel = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.text.secondary};
  margin-bottom: 0.25rem;
`;

const FeeAmount = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.primary[600]};
`;

export const PetSummary: React.FC<PetSummaryProps> = ({ pet }) => {
  const primaryImageUrl = resolveFileUrl(pet.images?.[0]?.url);
  const ageDisplay =
    pet.age_years > 0
      ? `${pet.age_years} year${pet.age_years > 1 ? 's' : ''}${
          pet.age_months > 0 ? `, ${pet.age_months} month${pet.age_months > 1 ? 's' : ''}` : ''
        }`
      : `${pet.age_months} month${pet.age_months > 1 ? 's' : ''}`;

  return (
    <SummaryCard>
      {primaryImageUrl && <PetImage src={primaryImageUrl} alt={pet.name} loading='lazy' />}

      <PetName>{pet.name}</PetName>

      <PetDetails>
        <DetailItem>
          <DetailLabel>Type</DetailLabel>
          <DetailValue>{pet.type}</DetailValue>
        </DetailItem>

        <DetailItem>
          <DetailLabel>Breed</DetailLabel>
          <DetailValue>{pet.breed}</DetailValue>
        </DetailItem>

        <DetailItem>
          <DetailLabel>Age</DetailLabel>
          <DetailValue>{ageDisplay}</DetailValue>
        </DetailItem>

        <DetailItem>
          <DetailLabel>Gender</DetailLabel>
          <DetailValue>{pet.gender}</DetailValue>
        </DetailItem>

        <DetailItem>
          <DetailLabel>Size</DetailLabel>
          <DetailValue>{pet.size}</DetailValue>
        </DetailItem>

        {pet.weight_kg && (
          <DetailItem>
            <DetailLabel>Weight</DetailLabel>
            <DetailValue>{pet.weight_kg} kg</DetailValue>
          </DetailItem>
        )}

        <DetailItem>
          <DetailLabel>Status</DetailLabel>
          <DetailValue>{pet.status}</DetailValue>
        </DetailItem>
      </PetDetails>

      {pet.adoption_fee && (
        <AdoptionFee>
          <FeeLabel>Adoption Fee</FeeLabel>
          <FeeAmount>${pet.adoption_fee}</FeeAmount>
        </AdoptionFee>
      )}

      <RescueInfo>
        <RescueName>{pet.rescue?.name || 'Rescue Organization'}</RescueName>
        {pet.rescue?.location && <RescueLocation>{pet.rescue.location}</RescueLocation>}
      </RescueInfo>
    </SummaryCard>
  );
};

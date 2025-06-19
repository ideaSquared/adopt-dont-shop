import React from 'react';
import styled, { css } from 'styled-components';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export type PetStatus = 'available' | 'pending' | 'adopted' | 'not-available';
export type PetSize = 'small' | 'medium' | 'large';
export type PetGender = 'male' | 'female' | 'unknown';

export type Pet = {
  id: string;
  name: string;
  breed: string;
  age: number;
  size: PetSize;
  gender: PetGender;
  description?: string;
  images: string[];
  status: PetStatus;
  location?: string;
  rescueId?: string;
  rescueName?: string;
  specialNeeds?: boolean;
  tags?: string[];
};

export type PetCardProps = {
  pet: Pet;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  isFavorited?: boolean;
  onFavoriteToggle?: (petId: string) => void;
  onViewDetails?: (petId: string) => void;
  onStartApplication?: (petId: string) => void;
  className?: string;
  'data-testid'?: string;
};

const StyledPetCard = styled.div<{ $variant: 'default' | 'compact' | 'detailed' }>`
  background: ${({ theme }) => theme.colors.neutral.white};
  border-radius: ${({ theme }) => theme.spacing.md};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all ${({ theme }) => theme.transitions.fast};
  border: 1px solid ${({ theme }) => theme.colors.neutral[200]};
  position: relative;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  ${({ $variant }) =>
    $variant === 'compact' &&
    css`
      max-width: 300px;
    `}

  ${({ $variant }) =>
    $variant === 'detailed' &&
    css`
      max-width: 400px;
    `}
`;

const ImageContainer = styled.div<{ $variant: 'default' | 'compact' | 'detailed' }>`
  position: relative;
  width: 100%;
  height: ${({ $variant }) =>
    $variant === 'compact' ? '200px' : $variant === 'detailed' ? '300px' : '250px'};
  overflow: hidden;
`;

const PetImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform ${({ theme }) => theme.transitions.normal};

  &:hover {
    transform: scale(1.05);
  }
`;

const StatusBadge = styled(Badge)<{ $status: PetStatus }>`
  position: absolute;
  top: ${({ theme }) => theme.spacing.sm};
  right: ${({ theme }) => theme.spacing.sm};
  z-index: 1;
`;

const FavoriteButton = styled.button<{ $isFavorited: boolean }>`
  position: absolute;
  top: ${({ theme }) => theme.spacing.sm};
  left: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.neutral.white};
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all ${({ theme }) => theme.transitions.fast};
  z-index: 1;

  &:hover {
    background: ${({ theme }) => theme.colors.neutral[50]};
    transform: scale(1.1);
  }

  &::before {
    content: ${({ $isFavorited }) => ($isFavorited ? '"♥"' : '"♡"')};
    color: ${({ $isFavorited, theme }) =>
      $isFavorited ? theme.colors.semantic.error.main : theme.colors.neutral[400]};
    font-size: 20px;
  }
`;

const CardContent = styled.div<{ $variant: 'default' | 'compact' | 'detailed' }>`
  padding: ${({ theme, $variant }) =>
    $variant === 'compact' ? theme.spacing.sm : theme.spacing.md};
`;

const PetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const PetInfo = styled.div`
  flex: 1;
`;

const PetName = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  font-size: ${({ theme }) => theme.typography.size.lg};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.neutral[900]};
`;

const PetBreed = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.neutral[600]};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

const PetDetails = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const DetailBadge = styled.span`
  background: ${({ theme }) => theme.colors.neutral[100]};
  color: ${({ theme }) => theme.colors.neutral[700]};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

const PetDescription = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.neutral[600]};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TagsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
`;

const Tag = styled.span`
  background: ${({ theme }) => theme.colors.primary.light};
  color: ${({ theme }) => theme.colors.primary.dark};
  padding: ${({ theme }) => `2px ${theme.spacing.xs}`};
  border-radius: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

const RescueInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.spacing.xs};
`;

const RescueDetails = styled.div`
  flex: 1;
`;

const RescueName = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.neutral[800]};
`;

const RescueLocation = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.neutral[600]};
`;

const CardActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const SpecialNeedsBadge = styled.div`
  background: ${({ theme }) => theme.colors.semantic.warning.light};
  color: ${({ theme }) => theme.colors.semantic.warning.dark};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  display: inline-block;
`;

export const PetCard: React.FC<PetCardProps> = ({
  pet,
  variant = 'default',
  showActions = true,
  isFavorited = false,
  onFavoriteToggle,
  onViewDetails,
  onStartApplication,
  className,
  'data-testid': dataTestId,
}) => {
  const statusLabels = {
    available: 'Available',
    pending: 'Adoption Pending',
    adopted: 'Adopted',
    'not-available': 'Not Available',
  };

  const isActionable = pet.status === 'available';
  const mainImage = pet.images[0] || '/placeholder-pet.jpg';

  return (
    <StyledPetCard $variant={variant} className={className} data-testid={dataTestId}>
      <ImageContainer $variant={variant}>
        <PetImage src={mainImage} alt={`${pet.name} - ${pet.breed}`} />

        <StatusBadge
          $status={pet.status}
          variant={
            pet.status === 'available'
              ? 'success'
              : pet.status === 'pending'
                ? 'warning'
                : pet.status === 'adopted'
                  ? 'info'
                  : 'neutral'
          }
        >
          {statusLabels[pet.status]}
        </StatusBadge>

        {onFavoriteToggle && (
          <FavoriteButton
            $isFavorited={isFavorited}
            onClick={() => onFavoriteToggle(pet.id)}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          />
        )}
      </ImageContainer>

      <CardContent $variant={variant}>
        <PetHeader>
          <PetInfo>
            <PetName>{pet.name}</PetName>
            <PetBreed>{pet.breed}</PetBreed>
          </PetInfo>
        </PetHeader>

        <PetDetails>
          <DetailBadge>
            {pet.age} {pet.age === 1 ? 'year' : 'years'} old
          </DetailBadge>
          <DetailBadge>{pet.size} size</DetailBadge>
          <DetailBadge>{pet.gender}</DetailBadge>
        </PetDetails>

        {pet.specialNeeds && <SpecialNeedsBadge>⚠️ Special Needs</SpecialNeedsBadge>}

        {pet.description && variant !== 'compact' && (
          <PetDescription>{pet.description}</PetDescription>
        )}

        {pet.tags && pet.tags.length > 0 && variant === 'detailed' && (
          <TagsContainer>
            {pet.tags.map((tag, index) => (
              <Tag key={index}>{tag}</Tag>
            ))}
          </TagsContainer>
        )}

        {pet.rescueName && variant !== 'compact' && (
          <RescueInfo>
            <Avatar size='sm' />
            <RescueDetails>
              <RescueName>{pet.rescueName}</RescueName>
              {pet.location && <RescueLocation>{pet.location}</RescueLocation>}
            </RescueDetails>
          </RescueInfo>
        )}

        {showActions && (
          <CardActions>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => onViewDetails?.(pet.id)}
              isFullWidth={variant === 'compact'}
            >
              View Details
            </Button>

            {isActionable && onStartApplication && (
              <Button
                variant='primary'
                size='sm'
                onClick={() => onStartApplication(pet.id)}
                isFullWidth={variant === 'compact'}
              >
                Apply to Adopt
              </Button>
            )}
          </CardActions>
        )}
      </CardContent>
    </StyledPetCard>
  );
};


import React from 'react';
import styled from 'styled-components';
import type { Pet } from '@/services';
import { resolveFileUrl } from '@/utils/fileUtils';

type Props = {
  pet: Pet;
  heading: string;
  subheading?: string;
};

const Card = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: center;
  padding: 1.5rem;
  margin-bottom: 2rem;
  background: ${props => props.theme.background.primary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(244, 63, 94, 0.06);

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const ImageWrap = styled.div`
  flex-shrink: 0;
  width: 112px;
  height: 112px;
  border-radius: 0.75rem;
  overflow: hidden;
  background: ${props => props.theme.background.secondary};

  @media (max-width: 640px) {
    width: 100%;
    height: 180px;
  }
`;

const PetImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PlaceholderIcon = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Eyebrow = styled.p`
  margin: 0 0 0.25rem 0;
  font-size: 0.8125rem;
  color: ${props => props.theme.text.secondary};
`;

const Heading = styled.h2`
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: ${props => props.theme.text.primary};
  line-height: 1.2;
`;

const Subheading = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  color: ${props => props.theme.text.secondary};
  line-height: 1.4;
`;

const typeEmoji = (type: string): string => {
  switch (type) {
    case 'dog':
      return '🐶';
    case 'cat':
      return '🐱';
    case 'rabbit':
      return '🐰';
    case 'bird':
      return '🐦';
    default:
      return '🐾';
  }
};

export const PetHeroCard: React.FC<Props> = ({ pet, heading, subheading }) => {
  const imageUrl = resolveFileUrl(pet.images?.[0]?.url);
  const rescueName = pet.rescue?.name ?? 'this rescue';

  return (
    <Card>
      <ImageWrap>
        {imageUrl ? (
          <PetImage src={imageUrl} alt={pet.name} loading='lazy' />
        ) : (
          <PlaceholderIcon aria-hidden='true'>{typeEmoji(pet.type)}</PlaceholderIcon>
        )}
      </ImageWrap>
      <Content>
        <Eyebrow>From {rescueName}</Eyebrow>
        <Heading>{heading}</Heading>
        {subheading && <Subheading>{subheading}</Subheading>}
      </Content>
    </Card>
  );
};

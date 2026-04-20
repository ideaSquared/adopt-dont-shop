import React from 'react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const SkeletonBase = styled.div<{ $width?: string; $height?: string; $radius?: string }>`
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  border-radius: ${props => props.$radius ?? '4px'};
  width: ${props => props.$width ?? '100%'};
  height: ${props => props.$height ?? '1rem'};
`;

type SkeletonProps = {
  width?: string;
  height?: string;
  radius?: string;
  className?: string;
};

export const Skeleton: React.FC<SkeletonProps> = ({ width, height, radius, className }) => (
  <SkeletonBase $width={width} $height={height} $radius={radius} className={className} />
);

const TextLine = styled(SkeletonBase)`
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

type SkeletonTextProps = {
  lines?: number;
  lastLineWidth?: string;
};

export const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 3, lastLineWidth = '60%' }) => (
  <div>
    {Array.from({ length: lines }, (_, i) => (
      <TextLine
        key={i}
        $height='0.875rem'
        $width={i === lines - 1 ? lastLineWidth : '100%'}
      />
    ))}
  </div>
);

const CellContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

type SkeletonTableRowProps = {
  columnCount: number;
  hasCheckbox?: boolean;
};

export const SkeletonTableRow: React.FC<SkeletonTableRowProps> = ({
  columnCount,
  hasCheckbox = false,
}) => (
  <tr aria-hidden='true' data-testid='skeleton-row'>
    {hasCheckbox && (
      <td style={{ padding: '1rem' }}>
        <SkeletonBase $width='1rem' $height='1rem' $radius='2px' />
      </td>
    )}
    {Array.from({ length: columnCount }, (_, i) => (
      <td key={i} style={{ padding: '1rem' }}>
        <CellContainer>
          {i === 0 ? (
            <>
              <SkeletonBase $width='2rem' $height='2rem' $radius='50%' style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <SkeletonBase $height='0.875rem' style={{ marginBottom: '0.25rem' }} />
                <SkeletonBase $height='0.75rem' $width='70%' />
              </div>
            </>
          ) : (
            <SkeletonBase $height='0.875rem' $width={i % 3 === 0 ? '60%' : '80%'} />
          )}
        </CellContainer>
      </td>
    ))}
  </tr>
);

const CardContainer = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
`;

type SkeletonCardProps = {
  lines?: number;
  showAvatar?: boolean;
};

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3, showAvatar = false }) => (
  <CardContainer aria-hidden='true'>
    {showAvatar && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <SkeletonBase $width='3rem' $height='3rem' $radius='50%' style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <SkeletonBase $height='1rem' style={{ marginBottom: '0.375rem' }} />
          <SkeletonBase $height='0.875rem' $width='60%' />
        </div>
      </div>
    )}
    <SkeletonText lines={lines} />
  </CardContainer>
);

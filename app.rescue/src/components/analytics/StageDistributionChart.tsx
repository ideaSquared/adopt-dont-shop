import React, { useState } from 'react';
import styled from 'styled-components';
import { StageDistribution } from '../../services/analyticsService';

interface StageDistributionChartProps {
  data: StageDistribution[];
  loading?: boolean;
}

const ChartContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const DonutContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  height: 280px;
`;

const SVGContainer = styled.svg`
  max-width: 280px;
  max-height: 280px;
  transform: rotate(-90deg);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
`;

const DonutSegment = styled.circle<{ $active: boolean }>`
  cursor: pointer;
  transition: all 0.3s ease;
  transform-origin: center;

  &:hover {
    opacity: 0.8;
    filter: brightness(1.1);
  }

  ${props =>
    props.$active &&
    `
    filter: brightness(1.15);
  `}
`;

const CenterLabel = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
`;

const CenterValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.text.primary};
  line-height: 1;
`;

const CenterText = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.text.secondary};
  margin-top: 0.25rem;
`;

const Legend = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
`;

const LegendItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => (props.$active ? props.theme.colors.neutral[50] : 'transparent')};

  &:hover {
    background: ${props => props.theme.colors.neutral[50]};
  }
`;

const ColorDot = styled.div<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => props.$color};
  flex-shrink: 0;
`;

const LegendLabel = styled.div`
  flex: 1;
  min-width: 0;
`;

const LegendName = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LegendValue = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: ${props => props.theme.text.secondary};
  margin-top: 0.125rem;
`;

const Percentage = styled.span`
  font-weight: 600;
  color: ${props => props.theme.text.primary};
`;

const LoadingSkeleton = styled.div`
  width: 100%;
  height: 280px;
  background: ${props => props.theme.colors.neutral[100]};
  border-radius: 8px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      ${props => props.theme.colors.neutral[200]},
      transparent
    );
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

const StageDistributionChart: React.FC<StageDistributionChartProps> = ({
  data,
  loading = false,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <ChartContainer>
        <LoadingSkeleton />
      </ChartContainer>
    );
  }

  if (!data || data.length === 0) {
    return (
      <ChartContainer>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          No data available
        </div>
      </ChartContainer>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);
  const size = 280;
  const strokeWidth = 40;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = 0;
  const segments = data.map((item, index) => {
    const percentage = (item.count / total) * 100;
    const dashArray = (percentage / 100) * circumference;
    const dashOffset = -currentAngle;

    currentAngle += dashArray;

    return {
      ...item,
      percentage,
      dashArray,
      dashOffset,
      index,
    };
  });

  return (
    <ChartContainer>
      <DonutContainer>
        <SVGContainer width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map(segment => (
            <DonutSegment
              key={segment.stage}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segment.dashArray} ${circumference}`}
              strokeDashoffset={segment.dashOffset}
              onMouseEnter={() => setActiveIndex(segment.index)}
              onMouseLeave={() => setActiveIndex(null)}
              $active={activeIndex === segment.index}
            />
          ))}
        </SVGContainer>

        <CenterLabel>
          <CenterValue>{total}</CenterValue>
          <CenterText>Total Applications</CenterText>
        </CenterLabel>
      </DonutContainer>

      <Legend>
        {data.map((item, index) => (
          <LegendItem
            key={item.stage}
            $active={activeIndex === index}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <ColorDot $color={item.color} />
            <LegendLabel>
              <LegendName>{item.stage}</LegendName>
              <LegendValue>
                {item.count} apps
                <Percentage>({item.percentage.toFixed(1)}%)</Percentage>
              </LegendValue>
            </LegendLabel>
          </LegendItem>
        ))}
      </Legend>
    </ChartContainer>
  );
};

export default StageDistributionChart;

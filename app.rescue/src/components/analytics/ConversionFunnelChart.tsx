import React, { useState } from 'react';
import styled from 'styled-components';

interface FunnelStage {
  stage: string;
  conversionRate: number;
  applicationsCount: number;
}

interface ConversionFunnelChartProps {
  data: FunnelStage[];
  loading?: boolean;
}

const ChartContainer = styled.div`
  width: 100%;
  padding: 1rem 0;
`;

const FunnelStage = styled.div<{ $active: boolean }>`
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateX(4px);
  }
`;

const StageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const StageName = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme.text.primary};
`;

const StageStats = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
`;

const ConversionRate = styled.span<{ $rate: number }>`
  font-weight: 600;
  color: ${props => {
    if (props.$rate >= 80) return props.theme.colors.success[600];
    if (props.$rate >= 60) return props.theme.colors.warning[600];
    return props.theme.colors.error[600];
  }};
`;

const ApplicantCount = styled.span`
  color: ${props => props.theme.text.secondary};
`;

const BarContainer = styled.div`
  position: relative;
  height: 48px;
  background: ${props => props.theme.colors.neutral[100]};
  border-radius: 8px;
  overflow: hidden;
`;

const BarFill = styled.div<{ $width: number; $index: number; $active: boolean }>`
  height: 100%;
  background: linear-gradient(
    135deg,
    ${props => {
      const colors = [
        ['#3B82F6', '#1D4ED8'],
        ['#8B5CF6', '#6D28D9'],
        ['#10B981', '#059669'],
        ['#F59E0B', '#D97706'],
        ['#06B6D4', '#0891B2'],
        ['#EF4444', '#DC2626'],
      ];
      const [start, end] = colors[props.$index % colors.length];
      return `${start}, ${end}`;
    }}
  );
  border-radius: ${props => props.$width === 100 ? '8px' : '8px 0 0 8px'};
  width: ${props => props.$width}%;
  transition: all 0.5s ease;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  position: relative;
  box-shadow: ${props => props.$active ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none'};
  transform: ${props => props.$active ? 'scaleY(1.05)' : 'scaleY(1)'};

  &::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-left: 8px solid rgba(255, 255, 255, 0.3);
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
  }
`;

const BarLabel = styled.div`
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
`;

const DropOffIndicator = styled.div<{ $dropOff: number }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: ${props => props.theme.colors.error[600]};
  margin: 0.25rem 0 0.5rem 0;
  padding-left: 0.5rem;
`;

const DropOffIcon = styled.span`
  font-size: 1rem;
`;

const Summary = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${props => props.theme.colors.neutral[200]};
`;

const SummaryItem = styled.div`
  text-align: center;
`;

const SummaryLabel = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.text.secondary};
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const SummaryValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.text.primary};
`;

const LoadingSkeleton = styled.div`
  width: 100%;

  > div {
    height: 48px;
    background: ${props => props.theme.colors.neutral[100]};
    border-radius: 8px;
    margin-bottom: 0.75rem;
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

const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({ data, loading = false }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <LoadingSkeleton>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} />
        ))}
      </LoadingSkeleton>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
        No funnel data available
      </div>
    );
  }

  const totalApplications = data[0]?.applicationsCount || 0;
  const finalAdoptions = data[data.length - 1]?.applicationsCount || 0;
  const overallConversionRate = totalApplications > 0
    ? ((finalAdoptions / totalApplications) * 100).toFixed(1)
    : '0.0';

  return (
    <ChartContainer>
      {data.map((stage, index) => {
        const previousCount = index > 0 ? data[index - 1].applicationsCount : stage.applicationsCount;
        const dropOff = previousCount - stage.applicationsCount;
        const dropOffPercentage = previousCount > 0 ? ((dropOff / previousCount) * 100).toFixed(1) : '0.0';

        return (
          <FunnelStage
            key={stage.stage}
            $active={activeIndex === index}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <StageHeader>
              <StageName>{stage.stage}</StageName>
              <StageStats>
                <ConversionRate $rate={stage.conversionRate}>
                  {stage.conversionRate.toFixed(1)}%
                </ConversionRate>
                <ApplicantCount>{stage.applicationsCount} applications</ApplicantCount>
              </StageStats>
            </StageHeader>

            <BarContainer>
              <BarFill
                $width={stage.conversionRate}
                $index={index}
                $active={activeIndex === index}
              >
                <BarLabel>{stage.applicationsCount}</BarLabel>
              </BarFill>
            </BarContainer>

            {index > 0 && dropOff > 0 && (
              <DropOffIndicator $dropOff={parseFloat(dropOffPercentage)}>
                <DropOffIcon>↓</DropOffIcon>
                <span>
                  {dropOff} dropped ({dropOffPercentage}% loss)
                </span>
              </DropOffIndicator>
            )}
          </FunnelStage>
        );
      })}

      <Summary>
        <SummaryItem>
          <SummaryLabel>Total Applications</SummaryLabel>
          <SummaryValue>{totalApplications}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>Final Adoptions</SummaryLabel>
          <SummaryValue>{finalAdoptions}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>Overall Conversion</SummaryLabel>
          <SummaryValue>{overallConversionRate}%</SummaryValue>
        </SummaryItem>
      </Summary>
    </ChartContainer>
  );
};

export default ConversionFunnelChart;

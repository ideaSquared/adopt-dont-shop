import React, { useState } from 'react';
import styled from 'styled-components';

interface ResponseTimeData {
  stage: string;
  averageHours: number;
  slaTarget: number;
}

interface ResponseTimeChartProps {
  data: ResponseTimeData[];
  loading?: boolean;
}

const ChartContainer = styled.div`
  width: 100%;
  padding: 1rem 0;
`;

const BarGroup = styled.div<{ $active: boolean }>`
  margin-bottom: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateX(4px);
  }
`;

const StageLabel = styled.div`
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

const TimeValue = styled.div<{ $isCompliant: boolean }>`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props =>
    props.$isCompliant ? props.theme.colors.success[600] : props.theme.colors.error[600]};
`;

const BarsContainer = styled.div`
  position: relative;
  height: 40px;
`;

const Bar = styled.div<{
  $width: number;
  $isCompliant: boolean;
  $active: boolean;
  $zIndex: number;
}>`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 8px;
  transition: all 0.3s ease;
  z-index: ${props => props.$zIndex};
  transform: ${props => (props.$active ? 'scaleY(1.1)' : 'scaleY(1)')};
  box-shadow: ${props => (props.$active ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none')};
`;

const TargetBar = styled(Bar)`
  background: ${props => props.theme.colors.neutral[200]};
  opacity: 0.6;
`;

const ActualBar = styled(Bar)<{ $isCompliant: boolean }>`
  background: ${props =>
    props.$isCompliant
      ? `linear-gradient(135deg, ${props.theme.colors.success[500]}, ${props.theme.colors.success[600]})`
      : `linear-gradient(135deg, ${props.theme.colors.error[500]}, ${props.theme.colors.error[600]})`};
  display: flex;
  align-items: center;
  padding: 0 0.75rem;
`;

const BarLabel = styled.div`
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
`;

const ComplianceIndicator = styled.div<{ $isCompliant: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: ${props =>
    props.$isCompliant ? props.theme.colors.success[600] : props.theme.colors.error[600]};
  margin-top: 0.375rem;
`;

const ComplianceIcon = styled.span`
  font-size: 1rem;
`;

const Legend = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${props => props.theme.colors.neutral[200]};
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${props => props.theme.text.secondary};
`;

const LegendColor = styled.div<{ $color: string }>`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: ${props => props.$color};
`;

const LoadingSkeleton = styled.div`
  width: 100%;

  > div {
    height: 40px;
    background: ${props => props.theme.colors.neutral[100]};
    border-radius: 8px;
    margin-bottom: 1.5rem;
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

const ResponseTimeChart: React.FC<ResponseTimeChartProps> = ({ data, loading = false }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <LoadingSkeleton>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} />
        ))}
      </LoadingSkeleton>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
        No response time data available
      </div>
    );
  }

  // Calculate max value for scaling
  const maxValue = Math.max(...data.map(d => Math.max(d.averageHours, d.slaTarget)));

  return (
    <ChartContainer>
      {data.map((item, index) => {
        const isCompliant = item.averageHours <= item.slaTarget;
        const targetWidth = (item.slaTarget / maxValue) * 100;
        const actualWidth = (item.averageHours / maxValue) * 100;

        return (
          <BarGroup
            key={item.stage}
            $active={activeIndex === index}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <StageLabel>
              <StageName>{item.stage}</StageName>
              <TimeValue $isCompliant={isCompliant}>
                {item.averageHours.toFixed(1)}h / {item.slaTarget}h
              </TimeValue>
            </StageLabel>

            <BarsContainer>
              <TargetBar $width={targetWidth} $isCompliant={true} $active={false} $zIndex={1} />
              <ActualBar
                $width={actualWidth}
                $isCompliant={isCompliant}
                $active={activeIndex === index}
                $zIndex={2}
              >
                <BarLabel>{item.averageHours.toFixed(1)}h</BarLabel>
              </ActualBar>
            </BarsContainer>

            <ComplianceIndicator $isCompliant={isCompliant}>
              <ComplianceIcon>{isCompliant ? '✓' : '⚠'}</ComplianceIcon>
              <span>
                {isCompliant
                  ? `${(item.slaTarget - item.averageHours).toFixed(1)}h under SLA`
                  : `${(item.averageHours - item.slaTarget).toFixed(1)}h over SLA`}
              </span>
            </ComplianceIndicator>
          </BarGroup>
        );
      })}

      <Legend>
        <LegendItem>
          <LegendColor $color="#10B981" />
          <span>Actual Response Time (Compliant)</span>
        </LegendItem>
        <LegendItem>
          <LegendColor $color="#EF4444" />
          <span>Actual Response Time (Over SLA)</span>
        </LegendItem>
        <LegendItem>
          <LegendColor $color="#D1D5DB" />
          <span>SLA Target</span>
        </LegendItem>
      </Legend>
    </ChartContainer>
  );
};

export default ResponseTimeChart;

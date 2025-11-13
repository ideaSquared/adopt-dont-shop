import React, { useState } from 'react';
import styled from 'styled-components';

interface DataPoint {
  date: string;
  count: number;
}

interface AdoptionTrendsChartProps {
  data: DataPoint[];
  loading?: boolean;
  height?: number;
}

const ChartContainer = styled.div`
  width: 100%;
  padding: 1rem 0;
`;

const SVGContainer = styled.svg`
  width: 100%;
  overflow: visible;
`;

const GridLine = styled.line`
  stroke: ${props => props.theme.colors.neutral[200]};
  stroke-width: 1;
  stroke-dasharray: 4 4;
`;

const GridLabel = styled.text`
  fill: ${props => props.theme.text.tertiary};
  font-size: 0.75rem;
  font-family: inherit;
`;

const AxisLabel = styled.text`
  fill: ${props => props.theme.text.secondary};
  font-size: 0.75rem;
  font-family: inherit;
`;

const LinePath = styled.path`
  fill: none;
  stroke: ${props => props.theme.colors.primary[500]};
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3));
`;

const AreaPath = styled.path`
  fill: url(#areaGradient);
  opacity: 0.2;
`;

const DataPoint = styled.circle<{ $active: boolean }>`
  cursor: pointer;
  transition: all 0.2s ease;
  fill: white;
  stroke: ${props => props.theme.colors.primary[500]};
  stroke-width: ${props => (props.$active ? '3' : '2')};
  r: ${props => (props.$active ? '6' : '4')};

  &:hover {
    r: 6;
    stroke-width: 3;
  }
`;

const TooltipContainer = styled.div<{ $x: number; $y: number }>`
  position: absolute;
  left: ${props => props.$x}px;
  top: ${props => props.$y}px;
  transform: translate(-50%, -100%);
  background: ${props => props.theme.colors.neutral[900]};
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid ${props => props.theme.colors.neutral[900]};
  }
`;

const TooltipDate = styled.div`
  font-weight: 600;
  margin-bottom: 0.125rem;
`;

const TooltipValue = styled.div`
  color: ${props => props.theme.colors.primary[300]};
  font-weight: 500;
`;

const LoadingSkeleton = styled.div<{ $height: number }>`
  width: 100%;
  height: ${props => props.$height}px;
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

const AdoptionTrendsChart: React.FC<AdoptionTrendsChartProps> = ({
  data,
  loading = false,
  height = 300,
}) => {
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  if (loading) {
    return <LoadingSkeleton $height={height} />;
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
        No trend data available
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = 800; // Base width, will scale with viewBox
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.count));
  const minValue = 0;
  const yRange = maxValue - minValue;
  const yTicks = 5;
  const yStep = Math.ceil(yRange / yTicks);

  // Calculate scales
  const xScale = (index: number) => padding.left + (index / (data.length - 1)) * innerWidth;
  const yScale = (value: number) =>
    padding.top + innerHeight - ((value - minValue) / yRange) * innerHeight;

  // Generate line path
  const linePath = data
    .map((point, index) => {
      const x = xScale(index);
      const y = yScale(point.count);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Generate area path
  const areaPath = `
    ${linePath}
    L ${xScale(data.length - 1)} ${padding.top + innerHeight}
    L ${padding.left} ${padding.top + innerHeight}
    Z
  `;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handlePointHover = (index: number, event: React.MouseEvent) => {
    setActivePoint(index);
    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    const containerRect = (event.currentTarget as SVGElement)
      .closest('svg')
      ?.getBoundingClientRect();

    if (containerRect) {
      setTooltipPosition({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top,
      });
    }
  };

  return (
    <ChartContainer>
      <div style={{ position: 'relative' }}>
        <SVGContainer height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const value = minValue + i * yStep;
            const y = yScale(value);
            return (
              <g key={i}>
                <GridLine x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} />
                <GridLabel x={padding.left - 10} y={y + 4} textAnchor="end">
                  {value}
                </GridLabel>
              </g>
            );
          })}

          {/* Area */}
          <AreaPath d={areaPath} />

          {/* Line */}
          <LinePath d={linePath} />

          {/* Data points */}
          {data.map((point, index) => (
            <DataPoint
              key={index}
              cx={xScale(index)}
              cy={yScale(point.count)}
              $active={activePoint === index}
              onMouseEnter={e => handlePointHover(index, e)}
              onMouseLeave={() => {
                setActivePoint(null);
                setTooltipPosition(null);
              }}
            />
          ))}

          {/* X-axis labels */}
          {data.map((point, index) => {
            // Show fewer labels on x-axis for readability
            const showLabel = data.length <= 7 || index % Math.ceil(data.length / 7) === 0;
            if (!showLabel) {
              return null;
            }

            return (
              <AxisLabel
                key={index}
                x={xScale(index)}
                y={chartHeight - padding.bottom + 25}
                textAnchor="middle"
              >
                {formatDate(point.date)}
              </AxisLabel>
            );
          })}
        </SVGContainer>

        {/* Tooltip */}
        {activePoint !== null && tooltipPosition && (
          <TooltipContainer $x={tooltipPosition.x} $y={tooltipPosition.y}>
            <TooltipDate>{formatDate(data[activePoint].date)}</TooltipDate>
            <TooltipValue>{data[activePoint].count} adoptions</TooltipValue>
          </TooltipContainer>
        )}
      </div>
    </ChartContainer>
  );
};

export default AdoptionTrendsChart;

import React, { useState } from 'react';
import * as styles from './AdoptionTrendsChart.css';

interface DataPoint {
  date: string;
  count: number;
}

interface AdoptionTrendsChartProps {
  data: DataPoint[];
  loading?: boolean;
  height?: number;
}

const AdoptionTrendsChart: React.FC<AdoptionTrendsChartProps> = ({
  data,
  loading = false,
  height = 300,
}) => {
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  if (loading) {
    return <div className={styles.loadingSkeleton} style={{ height: `${height}px` }} />;
  }

  if (!data || data.length === 0) {
    return <div className={styles.emptyState}>No trend data available</div>;
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
    <div className={styles.chartContainer}>
      <div className={styles.chartWrapper}>
        <svg
          className={styles.svgContainer}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
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
                <line
                  className={styles.gridLine}
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                />
                <text className={styles.gridLabel} x={padding.left - 10} y={y + 4} textAnchor="end">
                  {value}
                </text>
              </g>
            );
          })}

          {/* Area */}
          <path className={styles.areaPath} d={areaPath} />

          {/* Line */}
          <path className={styles.linePath} d={linePath} />

          {/* Data points */}
          {data.map((point, index) => (
            <circle
              key={point.date}
              className={styles.dataPoint({ active: activePoint === index })}
              cx={xScale(index)}
              cy={yScale(point.count)}
              r={activePoint === index ? 6 : 4}
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
              <text
                key={`label-${point.date}`}
                className={styles.axisLabel}
                x={xScale(index)}
                y={chartHeight - padding.bottom + 25}
                textAnchor="middle"
              >
                {formatDate(point.date)}
              </text>
            );
          })}
        </svg>

        {/* Tooltip */}
        {activePoint !== null && tooltipPosition && (
          <div
            className={styles.tooltipContainer}
            style={{ left: tooltipPosition.x, top: tooltipPosition.y }}
          >
            <div className={styles.tooltipDate}>{formatDate(data[activePoint].date)}</div>
            <div className={styles.tooltipValue}>{data[activePoint].count} adoptions</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdoptionTrendsChart;

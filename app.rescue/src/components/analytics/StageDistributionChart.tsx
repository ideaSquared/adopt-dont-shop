import React, { useState } from 'react';
import clsx from 'clsx';
import { StageDistribution } from '../../services/analyticsService';
import * as styles from './StageDistributionChart.css';

interface StageDistributionChartProps {
  data: StageDistribution[];
  loading?: boolean;
}

const StageDistributionChart: React.FC<StageDistributionChartProps> = ({
  data,
  loading = false,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.loadingSkeleton} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.chartContainer}>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          No data available
        </div>
      </div>
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
    <div className={styles.chartContainer}>
      <div className={styles.donutContainer}>
        <svg
          className={styles.svgContainer}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {segments.map(segment => (
            <circle
              key={segment.stage}
              className={clsx(
                styles.donutSegment,
                activeIndex === segment.index && styles.donutSegmentActive
              )}
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
            />
          ))}
        </svg>

        <div className={styles.centerLabel}>
          <div className={styles.centerValue}>{total}</div>
          <div className={styles.centerText}>Total Applications</div>
        </div>
      </div>

      <div className={styles.legend}>
        {data.map((item, index) => (
          <div
            key={item.stage}
            className={styles.legendItem({ active: activeIndex === index })}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className={styles.colorDot} style={{ backgroundColor: item.color }} />
            <div className={styles.legendLabel}>
              <div className={styles.legendName}>{item.stage}</div>
              <div className={styles.legendValue}>
                {item.count} apps
                <span className={styles.percentage}>({item.percentage.toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StageDistributionChart;

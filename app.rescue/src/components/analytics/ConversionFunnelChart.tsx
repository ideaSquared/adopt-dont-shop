import React, { useState } from 'react';
import * as styles from './ConversionFunnelChart.css';

interface FunnelStage {
  stage: string;
  conversionRate: number;
  applicationsCount: number;
}

interface ConversionFunnelChartProps {
  data: FunnelStage[];
  loading?: boolean;
}

const BAR_COLORS = [
  ['#3B82F6', '#1D4ED8'],
  ['#8B5CF6', '#6D28D9'],
  ['#10B981', '#059669'],
  ['#F59E0B', '#D97706'],
  ['#06B6D4', '#0891B2'],
  ['#EF4444', '#DC2626'],
];

const getConversionRateColor = (rate: number): string => {
  if (rate >= 80) return '#059669';
  if (rate >= 60) return '#D97706';
  return '#DC2626';
};

const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({ data, loading = false }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.loadingSkeletonRow} />
        ))}
      </div>
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
  const overallConversionRate =
    totalApplications > 0 ? ((finalAdoptions / totalApplications) * 100).toFixed(1) : '0.0';

  return (
    <div className={styles.chartContainer}>
      {data.map((stage, index) => {
        const previousCount =
          index > 0 ? data[index - 1].applicationsCount : stage.applicationsCount;
        const dropOff = previousCount - stage.applicationsCount;
        const dropOffPercentage =
          previousCount > 0 ? ((dropOff / previousCount) * 100).toFixed(1) : '0.0';

        const isActive = activeIndex === index;
        const [colorStart, colorEnd] = BAR_COLORS[index % BAR_COLORS.length];
        const borderRadius = stage.conversionRate === 100 ? '8px' : '8px 0 0 8px';

        return (
          <div
            key={stage.stage}
            className={styles.funnelStage({ active: isActive })}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className={styles.stageHeader}>
              <div className={styles.stageName}>{stage.stage}</div>
              <div className={styles.stageStats}>
                <span
                  className={styles.conversionRate}
                  style={{ color: getConversionRateColor(stage.conversionRate) }}
                >
                  {stage.conversionRate.toFixed(1)}%
                </span>
                <span className={styles.applicantCount}>{stage.applicationsCount} applications</span>
              </div>
            </div>

            <div className={styles.barContainer}>
              <div
                className={styles.barFill}
                style={{
                  width: `${stage.conversionRate}%`,
                  background: `linear-gradient(135deg, ${colorStart}, ${colorEnd})`,
                  borderRadius,
                  boxShadow: isActive ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
                  transform: isActive ? 'scaleY(1.05)' : 'scaleY(1)',
                }}
              >
                <div className={styles.barLabel}>{stage.applicationsCount}</div>
              </div>
            </div>

            {index > 0 && dropOff > 0 && (
              <div className={styles.dropOffIndicator}>
                <span className={styles.dropOffIcon}>↓</span>
                <span>
                  {dropOff} dropped ({dropOffPercentage}% loss)
                </span>
              </div>
            )}
          </div>
        );
      })}

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>Total Applications</div>
          <div className={styles.summaryValue}>{totalApplications}</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>Final Adoptions</div>
          <div className={styles.summaryValue}>{finalAdoptions}</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryLabel}>Overall Conversion</div>
          <div className={styles.summaryValue}>{overallConversionRate}%</div>
        </div>
      </div>
    </div>
  );
};

export default ConversionFunnelChart;

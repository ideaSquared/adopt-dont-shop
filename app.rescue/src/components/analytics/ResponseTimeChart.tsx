import React, { useState } from 'react';
import * as styles from './ResponseTimeChart.css';

interface ResponseTimeData {
  stage: string;
  averageHours: number;
  slaTarget: number;
}

interface ResponseTimeChartProps {
  data: ResponseTimeData[];
  loading?: boolean;
}

const ResponseTimeChart: React.FC<ResponseTimeChartProps> = ({ data, loading = false }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.loadingSkeletonRow} />
        ))}
      </div>
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
    <div className={styles.chartContainer}>
      {data.map((item, index) => {
        const isCompliant = item.averageHours <= item.slaTarget;
        const targetWidth = (item.slaTarget / maxValue) * 100;
        const actualWidth = (item.averageHours / maxValue) * 100;

        return (
          <div
            key={item.stage}
            className={styles.barGroup({ active: activeIndex === index })}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className={styles.stageLabel}>
              <div className={styles.stageName}>{item.stage}</div>
              <div className={styles.timeValue({ compliant: isCompliant })}>
                {item.averageHours.toFixed(1)}h / {item.slaTarget}h
              </div>
            </div>

            <div className={styles.barsContainer}>
              <div className={styles.targetBar} style={{ width: `${targetWidth}%` }} />
              <div
                className={styles.actualBar({
                  compliant: isCompliant,
                  active: activeIndex === index,
                })}
                style={{ width: `${actualWidth}%` }}
              >
                <div className={styles.barLabel}>{item.averageHours.toFixed(1)}h</div>
              </div>
            </div>

            <div className={styles.complianceIndicator({ compliant: isCompliant })}>
              <span className={styles.complianceIcon}>{isCompliant ? '✓' : '⚠'}</span>
              <span>
                {isCompliant
                  ? `${(item.slaTarget - item.averageHours).toFixed(1)}h under SLA`
                  : `${(item.averageHours - item.slaTarget).toFixed(1)}h over SLA`}
              </span>
            </div>
          </div>
        );
      })}

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ background: '#10B981' }} />
          <span>Actual Response Time (Compliant)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ background: '#EF4444' }} />
          <span>Actual Response Time (Over SLA)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ background: '#D1D5DB' }} />
          <span>SLA Target</span>
        </div>
      </div>
    </div>
  );
};

export default ResponseTimeChart;

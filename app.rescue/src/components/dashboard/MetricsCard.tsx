import React from 'react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, icon, trend }) => {
  return (
    <div className="metrics-card">
      <div className="metrics-header">
        <span className="metrics-icon">{icon}</span>
        <span className="metrics-title">{title}</span>
      </div>

      <div className="metrics-value">{value}</div>

      {trend && (
        <div className={`metrics-trend ${trend.isPositive ? 'positive' : 'negative'}`}>
          <span className="trend-indicator">{trend.isPositive ? '↑' : '↓'}</span>
          <span className="trend-value">{trend.value}% from last month</span>
        </div>
      )}
    </div>
  );
};

export default MetricsCard;

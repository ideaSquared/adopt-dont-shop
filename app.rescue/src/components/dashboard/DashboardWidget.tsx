import React from 'react';

interface DashboardWidgetProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`dashboard-widget ${className}`}>
      <div className="widget-header">
        <h3 className="widget-title">{title}</h3>
      </div>
      <div className="widget-content">{children}</div>
    </div>
  );
};

export default DashboardWidget;

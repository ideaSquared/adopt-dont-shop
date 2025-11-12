import React from 'react';

interface AdoptionData {
  month: string;
  adoptions: number;
}

interface AdoptionChartProps {
  data: AdoptionData[];
}

const AdoptionChart: React.FC<AdoptionChartProps> = ({ data }) => {
  const maxAdoptions = Math.max(...data.map(d => d.adoptions));

  return (
    <div className="adoption-chart">
      <div className="chart-container">
        {data.map((item, index) => (
          <div key={index} className="chart-bar">
            <div
              className="bar"
              style={{
                height: `${(item.adoptions / maxAdoptions) * 100}%`,
              }}
              title={`${item.month}: ${item.adoptions} adoptions`}
            />
            <span className="bar-label">{item.month}</span>
            <span className="bar-value">{item.adoptions}</span>
          </div>
        ))}
      </div>

      <div className="chart-summary">
        <p>
          <strong>Total Adoptions: </strong>
          {data.reduce((sum, item) => sum + item.adoptions, 0)}
        </p>
        <p>
          <strong>Best Month: </strong>
          {
            data.reduce((best, current) => (current.adoptions > best.adoptions ? current : best))
              .month
          }
        </p>
      </div>
    </div>
  );
};

export default AdoptionChart;

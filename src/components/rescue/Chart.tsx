import React from 'react';

interface ChartProps {
  title: string;
}

const Chart: React.FC<ChartProps> = ({ title }) => {
  return (
    <div className="bg-white p-4 shadow rounded h-64">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p>Chart placeholder</p>
      {/* Placeholder for chart */}
      <div className="h-full bg-gray-200"></div>
    </div>
  );
};

export default Chart;

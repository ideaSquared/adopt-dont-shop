import React from 'react';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartFrame, type ChartFrameProps } from './ChartFrame';
import { PALETTE, type ChartDatum, type ChartSeries } from './types';

export type BarChartProps = Omit<ChartFrameProps, 'children' | 'isEmpty'> & {
  data: ChartDatum[];
  xKey: string;
  series: ChartSeries[];
  stacked?: boolean;
  showLegend?: boolean;
};

export const BarChart: React.FC<BarChartProps> = ({
  data,
  xKey,
  series,
  stacked,
  showLegend,
  ...frame
}) => (
  <ChartFrame {...frame} isEmpty={data.length === 0}>
    <ResponsiveContainer width='100%' height='100%'>
      <RechartsBarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
        <XAxis dataKey={xKey} stroke='#6b7280' fontSize={12} />
        <YAxis stroke='#6b7280' fontSize={12} />
        <Tooltip />
        {showLegend ? <Legend /> : null}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color ?? PALETTE[i % PALETTE.length]}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  </ChartFrame>
);

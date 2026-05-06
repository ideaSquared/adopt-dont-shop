import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartFrame, type ChartFrameProps } from './ChartFrame';
import { PALETTE, type ChartDatum, type ChartSeries } from './types';

export type LineChartProps = Omit<ChartFrameProps, 'children' | 'isEmpty'> & {
  data: ChartDatum[];
  xKey: string;
  series: ChartSeries[];
  showLegend?: boolean;
};

export const LineChart: React.FC<LineChartProps> = ({
  data,
  xKey,
  series,
  showLegend,
  ...frame
}) => (
  <ChartFrame {...frame} isEmpty={data.length === 0}>
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey={xKey} stroke="#6b7280" fontSize={12} />
        <YAxis stroke="#6b7280" fontSize={12} />
        <Tooltip />
        {showLegend ? <Legend /> : null}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  </ChartFrame>
);

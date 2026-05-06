import React from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ChartFrame, type ChartFrameProps } from './ChartFrame';
import { PALETTE, type ChartDatum } from './types';

export type PieChartProps = Omit<ChartFrameProps, 'children' | 'isEmpty'> & {
  data: ChartDatum[];
  labelKey: string;
  valueKey: string;
  donut?: boolean;
};

export const PieChart: React.FC<PieChartProps> = ({
  data,
  labelKey,
  valueKey,
  donut,
  ...frame
}) => (
  <ChartFrame {...frame} isEmpty={data.length === 0}>
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={labelKey}
          innerRadius={donut ? '40%' : 0}
          outerRadius="80%"
          paddingAngle={1}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  </ChartFrame>
);

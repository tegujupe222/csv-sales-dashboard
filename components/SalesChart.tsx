import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface SalesChartProps {
  data: any[];
}

export const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="カフェ売上" stroke="#8884d8" activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="3Fパーティ売上" stroke="#82ca9d" />
        <Line type="monotone" dataKey="4Fパーティ売上" stroke="#ffc658" />
      </LineChart>
    </ResponsiveContainer>
  );
};

interface CategoryPieChartProps {
    data: { name: string; value: number }[];
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                    {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value.toLocaleString(), '売上']} />
            </PieChart>
        </ResponsiveContainer>
    );
}
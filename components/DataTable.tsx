import React from 'react';
import type { DailyEntry } from '../types';

interface DataTableProps {
  title: string;
  headers: string[];
  data: DailyEntry[];
}

export const DataTable: React.FC<DataTableProps> = ({ title, headers, data }) => {
  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <h3 className="text-lg lg:text-xl font-semibold text-gray-800 p-4 border-b">{title}</h3>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                    {headers.map((header) => (
                    <th key={header} scope="col" className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {header}
                    </th>
                    ))}
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.date}</td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.sales.toLocaleString()}</td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.guests.toLocaleString()}</td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.avgSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

import React from 'react';
import { LogoIcon, ChartBarIcon, TableCellsIcon } from './icons';

interface SidebarProps {
  isAdmin?: boolean;
  onAdminDashboard?: () => void;
}

export const Sidebar = ({ isAdmin, onAdminDashboard }: SidebarProps): React.ReactNode => {
  return (
    <div className="w-64 bg-dark-sidebar text-white flex flex-col">
      <div className="flex items-center justify-center h-20 shadow-md">
        <LogoIcon className="h-10 w-10 mr-3" />
        <h1 className="text-2xl font-bold">EVEN View</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-4">
        <a href="#" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors duration-200">
          <ChartBarIcon className="h-6 w-6 mr-3" />
          ダッシュボード
        </a>
        <a href="#" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors duration-200">
          <TableCellsIcon className="h-6 w-6 mr-3" />
          レポート
        </a>
        {isAdmin && onAdminDashboard && (
          <button
            onClick={onAdminDashboard}
            className="flex items-center px-4 py-2 w-full text-gray-300 hover:bg-yellow-600 hover:text-white rounded-md transition-colors duration-200 bg-yellow-500 mt-4 font-bold justify-center"
          >
            ユーザー管理
          </button>
        )}
      </nav>
      <div className="px-4 py-2 text-center text-xs text-gray-500">
        <p>バージョン 1.0.0</p>
        <p>&copy; 2024 Your Company</p>
      </div>
    </div>
  );
};
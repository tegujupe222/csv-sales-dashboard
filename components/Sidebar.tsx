import React from 'react';
import { 
  LogoIcon, 
  ChartBarIcon, 
  TableCellsIcon, 
  HomeIcon, 
  BuildingIcon, 
  DocumentIcon, 
  CogIcon, 
  CloudArrowUpIcon,
  UserGroupIcon 
} from './icons';

interface SidebarProps {
  isAdmin?: boolean;
  onAdminDashboard?: () => void;
  onClientManager?: () => void;
  onClose?: () => void;
  onNavigate?: (section: string) => void;
  activeSection?: string;
}

export const Sidebar = ({ isAdmin, onAdminDashboard, onClientManager, onClose, onNavigate, activeSection = 'dashboard' }: SidebarProps): React.ReactNode => {
  return (
    <div className="w-64 h-full bg-dark-sidebar text-white flex flex-col">
      <div className="flex items-center justify-between h-20 shadow-md px-4">
        <div className="flex items-center">
          <LogoIcon className="h-8 w-8 mr-3" />
          <h1 className="text-xl lg:text-2xl font-bold">EVEN View</h1>
        </div>
        {/* モバイル用閉じるボタン */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        <button
          onClick={() => onNavigate?.('dashboard')}
          className={`flex items-center w-full px-4 py-3 text-left rounded-md transition-colors duration-200 ${
            activeSection === 'dashboard' 
              ? 'bg-primary text-white' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <HomeIcon className="h-5 w-5 lg:h-6 lg:w-6 mr-3" />
          <span className="text-sm lg:text-base">ホーム</span>
        </button>

        <button
          onClick={() => onNavigate?.('stores')}
          className={`flex items-center w-full px-4 py-3 text-left rounded-md transition-colors duration-200 ${
            activeSection === 'stores' 
              ? 'bg-primary text-white' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <BuildingIcon className="h-5 w-5 lg:h-6 lg:w-6 mr-3" />
          <span className="text-sm lg:text-base">店舗管理</span>
        </button>

        <button
          onClick={() => onNavigate?.('upload')}
          className={`flex items-center w-full px-4 py-3 text-left rounded-md transition-colors duration-200 ${
            activeSection === 'upload' 
              ? 'bg-primary text-white' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <CloudArrowUpIcon className="h-5 w-5 lg:h-6 lg:w-6 mr-3" />
          <span className="text-sm lg:text-base">データアップロード</span>
        </button>

        <button
          onClick={() => onNavigate?.('reports')}
          className={`flex items-center w-full px-4 py-3 text-left rounded-md transition-colors duration-200 ${
            activeSection === 'reports' 
              ? 'bg-primary text-white' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <DocumentIcon className="h-5 w-5 lg:h-6 lg:w-6 mr-3" />
          <span className="text-sm lg:text-base">レポート</span>
        </button>

        <button
          onClick={() => onNavigate?.('analytics')}
          className={`flex items-center w-full px-4 py-3 text-left rounded-md transition-colors duration-200 ${
            activeSection === 'analytics' 
              ? 'bg-primary text-white' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <ChartBarIcon className="h-5 w-5 lg:h-6 lg:w-6 mr-3" />
          <span className="text-sm lg:text-base">分析</span>
        </button>

        <button
          onClick={() => onNavigate?.('settings')}
          className={`flex items-center w-full px-4 py-3 text-left rounded-md transition-colors duration-200 ${
            activeSection === 'settings' 
              ? 'bg-primary text-white' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <CogIcon className="h-5 w-5 lg:h-6 lg:w-6 mr-3" />
          <span className="text-sm lg:text-base">設定</span>
        </button>

        {isAdmin && onAdminDashboard && (
          <button
            onClick={onAdminDashboard}
            className="flex items-center w-full px-4 py-3 text-left text-gray-300 hover:bg-yellow-600 hover:text-white rounded-md transition-colors duration-200 bg-yellow-500 mt-4 font-bold text-sm lg:text-base"
          >
            <UserGroupIcon className="h-5 w-5 lg:h-6 lg:w-6 mr-3" />
            ユーザー管理
          </button>
        )}
        {isAdmin && onClientManager && (
          <button
            onClick={onClientManager}
            className="flex items-center w-full px-4 py-3 text-left text-gray-300 hover:bg-blue-600 hover:text-white rounded-md transition-colors duration-200 bg-blue-500 mt-2 font-bold text-sm lg:text-base"
          >
            <BuildingIcon className="h-5 w-5 lg:h-6 lg:w-6 mr-3" />
            クライアント管理
          </button>
        )}
      </nav>
      <div className="px-4 py-2 text-center text-xs text-gray-500">
        <p>バージョン 1.0.9</p>
        <p>&copy; IGA Factory</p>
      </div>
    </div>
  );
};
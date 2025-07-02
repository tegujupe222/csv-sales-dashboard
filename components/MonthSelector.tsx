import React, { useState } from 'react';
import type { MonthlyData } from '../services/storeManager';
import { TrashIcon, CalendarIcon } from './icons';

interface MonthSelectorProps {
  months: MonthlyData[];
  selectedMonths: string[];
  onMonthSelectionChange: (months: string[]) => void;
  onDeleteMonth: (month: string) => void;
  onClearAll: () => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  months,
  selectedMonths,
  onMonthSelectionChange,
  onDeleteMonth,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleMonthToggle = (month: string) => {
    const newSelection = selectedMonths.includes(month)
      ? selectedMonths.filter(m => m !== month)
      : [...selectedMonths, month];
    onMonthSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    onMonthSelectionChange(months.map(m => m.month));
  };

  const handleSelectNone = () => {
    onMonthSelectionChange([]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (months.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-center text-gray-500">
          <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>まだデータがありません</p>
          <p className="text-sm">CSVファイルをアップロードしてデータを追加してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-medium text-gray-900">月別データ管理</h3>
            <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
              {months.length}ヶ月
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              全選択
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={handleSelectNone}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              全解除
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              {isOpen ? '閉じる' : '詳細'}
            </button>
          </div>
        </div>
        
        {selectedMonths.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              選択中: <span className="font-medium">{selectedMonths.length}ヶ月</span>
              {selectedMonths.length === 1 && (
                <span className="ml-2 text-primary font-medium">{selectedMonths[0]}</span>
              )}
            </p>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {months.map((monthData) => (
            <div
              key={monthData.month}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                selectedMonths.includes(monthData.month)
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1">
                <input
                  type="checkbox"
                  checked={selectedMonths.includes(monthData.month)}
                  onChange={() => handleMonthToggle(monthData.month)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{monthData.month}</span>
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                      {monthData.totalFileCount}ファイル
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    最終更新: {formatDate(monthData.lastUpdated)}
                  </p>
                  {/* 店舗別アップロード履歴 */}
                  <div className="mt-1 space-y-1">
                    {monthData.stores.map((storeData) => (
                      <div key={storeData.store.id} className="text-xs text-gray-400">
                        <span className="font-medium">{storeData.store.name}:</span>
                        {storeData.uploadHistory && storeData.uploadHistory.length > 0 ? (
                          <span className="ml-1">
                            {storeData.uploadHistory.length}ファイル
                            {storeData.uploadHistory.length <= 3 ? (
                              <span className="ml-1">({storeData.uploadHistory.join(', ')})</span>
                            ) : (
                              <span className="ml-1">({storeData.uploadHistory.slice(0, 2).join(', ')}...)</span>
                            )}
                          </span>
                        ) : (
                          <span className="ml-1">ファイルなし</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => onDeleteMonth(monthData.month)}
                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                title={`${monthData.month}のデータを削除`}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          <div className="pt-3 border-t border-gray-200">
            <button
              onClick={onClearAll}
              className="w-full px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 hover:border-red-400 transition-colors"
            >
              全データを削除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 
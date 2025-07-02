import React from 'react';
import type { Store } from '../types';
import { BuildingIcon } from './icons';

interface StoreSelectorProps {
  stores: Store[];
  selectedStores: string[];
  onStoreSelectionChange: (storeIds: string[]) => void;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({
  stores,
  selectedStores,
  onStoreSelectionChange,
}) => {
  const handleStoreToggle = (storeId: string) => {
    const newSelection = selectedStores.includes(storeId)
      ? selectedStores.filter(id => id !== storeId)
      : [...selectedStores, storeId];
    onStoreSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    onStoreSelectionChange(stores.map(store => store.id));
  };

  const handleSelectNone = () => {
    onStoreSelectionChange([]);
  };

  if (stores.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-center text-gray-500">
          <BuildingIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>まだ店舗が登録されていません</p>
          <p className="text-sm">店舗管理から店舗を追加してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BuildingIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-medium text-gray-900">店舗選択</h3>
            <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
              {stores.length}店舗
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
          </div>
        </div>
        
        {selectedStores.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              選択中: <span className="font-medium">{selectedStores.length}店舗</span>
              {selectedStores.length === 1 && (
                <span className="ml-2 text-primary font-medium">
                  {stores.find(s => s.id === selectedStores[0])?.name}
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="space-y-3">
          {stores.map((store) => (
            <div
              key={store.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedStores.includes(store.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleStoreToggle(store.id)}
            >
              <input
                type="checkbox"
                checked={selectedStores.includes(store.id)}
                onChange={() => handleStoreToggle(store.id)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{store.name}</span>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                    {store.code}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 
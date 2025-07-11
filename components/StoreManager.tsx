import React, { useState } from 'react';
import type { Store } from '../types';
import { addStore, updateStore, deleteStore } from '../services/storeManager';
import { saveSharedStoreData } from '../services/sharedDataService';
import { TrashIcon, PlusIcon, PencilIcon } from './icons';

interface StoreManagerProps {
  stores: Store[];
  onStoresChange: (stores: Store[]) => void;
}

export const StoreManager: React.FC<StoreManagerProps> = ({ stores, onStoresChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });

  const handleAddStore = () => {
    setEditingStore(null);
    setFormData({ name: '', code: '' });
    setIsOpen(true);
  };

  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setFormData({ name: store.name, code: store.code });
    setIsOpen(true);
  };

  const handleDeleteStore = async (storeId: string) => {
    if (confirm('この店舗を削除しますか？関連するデータも削除されます。')) {
      const newStores = deleteStore(storeId);
      onStoresChange(newStores);
      await saveSharedStoreData(newStores);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.code.trim()) {
      alert('店舗名と店舗コードを入力してください。');
      return;
    }

    let newStores: Store[];
    if (editingStore) {
      // 店舗を更新
      newStores = updateStore(editingStore.id, {
        name: formData.name.trim(),
        code: formData.code.trim(),
      });
      onStoresChange(newStores);
    } else {
      // 新しい店舗を追加
      const newStore: Store = {
        id: Date.now().toString(),
        name: formData.name.trim(),
        code: formData.code.trim(),
      };
      newStores = addStore(newStore);
      onStoresChange(newStores);
    }
    await saveSharedStoreData(newStores);

    setIsOpen(false);
    setFormData({ name: '', code: '' });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-medium text-gray-900">店舗管理</h3>
          <button
            onClick={handleAddStore}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors w-full sm:w-auto"
          >
            <PlusIcon className="w-4 h-4" />
            店舗を追加
          </button>
        </div>
      </div>

      <div className="p-4">
        {stores.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>まだ店舗が登録されていません</p>
            <p className="text-sm">「店舗を追加」ボタンから店舗を登録してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stores.map((store) => (
              <div
                key={store.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors gap-3"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm lg:text-base">{store.name}</h4>
                  <p className="text-sm text-gray-500">コード: {store.code}</p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleEditStore(store)}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                    title="編集"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteStore(store.id)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                    title="削除"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* モーダル */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingStore ? '店舗を編集' : '店舗を追加'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  店舗名 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="例: 渋谷店"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  店舗コード *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="例: SHIBUYA"
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
                >
                  {editingStore ? '更新' : '追加'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}; 
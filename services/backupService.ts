import { MonthlyData, Store } from '../types';
import { loadStores, loadMonthlyData } from './storeManager';

// データのバックアップを作成
export function createBackup(): {
  stores: Store[];
  monthlyData: MonthlyData[];
  timestamp: string;
  version: string;
} {
  const stores = loadStores();
  const monthlyData = loadMonthlyData();
  
  return {
    stores,
    monthlyData,
    timestamp: new Date().toISOString(),
    version: '1.0'
  };
}

// バックアップデータをJSONファイルとしてダウンロード
export function downloadBackup(): void {
  const backup = createBackup();
  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `sales-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(link.href);
}

// バックアップファイルを読み込み
export function loadBackup(file: File): Promise<{
  stores: Store[];
  monthlyData: MonthlyData[];
  timestamp: string;
  version: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        
        // バックアップデータの検証
        if (!backup.stores || !backup.monthlyData || !backup.timestamp || !backup.version) {
          throw new Error('無効なバックアップファイルです');
        }
        
        resolve(backup);
      } catch (error) {
        reject(new Error('バックアップファイルの読み込みに失敗しました'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };
    
    reader.readAsText(file);
  });
}

// バックアップデータを復元
export function restoreBackup(backup: {
  stores: Store[];
  monthlyData: MonthlyData[];
  timestamp: string;
  version: string;
}): void {
  // ローカルストレージに保存
  localStorage.setItem('stores', JSON.stringify(backup.stores));
  localStorage.setItem('monthlyData', JSON.stringify(backup.monthlyData));
  
  console.log('バックアップデータを復元しました');
}

// 現在のデータとバックアップデータを比較
export function compareBackup(backup: {
  stores: Store[];
  monthlyData: MonthlyData[];
  timestamp: string;
  version: string;
}): {
  storesChanged: boolean;
  monthlyDataChanged: boolean;
  backupDate: string;
  currentDate: string;
} {
  const currentStores = loadStores();
  const currentMonthlyData = loadMonthlyData();
  
  const storesChanged = JSON.stringify(currentStores) !== JSON.stringify(backup.stores);
  const monthlyDataChanged = JSON.stringify(currentMonthlyData) !== JSON.stringify(backup.monthlyData);
  
  return {
    storesChanged,
    monthlyDataChanged,
    backupDate: backup.timestamp,
    currentDate: new Date().toISOString()
  };
} 
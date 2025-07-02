import type { Store, StoreData, MonthlyData, WaldData } from '../types';

const STORES_STORAGE_KEY = 'wald_stores';
const MONTHLY_DATA_STORAGE_KEY = 'wald_monthly_data';

// 店舗データをローカルストレージから読み込み
export const loadStores = (): Store[] => {
  try {
    const stored = localStorage.getItem(STORES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('店舗データの読み込みに失敗しました:', error);
  }
  return [];
};

// 店舗データをローカルストレージに保存
export const saveStores = (stores: Store[]): void => {
  try {
    localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(stores));
  } catch (error) {
    console.error('店舗データの保存に失敗しました:', error);
  }
};

// 店舗を追加
export const addStore = (store: Store): Store[] => {
  const stores = loadStores();
  const newStores = [...stores, store];
  saveStores(newStores);
  return newStores;
};

// 店舗を更新
export const updateStore = (storeId: string, updatedStore: Partial<Store>): Store[] => {
  const stores = loadStores();
  const newStores = stores.map(store => 
    store.id === storeId ? { ...store, ...updatedStore } : store
  );
  saveStores(newStores);
  return newStores;
};

// 店舗を削除
export const deleteStore = (storeId: string): Store[] => {
  const stores = loadStores();
  const newStores = stores.filter(store => store.id !== storeId);
  saveStores(newStores);
  return newStores;
};

// 店舗IDから店舗名を取得
export const getStoreName = (storeId: string): string => {
  const stores = loadStores();
  const store = stores.find(s => s.id === storeId);
  return store?.name || '不明な店舗';
};

// 月次データをローカルストレージから読み込み
export const loadMonthlyData = (): MonthlyData[] => {
  try {
    const stored = localStorage.getItem(MONTHLY_DATA_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('月次データの読み込みに失敗しました:', error);
  }
  return [];
};

// 月次データをローカルストレージに保存
export const saveMonthlyData = (data: MonthlyData[]): void => {
  try {
    localStorage.setItem(MONTHLY_DATA_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('月次データの保存に失敗しました:', error);
  }
};

// 店舗データを追加または更新
export const addOrUpdateStoreData = (
  month: string, 
  storeId: string, 
  newData: Partial<WaldData>
): MonthlyData[] => {
  const monthlyData = loadMonthlyData();
  const stores = loadStores();
  const store = stores.find(s => s.id === storeId);
  
  if (!store) {
    throw new Error('店舗が見つかりません');
  }

  // 既存の月データを探す
  const existingMonthIndex = monthlyData.findIndex(m => m.month === month);
  
  if (existingMonthIndex >= 0) {
    // 既存の月データ内で店舗データを探す
    const existingStoreIndex = monthlyData[existingMonthIndex].stores.findIndex(
      s => s.store.id === storeId
    );
    
    if (existingStoreIndex >= 0) {
      // 既存の店舗データを更新
      const existingData = monthlyData[existingMonthIndex].stores[existingStoreIndex].data;
      const updatedData = mergeWaldData(existingData, newData);
      
      monthlyData[existingMonthIndex].stores[existingStoreIndex] = {
        store,
        data: updatedData,
        lastUpdated: new Date().toISOString(),
        fileCount: monthlyData[existingMonthIndex].stores[existingStoreIndex].fileCount + 1,
      };
    } else {
      // 新しい店舗データを追加
      monthlyData[existingMonthIndex].stores.push({
        store,
        data: newData,
        lastUpdated: new Date().toISOString(),
        fileCount: 1,
      });
    }
    
    monthlyData[existingMonthIndex].lastUpdated = new Date().toISOString();
    monthlyData[existingMonthIndex].totalFileCount += 1;
  } else {
    // 新しい月データを作成
    monthlyData.push({
      month,
      stores: [{
        store,
        data: newData,
        lastUpdated: new Date().toISOString(),
        fileCount: 1,
      }],
      lastUpdated: new Date().toISOString(),
      totalFileCount: 1,
    });
  }
  
  // 月順にソート
  monthlyData.sort((a, b) => {
    const aYear = parseInt(a.month.match(/(\d{4})年/)?.[1] || '0');
    const aMonth = parseInt(a.month.match(/(\d{1,2})月/)?.[1] || '0');
    const bYear = parseInt(b.month.match(/(\d{4})年/)?.[1] || '0');
    const bMonth = parseInt(b.month.match(/(\d{1,2})月/)?.[1] || '0');
    
    if (aYear !== bYear) return aYear - bYear;
    return aMonth - bMonth;
  });
  
  saveMonthlyData(monthlyData);
  return monthlyData;
};

// WaldDataを統合
const mergeWaldData = (existing: Partial<WaldData>, incoming: Partial<WaldData>): Partial<WaldData> => {
  const merged: Partial<WaldData> = { ...existing };
  
  if (incoming.cafe) {
    merged.cafe = mergeSalesCategoryData(existing.cafe, incoming.cafe);
  }
  if (incoming.party3F) {
    merged.party3F = mergeSalesCategoryData(existing.party3F, incoming.party3F);
  }
  if (incoming.party4F) {
    merged.party4F = mergeSalesCategoryData(existing.party4F, incoming.party4F);
  }
  if (incoming.productSales) {
    merged.productSales = mergeProductSales(existing.productSales, incoming.productSales);
  }
  
  return merged;
};

// SalesCategoryDataを統合
const mergeSalesCategoryData = (existing: any, incoming: any) => {
  if (!existing) return incoming;
  
  const dailyMap = new Map();
  existing.daily?.forEach((d: any) => dailyMap.set(d.date, d));
  incoming.daily?.forEach((d: any) => dailyMap.set(d.date, d));
  const newDaily = Array.from(dailyMap.values()).sort((a: any, b: any) => parseInt(a.date) - parseInt(b.date));
  
  const newTotalSales = newDaily.reduce((sum: number, item: any) => sum + item.sales, 0);
  const newTotalGuests = newDaily.reduce((sum: number, item: any) => sum + item.guests, 0);
  
  return {
    daily: newDaily,
    totalSales: newTotalSales,
    totalGuests: newTotalGuests,
    avgSpend: newTotalGuests > 0 ? newTotalSales / newTotalGuests : 0,
  };
};

// ProductSalesを統合
const mergeProductSales = (existing: any, incoming: any) => {
  if (!existing) return incoming;
  
  return {
    sandwiches: {
      sales8: existing.sandwiches.sales8 + incoming.sandwiches.sales8,
      sales10: existing.sandwiches.sales10 + incoming.sandwiches.sales10,
      tax8: existing.sandwiches.tax8 + incoming.sandwiches.tax8,
      tax10: existing.sandwiches.tax10 + incoming.sandwiches.tax10,
    },
    drinks: {
      sales8: existing.drinks.sales8 + incoming.drinks.sales8,
      sales10: existing.drinks.sales10 + incoming.drinks.sales10,
      tax8: existing.drinks.tax8 + incoming.drinks.tax8,
      tax10: existing.drinks.tax10 + incoming.drinks.tax10,
    },
    other: {
      sales8: existing.other.sales8 + incoming.other.sales8,
      sales10: existing.other.sales10 + incoming.other.sales10,
      tax8: existing.other.tax8 + incoming.other.tax8,
      tax10: existing.other.tax10 + incoming.other.tax10,
    },
  };
};

// 複数店舗のデータを統合してサマリーを作成
export const createSummaryData = (selectedMonths: string[], selectedStores: string[]): Partial<WaldData> => {
  const monthlyData = loadMonthlyData();
  const selectedData = monthlyData.filter(m => selectedMonths.includes(m.month));
  
  if (selectedData.length === 0) return {};
  
  const summaryData: Partial<WaldData> = {
    month: selectedMonths.length === 1 ? selectedMonths[0] : `${selectedMonths[0]} - ${selectedMonths[selectedMonths.length - 1]}`,
  };
  
  // 各カテゴリのデータを統合
  const cafeData: any[] = [];
  const party3FData: any[] = [];
  const party4FData: any[] = [];
  const productSalesData: any[] = [];
  
  selectedData.forEach(monthData => {
    monthData.stores.forEach(storeData => {
      if (selectedStores.includes(storeData.store.id)) {
        if (storeData.data.cafe) cafeData.push(storeData.data.cafe);
        if (storeData.data.party3F) party3FData.push(storeData.data.party3F);
        if (storeData.data.party4F) party4FData.push(storeData.data.party4F);
        if (storeData.data.productSales) productSalesData.push(storeData.data.productSales);
      }
    });
  });
  
  // データを統合
  if (cafeData.length > 0) {
    summaryData.cafe = cafeData.reduce((acc, curr) => mergeSalesCategoryData(acc, curr));
  }
  if (party3FData.length > 0) {
    summaryData.party3F = party3FData.reduce((acc, curr) => mergeSalesCategoryData(acc, curr));
  }
  if (party4FData.length > 0) {
    summaryData.party4F = party4FData.reduce((acc, curr) => mergeSalesCategoryData(acc, curr));
  }
  if (productSalesData.length > 0) {
    summaryData.productSales = productSalesData.reduce((acc, curr) => mergeProductSales(acc, curr));
  }
  
  return summaryData;
};

// 店舗別データを取得
export const getStoreData = (month: string, storeId: string): Partial<WaldData> | null => {
  const monthlyData = loadMonthlyData();
  const monthData = monthlyData.find(m => m.month === month);
  if (!monthData) return null;
  
  const storeData = monthData.stores.find(s => s.store.id === storeId);
  return storeData ? storeData.data : null;
};

// データを削除
export const deleteStoreData = (month: string, storeId: string): MonthlyData[] => {
  const monthlyData = loadMonthlyData();
  const monthIndex = monthlyData.findIndex(m => m.month === month);
  
  if (monthIndex >= 0) {
    const storeIndex = monthlyData[monthIndex].stores.findIndex(s => s.store.id === storeId);
    if (storeIndex >= 0) {
      monthlyData[monthIndex].stores.splice(storeIndex, 1);
      monthlyData[monthIndex].totalFileCount -= 1;
      
      if (monthlyData[monthIndex].stores.length === 0) {
        monthlyData.splice(monthIndex, 1);
      }
    }
  }
  
  saveMonthlyData(monthlyData);
  return monthlyData;
};

// 全データをクリア
export const clearAllData = (): void => {
  localStorage.removeItem(STORES_STORAGE_KEY);
  localStorage.removeItem(MONTHLY_DATA_STORAGE_KEY);
};

export type { MonthlyData }; 
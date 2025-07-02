import type { WaldData, SalesCategoryData, ProductSales, DailyEntry } from '../types';

export interface MonthlyData {
  month: string; // "2024年1月" 形式
  data: Partial<WaldData>;
  lastUpdated: string;
  fileCount: number;
}

export interface AggregatedData {
  months: MonthlyData[];
  currentMonth: string | null;
}

const STORAGE_KEY = 'wald_sales_data';

// ローカルストレージからデータを読み込み
export const loadStoredData = (): AggregatedData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('ローカルストレージからのデータ読み込みに失敗しました:', error);
  }
  return { months: [], currentMonth: null };
};

// ローカルストレージにデータを保存
export const saveStoredData = (data: AggregatedData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('ローカルストレージへのデータ保存に失敗しました:', error);
  }
};

// 月次データを統合
const mergeSalesCategoryData = (existing: SalesCategoryData | undefined, incoming: SalesCategoryData): SalesCategoryData => {
  if (!existing) return incoming;

  const dailyMap = new Map<string, DailyEntry>();
  existing.daily.forEach(d => dailyMap.set(d.date, d));
  incoming.daily.forEach(d => dailyMap.set(d.date, d));
  const newDaily = Array.from(dailyMap.values()).sort((a, b) => parseInt(a.date) - parseInt(b.date));

  const newTotalSales = newDaily.reduce((sum, item) => sum + item.sales, 0);
  const newTotalGuests = newDaily.reduce((sum, item) => sum + item.guests, 0);

  return {
    daily: newDaily,
    totalSales: newTotalSales,
    totalGuests: newTotalGuests,
    avgSpend: newTotalGuests > 0 ? newTotalSales / newTotalGuests : 0,
  };
};

// 商品売上データを統合
const mergeProductSales = (existing: ProductSales | undefined, incoming: ProductSales): ProductSales => {
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

// 新しいデータを追加または更新
export const addOrUpdateMonthlyData = (month: string, newData: Partial<WaldData>): AggregatedData => {
  const currentData = loadStoredData();
  
  // 既存の月データを探す
  const existingMonthIndex = currentData.months.findIndex(m => m.month === month);
  
  if (existingMonthIndex >= 0) {
    // 既存データを更新
    const existingData = currentData.months[existingMonthIndex].data;
    
    const updatedData: Partial<WaldData> = { ...existingData };
    
    if (newData.cafe) {
      updatedData.cafe = mergeSalesCategoryData(existingData.cafe, newData.cafe);
    }
    if (newData.party3F) {
      updatedData.party3F = mergeSalesCategoryData(existingData.party3F, newData.party3F);
    }
    if (newData.party4F) {
      updatedData.party4F = mergeSalesCategoryData(existingData.party4F, newData.party4F);
    }
    if (newData.productSales) {
      updatedData.productSales = mergeProductSales(existingData.productSales, newData.productSales);
    }
    
    currentData.months[existingMonthIndex] = {
      month,
      data: updatedData,
      lastUpdated: new Date().toISOString(),
      fileCount: currentData.months[existingMonthIndex].fileCount + 1,
    };
  } else {
    // 新しい月データを追加
    currentData.months.push({
      month,
      data: newData,
      lastUpdated: new Date().toISOString(),
      fileCount: 1,
    });
  }
  
  // 月順にソート
  currentData.months.sort((a, b) => {
    const aYear = parseInt(a.month.match(/(\d{4})年/)?.[1] || '0');
    const aMonth = parseInt(a.month.match(/(\d{1,2})月/)?.[1] || '0');
    const bYear = parseInt(b.month.match(/(\d{4})年/)?.[1] || '0');
    const bMonth = parseInt(b.month.match(/(\d{1,2})月/)?.[1] || '0');
    
    if (aYear !== bYear) return aYear - bYear;
    return aMonth - bMonth;
  });
  
  currentData.currentMonth = month;
  
  saveStoredData(currentData);
  return currentData;
};

// 特定の月のデータを取得
export const getMonthlyData = (month: string): Partial<WaldData> | null => {
  const currentData = loadStoredData();
  const monthData = currentData.months.find(m => m.month === month);
  return monthData ? monthData.data : null;
};

// 全月のデータを取得
export const getAllMonthlyData = (): MonthlyData[] => {
  const currentData = loadStoredData();
  return currentData.months;
};

// 複数月のデータを統合して表示用データを作成
export const createAggregatedViewData = (months: string[]): Partial<WaldData> => {
  const currentData = loadStoredData();
  const selectedMonths = currentData.months.filter(m => months.includes(m.month));
  
  if (selectedMonths.length === 0) return {};
  
  const aggregatedData: Partial<WaldData> = {
    month: months.length === 1 ? months[0] : `${months[0]} - ${months[months.length - 1]}`,
  };
  
  // 各カテゴリのデータを統合
  const cafeData: SalesCategoryData[] = [];
  const party3FData: SalesCategoryData[] = [];
  const party4FData: SalesCategoryData[] = [];
  const productSalesData: ProductSales[] = [];
  
  selectedMonths.forEach(monthData => {
    if (monthData.data.cafe) cafeData.push(monthData.data.cafe);
    if (monthData.data.party3F) party3FData.push(monthData.data.party3F);
    if (monthData.data.party4F) party4FData.push(monthData.data.party4F);
    if (monthData.data.productSales) productSalesData.push(monthData.data.productSales);
  });
  
  // カフェデータを統合
  if (cafeData.length > 0) {
    aggregatedData.cafe = cafeData.reduce((acc, curr) => mergeSalesCategoryData(acc, curr));
  }
  
  // 3Fパーティデータを統合
  if (party3FData.length > 0) {
    aggregatedData.party3F = party3FData.reduce((acc, curr) => mergeSalesCategoryData(acc, curr));
  }
  
  // 4Fパーティデータを統合
  if (party4FData.length > 0) {
    aggregatedData.party4F = party4FData.reduce((acc, curr) => mergeSalesCategoryData(acc, curr));
  }
  
  // 商品売上データを統合
  if (productSalesData.length > 0) {
    aggregatedData.productSales = productSalesData.reduce((acc, curr) => mergeProductSales(acc, curr));
  }
  
  return aggregatedData;
};

// データを削除
export const deleteMonthlyData = (month: string): AggregatedData => {
  const currentData = loadStoredData();
  currentData.months = currentData.months.filter(m => m.month !== month);
  
  if (currentData.currentMonth === month) {
    currentData.currentMonth = currentData.months.length > 0 ? currentData.months[currentData.months.length - 1].month : null;
  }
  
  saveStoredData(currentData);
  return currentData;
};

// 全データをクリア
export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEY);
}; 
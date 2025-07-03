import type { WaldData, SalesCategoryData, ProductSales, DailyEntry } from '../types';

export interface MonthlyData {
  month: string; // "2024年1月" 形式
  data: Partial<WaldData>;
  lastUpdated: string;
  fileCount: number;
  clientId?: string; // クライアントID（マルチテナント対応）
  storeId?: string; // 店舗ID
}

export interface AggregatedData {
  months: MonthlyData[];
  currentMonth: string | null;
}

// 時系列データの分析用インターフェース
export interface TimeSeriesData {
  date: string;
  sales: number;
  guests: number;
  avgSpend: number;
  category?: string;
  storeId?: string;
}

// 過去データ分析用インターフェース
export interface HistoricalAnalysis {
  period: string;
  totalSales: number;
  totalGuests: number;
  avgSpend: number;
  growthRate?: number;
  comparison?: {
    previousPeriod: string;
    salesChange: number;
    guestsChange: number;
    spendChange: number;
  };
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

// 新しいデータを追加または更新（クライアントID対応）
export const addOrUpdateMonthlyData = (
  month: string, 
  newData: Partial<WaldData>, 
  clientId?: string,
  storeId?: string
): AggregatedData => {
  const currentData = loadStoredData();
  
  // クライアントIDと店舗IDでフィルタリング
  const existingMonthIndex = currentData.months.findIndex(m => 
    m.month === month && 
    m.clientId === clientId && 
    m.storeId === storeId
  );
  
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
      clientId,
      storeId,
    };
  } else {
    // 新しい月データを追加
    currentData.months.push({
      month,
      data: newData,
      lastUpdated: new Date().toISOString(),
      fileCount: 1,
      clientId,
      storeId,
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

// 特定の月のデータを取得（クライアントID対応）
export const getMonthlyData = (
  month: string, 
  clientId?: string, 
  storeId?: string
): Partial<WaldData> | null => {
  const currentData = loadStoredData();
  const monthData = currentData.months.find(m => 
    m.month === month && 
    m.clientId === clientId && 
    m.storeId === storeId
  );
  return monthData ? monthData.data : null;
};

// 全月のデータを取得（クライアントID対応）
export const getAllMonthlyData = (clientId?: string, storeId?: string): MonthlyData[] => {
  const currentData = loadStoredData();
  return currentData.months.filter(m => 
    (!clientId || m.clientId === clientId) && 
    (!storeId || m.storeId === storeId)
  );
};

// 時系列データを抽出（過去データ分析用）
export const extractTimeSeriesData = (
  months: string[], 
  clientId?: string, 
  storeId?: string
): TimeSeriesData[] => {
  const allData = getAllMonthlyData(clientId, storeId);
  const selectedMonths = allData.filter(m => months.includes(m.month));
  
  const timeSeriesData: TimeSeriesData[] = [];
  
  selectedMonths.forEach(monthData => {
    // カフェデータ
    if (monthData.data.cafe) {
      monthData.data.cafe.daily.forEach(daily => {
        timeSeriesData.push({
          date: daily.date,
          sales: daily.sales,
          guests: daily.guests,
          avgSpend: daily.sales / daily.guests,
          category: 'cafe',
          storeId: monthData.storeId,
        });
      });
    }
    
    // パーティ3Fデータ
    if (monthData.data.party3F) {
      monthData.data.party3F.daily.forEach(daily => {
        timeSeriesData.push({
          date: daily.date,
          sales: daily.sales,
          guests: daily.guests,
          avgSpend: daily.sales / daily.guests,
          category: 'party3F',
          storeId: monthData.storeId,
        });
      });
    }
    
    // パーティ4Fデータ
    if (monthData.data.party4F) {
      monthData.data.party4F.daily.forEach(daily => {
        timeSeriesData.push({
          date: daily.date,
          sales: daily.sales,
          guests: daily.guests,
          avgSpend: daily.sales / daily.guests,
          category: 'party4F',
          storeId: monthData.storeId,
        });
      });
    }
  });
  
  return timeSeriesData.sort((a, b) => parseInt(a.date) - parseInt(b.date));
};

// 過去データ分析（前年同月比など）
export const analyzeHistoricalData = (
  currentMonths: string[], 
  previousMonths: string[], 
  clientId?: string, 
  storeId?: string
): HistoricalAnalysis => {
  const currentData = getAllMonthlyData(clientId, storeId).filter(m => currentMonths.includes(m.month));
  const previousData = getAllMonthlyData(clientId, storeId).filter(m => previousMonths.includes(m.month));
  
  // 現在期間の集計
  const currentTotalSales = currentData.reduce((sum, month) => {
    let monthSales = 0;
    if (month.data.cafe) monthSales += month.data.cafe.totalSales;
    if (month.data.party3F) monthSales += month.data.party3F.totalSales;
    if (month.data.party4F) monthSales += month.data.party4F.totalSales;
    return sum + monthSales;
  }, 0);
  
  const currentTotalGuests = currentData.reduce((sum, month) => {
    let monthGuests = 0;
    if (month.data.cafe) monthGuests += month.data.cafe.totalGuests;
    if (month.data.party3F) monthGuests += month.data.party3F.totalGuests;
    if (month.data.party4F) monthGuests += month.data.party4F.totalGuests;
    return sum + monthGuests;
  }, 0);
  
  const currentAvgSpend = currentTotalGuests > 0 ? currentTotalSales / currentTotalGuests : 0;
  
  // 前期間の集計
  const previousTotalSales = previousData.reduce((sum, month) => {
    let monthSales = 0;
    if (month.data.cafe) monthSales += month.data.cafe.totalSales;
    if (month.data.party3F) monthSales += month.data.party3F.totalSales;
    if (month.data.party4F) monthSales += month.data.party4F.totalSales;
    return sum + monthSales;
  }, 0);
  
  const previousTotalGuests = previousData.reduce((sum, month) => {
    let monthGuests = 0;
    if (month.data.cafe) monthGuests += month.data.cafe.totalGuests;
    if (month.data.party3F) monthGuests += month.data.party3F.totalGuests;
    if (month.data.party4F) monthGuests += month.data.party4F.totalGuests;
    return sum + monthGuests;
  }, 0);
  
  const previousAvgSpend = previousTotalGuests > 0 ? previousTotalSales / previousTotalGuests : 0;
  
  // 変化率計算
  const salesChange = previousTotalSales > 0 ? ((currentTotalSales - previousTotalSales) / previousTotalSales) * 100 : 0;
  const guestsChange = previousTotalGuests > 0 ? ((currentTotalGuests - previousTotalGuests) / previousTotalGuests) * 100 : 0;
  const spendChange = previousAvgSpend > 0 ? ((currentAvgSpend - previousAvgSpend) / previousAvgSpend) * 100 : 0;
  
  return {
    period: currentMonths.join(', '),
    totalSales: currentTotalSales,
    totalGuests: currentTotalGuests,
    avgSpend: currentAvgSpend,
    growthRate: salesChange,
    comparison: {
      previousPeriod: previousMonths.join(', '),
      salesChange,
      guestsChange,
      spendChange,
    },
  };
};

// 複数月のデータを統合して表示用データを作成（クライアントID対応）
export const createAggregatedViewData = (
  months: string[], 
  clientId?: string, 
  storeId?: string
): Partial<WaldData> => {
  const currentData = getAllMonthlyData(clientId, storeId);
  const selectedMonths = currentData.filter(m => months.includes(m.month));
  
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

// データを削除（クライアントID対応）
export const deleteMonthlyData = (
  month: string, 
  clientId?: string, 
  storeId?: string
): AggregatedData => {
  const currentData = loadStoredData();
  currentData.months = currentData.months.filter(m => 
    !(m.month === month && m.clientId === clientId && m.storeId === storeId)
  );
  
  if (currentData.currentMonth === month) {
    currentData.currentMonth = currentData.months.length > 0 ? currentData.months[currentData.months.length - 1].month : null;
  }
  
  saveStoredData(currentData);
  return currentData;
};

// 全データをクリア（クライアントID対応）
export const clearAllData = (clientId?: string): void => {
  if (clientId) {
    // 特定クライアントのデータのみクリア
    const currentData = loadStoredData();
    currentData.months = currentData.months.filter(m => m.clientId !== clientId);
    saveStoredData(currentData);
  } else {
    // 全データクリア
    localStorage.removeItem(STORAGE_KEY);
  }
}; 
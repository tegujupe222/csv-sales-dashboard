export interface DailyEntry {
  date: string; // e.g., "1日"
  sales: number;
  guests: number;
  avgSpend: number;
}

export interface SalesCategoryData {
  daily: DailyEntry[];
  totalSales: number;
  totalGuests: number;
  avgSpend: number;
}

export interface Product {
    code: string;
    name: string;
    sales: number;
    tax: number;
    taxRate: number;
}

export interface ProductSalesByTaxRate {
    sales10: number;
    tax10: number;
    sales8: number;
    tax8: number;
}

export interface ProductSales {
    sandwiches: ProductSalesByTaxRate;
    drinks: ProductSalesByTaxRate;
    other: ProductSalesByTaxRate;
}

export interface Store {
  id: string;
  name: string;
  code: string; // 店舗コード
}

export interface WaldData {
  month: string;
  storeId?: string; // 店舗ID（オプション）
  cafe: SalesCategoryData;
  party3F: SalesCategoryData;
  party4F: SalesCategoryData;
  productSales: ProductSales;
}

export interface StoreData {
  store: Store;
  data: Partial<WaldData>;
  lastUpdated: string;
  fileCount: number;
  uploadHistory?: string[]; // アップロードされたファイル名の履歴
}

export interface MonthlyData {
  month: string;
  stores: StoreData[];
  lastUpdated: string;
  totalFileCount: number;
}

export enum FileType {
    Unknown,
    DailySales,
    Party,
    ProductSalesByTaxRate,
}

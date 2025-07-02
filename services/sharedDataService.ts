import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { Store, DailyEntry, SalesCategoryData, MonthlyData } from '../types';
import { db } from '../firebase';

// 共有データベースのコレクション名
const SHARED_COLLECTION = 'shared_data';
const ORGANIZATION_ID = 'iga-factory'; // 組織ID（固定）

// 共有データベースに月次データを保存
export async function saveSharedMonthlyData(monthlyData: MonthlyData[]) {
  const sharedRef = doc(db, SHARED_COLLECTION, ORGANIZATION_ID);
  
  await setDoc(sharedRef, {
    monthlyData: monthlyData,
    lastSync: new Date().toISOString(),
    version: '1.0',
    lastUpdatedBy: 'system'
  }, { merge: true });
}

// 共有データベースから月次データを取得
export async function getSharedMonthlyData(): Promise<MonthlyData[] | null> {
  const sharedRef = doc(db, SHARED_COLLECTION, ORGANIZATION_ID);
  const snap = await getDoc(sharedRef);
  
  if (snap.exists()) {
    const data = snap.data();
    return data.monthlyData || null;
  }
  return null;
}

// 共有データベースのリアルタイム監視
export function subscribeToSharedData(callback: (data: MonthlyData[] | null) => void) {
  const sharedRef = doc(db, SHARED_COLLECTION, ORGANIZATION_ID);
  
  return onSnapshot(sharedRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback(data.monthlyData || null);
    } else {
      callback(null);
    }
  });
}

// 共有データベースに店舗データを保存
export async function saveSharedStoreData(stores: Store[]) {
  const sharedRef = doc(db, SHARED_COLLECTION, ORGANIZATION_ID);
  
  await setDoc(sharedRef, {
    stores: stores,
    lastSync: new Date().toISOString(),
    version: '1.0',
    lastUpdatedBy: 'system'
  }, { merge: true });
}

// 共有データベースから店舗データを取得
export async function getSharedStoreData(): Promise<Store[] | null> {
  const sharedRef = doc(db, SHARED_COLLECTION, ORGANIZATION_ID);
  const snap = await getDoc(sharedRef);
  
  if (snap.exists()) {
    const data = snap.data();
    return data.stores || null;
  }
  return null;
}

// データの最終更新日時を比較して最新データを判定
export function getLatestSharedData(localData: MonthlyData[], sharedData: MonthlyData[] | null): {
  data: MonthlyData[];
  source: 'local' | 'shared' | 'merged';
} {
  if (!sharedData || sharedData.length === 0) {
    return { data: localData, source: 'local' };
  }
  
  if (localData.length === 0) {
    return { data: sharedData, source: 'shared' };
  }
  
  // 最新の更新日時を比較
  const localLatest = Math.max(...localData.map(d => new Date(d.lastUpdated).getTime()));
  const sharedLatest = Math.max(...sharedData.map(d => new Date(d.lastUpdated).getTime()));
  
  if (localLatest > sharedLatest) {
    return { data: localData, source: 'local' };
  } else if (sharedLatest > localLatest) {
    return { data: sharedData, source: 'shared' };
  } else {
    // 同じ場合はマージ
    return { data: mergeMonthlyData(localData, sharedData), source: 'merged' };
  }
}

// 月次データのマージ（重複を除去し、最新データを優先）
function mergeMonthlyData(localData: MonthlyData[], sharedData: MonthlyData[]): MonthlyData[] {
  const mergedMap = new Map<string, MonthlyData>();
  
  // ローカルデータを追加
  localData.forEach(monthData => {
    mergedMap.set(monthData.month, monthData);
  });
  
  // 共有データで更新（より新しい場合のみ）
  sharedData.forEach(monthData => {
    const existing = mergedMap.get(monthData.month);
    if (!existing || new Date(monthData.lastUpdated) > new Date(existing.lastUpdated)) {
      mergedMap.set(monthData.month, monthData);
    }
  });
  
  return Array.from(mergedMap.values());
} 
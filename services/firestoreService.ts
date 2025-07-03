import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { MonthlyData, SalesCategoryData } from '../types';
import { db } from '../firebase';

// Firestoreに売上データを保存
export async function saveSalesData({
  uid,
  storeCode,
  month,
  salesData,
}: {
  uid: string;
  storeCode: string;
  month: string; // 'YYYY-MM'
  salesData: SalesCategoryData;
}) {
  const monthRef = doc(db, 'users', uid, 'stores', storeCode, 'months', month);
  await setDoc(monthRef, { salesData }, { merge: true });
}

// Firestoreから売上データを取得
export async function getSalesData({
  uid,
  storeCode,
  month,
}: {
  uid: string;
  storeCode: string;
  month: string;
}): Promise<SalesCategoryData | null> {
  const monthRef = doc(db, 'users', uid, 'stores', storeCode, 'months', month);
  const snap = await getDoc(monthRef);
  if (snap.exists()) {
    return snap.data().salesData || null;
  }
  return null;
}

// Firestoreからユーザーの全店舗・月の売上データを取得
export async function getAllSalesData(uid: string): Promise<{
  [storeCode: string]: {
    [month: string]: SalesCategoryData;
  };
}> {
  const storesCol = collection(db, 'users', uid, 'stores');
  const storesSnap = await getDocs(storesCol);
  const result: any = {};
  for (const storeDoc of storesSnap.docs) {
    const storeCode = storeDoc.id;
    const monthsCol = collection(db, 'users', uid, 'stores', storeCode, 'months');
    const monthsSnap = await getDocs(monthsCol);
    result[storeCode] = {};
    for (const monthDoc of monthsSnap.docs) {
      result[storeCode][monthDoc.id] = monthDoc.data().salesData || null;
    }
  }
  return result;
}

// 完全同期用：月次データ全体をFirestoreに保存
export async function saveMonthlyData(uid: string, monthlyData: MonthlyData[]) {
  const userRef = doc(db, 'users', uid);
  
  // 月次データ全体を保存
  await setDoc(userRef, {
    monthlyData: monthlyData,
    lastSync: new Date().toISOString(),
    version: '1.0'
  }, { merge: true });
}

// 完全同期用：月次データ全体をFirestoreから取得
export async function getMonthlyData(uid: string): Promise<MonthlyData[] | null> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  
  if (snap.exists()) {
    const data = snap.data();
    return data.monthlyData || null;
  }
  return null;
}

// データの最終更新日時を比較して最新データを判定
export function getLatestData(localData: MonthlyData[], firestoreData: MonthlyData[] | null): {
  data: MonthlyData[];
  source: 'local' | 'firestore' | 'merged';
} {
  if (!firestoreData || firestoreData.length === 0) {
    return { data: localData, source: 'local' };
  }
  
  if (localData.length === 0) {
    return { data: firestoreData, source: 'firestore' };
  }
  
  // 最新の更新日時を比較
  const localLatest = Math.max(...localData.map(d => new Date(d.lastUpdated).getTime()));
  const firestoreLatest = Math.max(...firestoreData.map(d => new Date(d.lastUpdated).getTime()));
  
  if (localLatest > firestoreLatest) {
    return { data: localData, source: 'local' };
  } else if (firestoreLatest > localLatest) {
    return { data: firestoreData, source: 'firestore' };
  } else {
    // 同じ場合はマージ
    return { data: mergeMonthlyData(localData, firestoreData), source: 'merged' };
  }
}

// 月次データのマージ（重複を除去し、最新データを優先）
function mergeMonthlyData(localData: MonthlyData[], firestoreData: MonthlyData[]): MonthlyData[] {
  const mergedMap = new Map<string, MonthlyData>();
  
  // ローカルデータを追加
  localData.forEach(monthData => {
    mergedMap.set(monthData.month, monthData);
  });
  
  // Firestoreデータで更新（より新しい場合のみ）
  firestoreData.forEach(monthData => {
    const existing = mergedMap.get(monthData.month);
    if (!existing || new Date(monthData.lastUpdated) > new Date(existing.lastUpdated)) {
      mergedMap.set(monthData.month, monthData);
    }
  });
  
  return Array.from(mergedMap.values());
} 
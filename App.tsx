import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { Spinner } from './components/Spinner';
import { MonthSelector } from './components/MonthSelector';
import { StoreManager } from './components/StoreManager';
import { StoreSelector } from './components/StoreSelector';
import { LogoIcon } from './components/icons';
import { processCsvFile } from './services/csvProcessor';
import { 
  loadStores,
  loadMonthlyData,
  addOrUpdateStoreData,
  createSummaryData,
  deleteStoreData,
  clearAllData,
  type MonthlyData 
} from './services/storeManager';
import type { WaldData, Store } from './types';




function App(): React.ReactNode {
  const [reportData, setReportData] = useState<Partial<WaldData> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFileName, setLastFileName] = useState<string>('');
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  
  // 初期化時にローカルストレージからデータを読み込み
  useEffect(() => {
    const loadedStores = loadStores();
    setStores(loadedStores);
    
    const loadedMonthlyData = loadMonthlyData();
    setMonthlyData(loadedMonthlyData);
    
    // デフォルトで最初の店舗を選択
    if (loadedStores.length > 0 && selectedStores.length === 0) {
      setSelectedStores([loadedStores[0].id]);
      setSelectedStoreId(loadedStores[0].id);
    }
  }, []);
  
  const handleFileProcess = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setLastFileName(file.name);
    try {
      const result = await processCsvFile(file);
      
      if (result.month && result.storeId) {
        // 店舗IDから店舗を特定
        const store = stores.find(s => s.code === result.storeId);
        if (!store) {
          throw new Error(`店舗コード "${result.storeId}" に対応する店舗が見つかりません。店舗管理で店舗を追加してください。`);
        }
        
        // 新しいデータをローカルストレージに保存
        const updatedData = addOrUpdateStoreData(result.month, store.id, result);
        setMonthlyData(updatedData);
        
        // 現在選択中の月に新しい月を追加
        const newSelectedMonths = selectedMonths.includes(result.month) 
          ? selectedMonths 
          : [...selectedMonths, result.month];
        setSelectedMonths(newSelectedMonths);
        
        // 現在選択中の店舗に新しい店舗を追加
        const newSelectedStores = selectedStores.includes(store.id) 
          ? selectedStores 
          : [...selectedStores, store.id];
        setSelectedStores(newSelectedStores);
        
        // 統合データを表示
        const summaryData = createSummaryData(newSelectedMonths, newSelectedStores);
        setReportData(summaryData);
      } else {
        throw new Error('ファイル名から店舗情報を抽出できませんでした。ファイル名に店舗コードを含めてください。');
      }
    } catch (e: any) {
      setError(e.message || 'ファイルの処理に失敗しました。ファイル形式を確認して再度お試しください。');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonths, selectedStores, stores]);

  const handleMonthSelectionChange = useCallback((months: string[]) => {
    setSelectedMonths(months);
    if (months.length > 0 && selectedStores.length > 0) {
      const summaryData = createSummaryData(months, selectedStores);
      setReportData(summaryData);
    } else {
      setReportData(null);
    }
  }, [selectedStores]);

  const handleStoreSelectionChange = useCallback((storeIds: string[]) => {
    setSelectedStores(storeIds);
    if (selectedMonths.length > 0 && storeIds.length > 0) {
      const summaryData = createSummaryData(selectedMonths, storeIds);
      setReportData(summaryData);
    } else {
      setReportData(null);
    }
  }, [selectedMonths]);

  const handleDeleteMonth = useCallback((month: string) => {
    const updatedData = deleteStoreData(month, selectedStoreId || '');
    setMonthlyData(updatedData);
    
    const newSelectedMonths = selectedMonths.filter((m: string) => m !== month);
    setSelectedMonths(newSelectedMonths);
    
    if (newSelectedMonths.length > 0 && selectedStores.length > 0) {
      const summaryData = createSummaryData(newSelectedMonths, selectedStores);
      setReportData(summaryData);
    } else {
      setReportData(null);
    }
  }, [selectedMonths, selectedStores, selectedStoreId]);

  const handleClearAll = useCallback(() => {
    clearAllData();
    setMonthlyData([]);
    setSelectedMonths([]);
    setSelectedStores([]);
    setSelectedStoreId(null);
    setReportData(null);
    setError(null);
    setLastFileName('');
  }, []);

  const handleReset = useCallback(() => {
    setReportData(null);
    setError(null);
    setLastFileName('');
    setSelectedMonths([]);
    setSelectedStores([]);
    setSelectedStoreId(null);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-md z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <LogoIcon className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-gray-800">売上分析ダッシュボード</h1>
            </div>
            {reportData && (
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-primary text-white font-semibold rounded-lg shadow-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-200"
              >
                新規レポート開始
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && <Spinner />}
          
          {!isLoading && error && (
            <div className="text-center">
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md" role="alert">
                <p className="font-bold">処理エラー</p>
                <p>{error}</p>
              </div>
               <button onClick={handleReset} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">再試行</button>
            </div>
          )}

          {!isLoading && !error && (
            <div className="space-y-6">
              <StoreManager
                stores={stores}
                onStoresChange={setStores}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StoreSelector
                  stores={stores}
                  selectedStores={selectedStores}
                  onStoreSelectionChange={handleStoreSelectionChange}
                />
                
                <MonthSelector
                  months={monthlyData}
                  selectedMonths={selectedMonths}
                  onMonthSelectionChange={handleMonthSelectionChange}
                  onDeleteMonth={handleDeleteMonth}
                  onClearAll={handleClearAll}
                />
              </div>
              
              {!reportData && (
                <FileUpload onFileProcess={handleFileProcess} />
              )}

              {reportData && (
                <Dashboard data={reportData} onNewUpload={handleFileProcess} lastFileName={lastFileName} />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
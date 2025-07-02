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
import { saveSalesData, getAllSalesData, saveMonthlyData, getMonthlyData, getLatestData } from './services/firestoreService';
import { saveSharedMonthlyData, getSharedMonthlyData, getLatestSharedData } from './services/sharedDataService';
import { downloadBackup, loadBackup, restoreBackup, compareBackup } from './services/backupService';
import type { WaldData, Store } from './types';
import GoogleLoginButton from './src/components/GoogleLoginButton';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { getUser, registerUser } from './services/userService';
import AdminDashboard from './components/AdminDashboard';
import RegistrationModal from './components/RegistrationModal';
import ApprovalPendingScreen from './components/ApprovalPendingScreen';

const ADMIN_EMAIL = 'igafactory2023@gmail.com';

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
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState<{email: string, displayName: string} | null>(null);
  
  // 共有データベースとローカルストレージの完全同期
  const syncDataWithFirestore = useCallback(async (uid: string) => {
    setIsSyncing(true);
    try {
      const localMonthlyData = loadMonthlyData();
      const sharedMonthlyData = await getSharedMonthlyData();
      
      // 最新データを判定して同期
      const { data: latestData, source } = getLatestSharedData(localMonthlyData, sharedMonthlyData);
      
      console.log(`データ同期: ${source} データを使用`);
      
      // 最新データをローカルストレージに保存
      localStorage.setItem('monthlyData', JSON.stringify(latestData));
      setMonthlyData(latestData);
      
      // 共有データベースに最新データを保存（ローカルデータが新しい場合）
      if (source === 'local' || source === 'merged') {
        await saveSharedMonthlyData(latestData);
        console.log('共有データベースに最新データを保存しました');
      }
      
      // 店舗データも同期
      const loadedStores = loadStores();
      if (loadedStores.length > 0) {
        setStores(loadedStores);
        
        // デフォルトで最初の店舗を選択（まだ選択されていない場合）
        if (selectedStores.length === 0) {
          setSelectedStores([loadedStores[0].id]);
          setSelectedStoreId(loadedStores[0].id);
        }
      }
      
      console.log('完全同期が完了しました');
    } catch (error) {
      console.error('データ同期エラー:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [selectedStores.length]);
  
  // Firebase認証状態の監視
  useEffect(() => {
    try {
      const auth = getAuth();
      if (auth) {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          setUser(user);
          setIsAuthLoading(false);

          if (user) {
            // Firestoreから承認状態を取得
            const appUser = await getUser(user.uid);

            if (!appUser) {
              // 新規ユーザーの場合、登録モーダルを必ず表示
              setPendingRegistration({
                email: user.email || '',
                displayName: user.displayName || ''
              });
              setShowRegistrationModal(true);
              setIsApproved(false); // 承認待ち状態に明示的にする
            } else {
              setIsApproved(appUser.approved);
              await syncDataWithFirestore(user.uid);
            }
          } else {
            setIsApproved(null);
          }
        });
        return () => unsubscribe();
      } else {
        setIsAuthLoading(false);
        setIsApproved(null);
        console.log('Firebase authentication not available');
      }
    } catch (error) {
      console.error('Firebase auth error:', error);
      setIsAuthLoading(false);
      setIsApproved(null);
    }
  }, [syncDataWithFirestore]);
  
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
  
  // ネットワーク状態の監視
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('ネットワーク接続が復旧しました');
      
      // オフライン中に変更があった場合は同期を実行
      if (pendingSync && user) {
        syncDataWithFirestore(user.uid);
        setPendingSync(false);
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('ネットワーク接続が切断されました');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingSync, user]);
  
  const handleFileProcess = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setLastFileName(file.name);
    try {
      // 店舗が選択されていない場合はエラー
      if (selectedStores.length === 0) {
        throw new Error('CSVをアップロードする前に、店舗を選択してください。');
      }
      
      // 複数の店舗が選択されている場合は、最初の店舗を使用
      const selectedStoreId = selectedStores[0];
      const selectedStore = stores.find(s => s.id === selectedStoreId);
      if (!selectedStore) {
        throw new Error('選択された店舗が見つかりません。');
      }
      
      const result = await processCsvFile(file, selectedStore.code);
      
      if (result.month) {
        // 新しいデータをローカルストレージに保存
        const updatedData = addOrUpdateStoreData(result.month, selectedStore.id, result, file.name);
        setMonthlyData(updatedData);
        
        // ログインユーザーがいる場合は共有データベースにも保存
        if (user) {
          if (isOnline) {
            try {
              // 共有データベースに保存（全ユーザーで共有）
              await saveSharedMonthlyData(updatedData);
              console.log('共有データベースにデータを保存しました');
            } catch (sharedDataError) {
              console.error('共有データベース保存エラー:', sharedDataError);
              // 保存に失敗してもローカル保存は成功しているので、エラーは表示しない
              setPendingSync(true);
            }
          } else {
            // オフライン時は後で同期するようにマーク
            setPendingSync(true);
            console.log('オフライン中: 後で同期します');
          }
        }
        
        // 現在選択中の月に新しい月を追加
        const newSelectedMonths = selectedMonths.includes(result.month) 
          ? selectedMonths 
          : [...selectedMonths, result.month];
        setSelectedMonths(newSelectedMonths);
        
        // 統合データを表示
        const summaryData = createSummaryData(newSelectedMonths, selectedStores);
        setReportData(summaryData);
      } else {
        throw new Error('ファイル名から月情報を抽出できませんでした。');
      }
    } catch (e: any) {
      setError(e.message || 'ファイルの処理に失敗しました。ファイル形式を確認して再度お試しください。');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonths, selectedStores, stores, user]);

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

  const handleLogout = useCallback(async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      // ログアウト後は自動的にログイン画面に戻る
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  }, []);

  const handleRegistrationConfirm = useCallback(async () => {
    if (!user || !pendingRegistration) return;
    
    try {
      await registerUser({
        uid: user.uid,
        email: pendingRegistration.email,
        displayName: pendingRegistration.displayName
      });
      
      setShowRegistrationModal(false);
      setPendingRegistration(null);
      setIsApproved(false); // 承認待ち状態に設定
    } catch (error) {
      console.error('登録エラー:', error);
    }
  }, [user, pendingRegistration]);

  const handleRegistrationCancel = useCallback(() => {
    setShowRegistrationModal(false);
    setPendingRegistration(null);
    // ログアウトしてログイン画面に戻る
    handleLogout();
  }, [handleLogout]);

  // バックアップダウンロード
  const handleBackupDownload = useCallback(() => {
    try {
      downloadBackup();
    } catch (error) {
      setBackupError('バックアップの作成に失敗しました');
    }
  }, []);
  
  // バックアップ復元
  const handleBackupRestore = useCallback(async (file: File) => {
    try {
      setBackupError(null);
      const backup = await loadBackup(file);
      
      // バックアップデータと現在のデータを比較
      const comparison = compareBackup(backup);
      
      if (comparison.storesChanged || comparison.monthlyDataChanged) {
        // データが変更されている場合は復元を実行
        restoreBackup(backup);
        
        // 状態を更新
        setStores(backup.stores);
        setMonthlyData(backup.monthlyData);
        setSelectedStores([]);
        setSelectedStoreId(null);
        setReportData(null);
        
        // ログインユーザーがいる場合はFirestoreにも同期
        if (user) {
          setPendingSync(true);
        }
        
        console.log('バックアップデータを復元しました');
      } else {
        setBackupError('現在のデータと同じです');
      }
    } catch (error: any) {
      setBackupError(error.message || 'バックアップの復元に失敗しました');
    }
  }, [user]);

  // 管理者判定
  const isAdmin: boolean = !!user && user.email === ADMIN_EMAIL;

  // 管理者ダッシュボード表示
  if (!isAuthLoading && user && isApproved && showAdmin && isAdmin) {
    return <AdminDashboard currentUserEmail={user.email} onBack={() => setShowAdmin(false)} onLogout={handleLogout} />;
  }

  // 登録モーダル
  if (showRegistrationModal && pendingRegistration) {
    return (
      <RegistrationModal
        userEmail={pendingRegistration.email}
        userName={pendingRegistration.displayName}
        onConfirm={handleRegistrationConfirm}
        onCancel={handleRegistrationCancel}
      />
    );
  }

  // 承認待ち画面
  if (!isAuthLoading && user && isApproved === false) {
    return (
      <ApprovalPendingScreen
        userEmail={user.email || ''}
        userName={user.displayName || ''}
        onLogout={handleLogout}
      />
    );
  }

  if (isAuthLoading) {
    return <div>認証状態を確認中...</div>;
  }

  if (!user) {
    // ログイン画面
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md text-center">
          <h2 className="text-2xl font-bold mb-4">ログイン</h2>
          <p className="mb-4 text-gray-600">Googleアカウントでログインしてください</p>
          <GoogleLoginButton />
        </div>
      </div>
    );
  }

  // ここから下は「ログイン済み」の場合のダッシュボード

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar isAdmin={isAdmin} onAdminDashboard={() => setShowAdmin(true)} />
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
          {/* 認証状態の表示 */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ログイン中</p>
                    <p className="font-medium text-gray-800">{user.email}</p>
                    {isSyncing && (
                      <p className="text-xs text-blue-600">データ同期中...</p>
                    )}
                    {!isOnline && (
                      <p className="text-xs text-orange-600">オフライン中</p>
                    )}
                    {pendingSync && !isSyncing && (
                      <p className="text-xs text-yellow-600">同期待機中</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowBackupModal(true)}
                  className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  バックアップ
                </button>
                {user && (
                  <button
                    onClick={() => syncDataWithFirestore(user.uid)}
                    disabled={isSyncing}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSyncing ? '同期中...' : '同期'}
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                >
                  ログアウト
                </button>
              </div>
            </div>
          </div>
          
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
      
      {/* バックアップ・復元モーダル */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">データのバックアップ・復元</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">バックアップの作成</h4>
                <p className="text-sm text-gray-600 mb-3">
                  現在のデータをJSONファイルとしてダウンロードします
                </p>
                <button
                  onClick={handleBackupDownload}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  バックアップをダウンロード
                </button>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">バックアップの復元</h4>
                <p className="text-sm text-gray-600 mb-3">
                  バックアップファイルを選択してデータを復元します
                </p>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleBackupRestore(file);
                    }
                  }}
                  className="w-full text-sm"
                />
              </div>
              
              {backupError && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                  {backupError}
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowBackupModal(false);
                  setBackupError(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
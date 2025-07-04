import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { Spinner } from './components/Spinner';
import { MonthSelector } from './components/MonthSelector';
import { StoreManager } from './components/StoreManager';
import { StoreSelector } from './components/StoreSelector';
import { LogoIcon, CloudArrowUpIcon } from './components/icons';
import { processCsvFile } from './services/csvProcessor';
import { 
  loadStores,
  addOrUpdateStoreData,
  createSummaryData,
  deleteStoreData,
  clearAllData,
  type MonthlyData 
} from './services/storeManager';
import { saveSharedMonthlyData, getSharedMonthlyData } from './services/sharedDataService';
import { downloadBackup, loadBackup, restoreBackup, compareBackup } from './services/backupService';
import type { WaldData, Store } from './types';
import type { MonthlyData as MonthlyDataManager } from './services/dataManager';
import GoogleLoginButton from './src/components/GoogleLoginButton';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { getUser, registerUser } from './services/userService';
import AdminDashboard from './components/AdminDashboard';
import RegistrationModal from './components/RegistrationModal';
import ApprovalPendingScreen from './components/ApprovalPendingScreen';
import ClientManager from './components/ClientManager';
import UserManager from './components/UserManager';
import { analyzeCsvWithGemini } from './services/geminiService';
import Papa from 'papaparse';
import { AIDashboard } from './components/DynamicVisualization';
import { AIChat } from './components/AIChat';
import { analyzeMonthlyReportWithOpenAI } from './services/openaiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

const ADMIN_EMAIL = 'igafactory2023@gmail.com';

function App(): React.ReactNode {
  const [reportData, setReportData] = useState<Partial<WaldData> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFileName, setLastFileName] = useState<string>('');
  const [monthlyData, setMonthlyData] = useState<MonthlyDataManager[]>([]);
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showClientManager, setShowClientManager] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDashboard, setAiDashboard] = useState<any>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiReportError, setAiReportError] = useState<string | null>(null);
  const [aiAnalytics, setAiAnalytics] = useState<any>(null);
  const [aiAnalyticsLoading, setAiAnalyticsLoading] = useState(false);
  const [aiAnalyticsError, setAiAnalyticsError] = useState<string | null>(null);
  const analyticsRequested = useRef(false);
  
  // 共有データベースとローカルストレージの完全同期
  const syncDataWithFirestore = useCallback(async () => {
    setIsSyncing(true);
    try {
      // shared_dataから最新データを取得
      const sharedMonthlyData = await getSharedMonthlyData();
      console.log('Firestore sharedMonthlyData:', sharedMonthlyData);
      setMonthlyData(sharedMonthlyData || []);
      // 最初の月・店舗を自動選択
      if (sharedMonthlyData && sharedMonthlyData.length > 0) {
        if (selectedMonths.length === 0) {
          setSelectedMonths([sharedMonthlyData[0].month]);
        }
      }
      const sharedStores = await (await import('./services/sharedDataService')).getSharedStoreData();
      console.log('Firestore sharedStores:', sharedStores);
      if (sharedStores && sharedStores.length > 0) {
        localStorage.setItem('wald_stores', JSON.stringify(sharedStores));
        setStores(sharedStores);
        if (selectedStores.length === 0) {
          setSelectedStores([sharedStores[0].id]);
          setSelectedStoreId(sharedStores[0].id);
        }
      } else {
        const localStores = loadStores();
        setStores(localStores);
      }
      console.log('shared_dataから完全同期が完了しました');
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
            // Firestoreから承認状態とroleを取得
            const appUser = await getUser(user.uid);

            if (!appUser) {
              setPendingRegistration({
                email: user.email || '',
                displayName: user.displayName || ''
              });
              setShowRegistrationModal(true);
              setIsApproved(false);
              setUserRole(null);
            } else {
              setIsApproved(appUser.approved);
              setUserRole(appUser.role || null);
              await syncDataWithFirestore();
            }
          } else {
            setIsApproved(null);
            setUserRole(null);
          }
        });
        return () => unsubscribe();
      } else {
        setIsAuthLoading(false);
        setIsApproved(null);
        setUserRole(null);
        console.log('Firebase authentication not available');
      }
    } catch (error) {
      console.error('Firebase auth error:', error);
      setIsAuthLoading(false);
      setIsApproved(null);
      setUserRole(null);
    }
  }, [syncDataWithFirestore]);
  
  // ネットワーク状態の監視
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('ネットワーク接続が復旧しました');
      
      // オフライン中に変更があった場合は同期を実行
      if (pendingSync && user) {
        syncDataWithFirestore();
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
  
  // データ更新時のサマリーデータ再計算
  useEffect(() => {
    if (selectedMonths.length > 0 && selectedStores.length > 0 && monthlyData.length > 0) {
      const summaryData = createSummaryData(selectedMonths, selectedStores, monthlyData);
      setReportData(summaryData);
    } else {
      setReportData(null);
    }
  }, [selectedMonths, selectedStores, monthlyData]);
  
  // レポート画面でAI要約・グラフを取得
  useEffect(() => {
    if (activeSection === 'reports' && reportData && selectedMonths.length > 0) {
      setAiReport(null);
      setAiReportLoading(true);
      setAiReportError(null);
      analyzeMonthlyReportWithOpenAI(selectedMonths[0], reportData)
        .then((result) => {
          try {
            setAiReport(JSON.parse(result));
          } catch {
            setAiReport(result);
          }
        })
        .catch((e) => setAiReportError(e.message || 'AI要約取得に失敗しました'))
        .finally(() => setAiReportLoading(false));
    }
  }, [activeSection, reportData, selectedMonths]);

  // 売上分析用データ（月別）
  const salesByMonth = monthlyData.map(md => ({
    month: md.month,
    sales: md.data?.cafe?.totalSales || 0,
    guests: md.data?.cafe?.totalGuests || 0,
    avgSpend: md.data?.cafe?.avgSpend || 0,
  })).sort((a, b) => a.month.localeCompare(b.month));

  // AI要約・インサイト取得（分析セクション表示時のみ1回）
  useEffect(() => {
    if (activeSection === 'analytics' && salesByMonth.length > 0 && !analyticsRequested.current) {
      setAiAnalytics(null);
      setAiAnalyticsLoading(true);
      setAiAnalyticsError(null);
      analyticsRequested.current = true;
      analyzeMonthlyReportWithOpenAI('全期間', salesByMonth)
        .then((result) => {
          try {
            setAiAnalytics(JSON.parse(result));
          } catch {
            setAiAnalytics(result);
          }
        })
        .catch((e) => setAiAnalyticsError(e.message || 'AI要約取得に失敗しました'))
        .finally(() => setAiAnalyticsLoading(false));
    }
    if (activeSection !== 'analytics') {
      analyticsRequested.current = false;
    }
  }, [activeSection, salesByMonth]);

  const handleFileProcess = useCallback(async (file: File) => {
    setAiPreview(null);
    setAiError(null);
    setAiLoading(true);
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
        const summaryData = createSummaryData(newSelectedMonths, selectedStores, monthlyData);
        setReportData(summaryData);
      } else {
        throw new Error('ファイル名から月情報を抽出できませんでした。');
      }
    } catch (e: any) {
      setError(e.message || 'ファイルの処理に失敗しました。ファイル形式を確認して再度お試しください。');
      console.error(e);
    } finally {
      setIsLoading(false);
      setAiLoading(false);
    }
  }, [selectedMonths, selectedStores, stores, user]);

  const handleMonthSelectionChange = useCallback((months: string[]) => {
    setSelectedMonths(months);
    if (months.length > 0 && selectedStores.length > 0) {
      const summaryData = createSummaryData(months, selectedStores, monthlyData);
      setReportData(summaryData);
    } else {
      setReportData(null);
    }
  }, [selectedStores, monthlyData]);

  const handleStoreSelectionChange = useCallback((storeIds: string[]) => {
    setSelectedStores(storeIds);
    if (selectedMonths.length > 0 && storeIds.length > 0) {
      const summaryData = createSummaryData(selectedMonths, storeIds, monthlyData);
      setReportData(summaryData);
    } else {
      setReportData(null);
    }
  }, [selectedMonths, monthlyData]);

  const handleDeleteMonth = useCallback((month: string) => {
    const updatedData = deleteStoreData(month, selectedStoreId || '');
    setMonthlyData(updatedData);
    
    const newSelectedMonths = selectedMonths.filter((m: string) => m !== month);
    setSelectedMonths(newSelectedMonths);
    
    if (newSelectedMonths.length > 0 && selectedStores.length > 0) {
      const summaryData = createSummaryData(newSelectedMonths, selectedStores, updatedData);
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
  const isAdmin: boolean = userRole === 'admin';

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
      <div className="flex items-center justify-center h-screen bg-gray-100 p-4">
        <div className="bg-white p-6 lg:p-8 rounded shadow-md text-center w-full max-w-md">
          {/* ロゴ画像 */}
          <img src="/logo.png" alt="Company Logo" className="mx-auto mb-4" style={{ maxWidth: 120, maxHeight: 120 }} />
          {/* アプリ名 */}
          <h1 className="text-2xl lg:text-3xl font-extrabold mb-2 text-primary">EVEN View</h1>
          <h2 className="text-xl lg:text-2xl font-bold mb-4">ログイン</h2>
          <p className="mb-4 text-gray-600 text-sm lg:text-base">Googleアカウントでログインしてください</p>
          <GoogleLoginButton />
        </div>
      </div>
    );
  }

  // ここから下は「ログイン済み」の場合のダッシュボード

  const handleAiConfirm = () => {
    // AI提案内容をパースしてダッシュボード生成
    if (!aiPreview) return;
    try {
      // 返答がJSONの場合のみ対応
      const json = JSON.parse(aiPreview);
      setAiDashboard(json);
      setAiPreview(null);
    } catch (e) {
      alert('AI返答がJSON形式ではありません。');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* モバイル用オーバーレイ */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* サイドバー */}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar 
          isAdmin={isAdmin} 
          onAdminDashboard={() => {
            setShowUserManager(true);
            setShowClientManager(false);
          }}
          onClientManager={() => {
            setShowClientManager(true);
            setShowUserManager(false);
          }}
          onClose={() => setIsSidebarOpen(false)}
          onNavigate={(section) => {
            setActiveSection(section);
            setIsSidebarOpen(false);
            setShowUserManager(false);
            setShowClientManager(false);
          }}
          activeSection={activeSection}
        />
      </div>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-md z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              {/* モバイル用ハンバーガーメニュー */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <img src="/logo.png" alt="Company Logo" className="h-8 w-8 mr-3" style={{ objectFit: 'contain' }} />
              <h1 className="text-xl lg:text-2xl font-bold text-gray-800">EVEN View</h1>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {reportData && (
                <button
                  onClick={handleReset}
                  className="px-3 py-2 lg:px-4 lg:py-2 text-sm lg:text-base bg-primary text-white font-semibold rounded-lg shadow-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-200"
                >
                  新規レポート開始
                </button>
              )}
              <button
                onClick={() => setShowAIChat(true)}
                className="px-3 py-2 lg:px-4 lg:py-2 text-sm lg:text-base bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>AIチャット</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* 認証状態の表示 */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ログイン中</p>
                    <p className="font-medium text-gray-800 text-sm lg:text-base">{user.email}</p>
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowBackupModal(true)}
                  className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  バックアップ
                </button>
                {user && (
                  <button
                    onClick={() => syncDataWithFirestore()}
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
            <div className="space-y-4 lg:space-y-6">
              {activeSection === 'dashboard' && (
                <>
                  <div className="grid grid-cols-1 gap-4 lg:gap-6">
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
                  
                  {reportData && (
                    <Dashboard data={reportData} onNewUpload={handleFileProcess} lastFileName={lastFileName} />
                  )}
                </>
              )}

              {activeSection === 'stores' && (
                <StoreManager
                  stores={stores}
                  onStoresChange={setStores}
                />
              )}

              {activeSection === 'upload' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">データアップロード</h2>
                  <FileUpload onFileProcess={handleFileProcess} />
                </div>
              )}

              {activeSection === 'reports' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">レポート</h2>
                  {/* AI要約・グラフ表示 */}
                  {aiReportLoading && <div className="mb-4 text-blue-600">AI要約・グラフを生成中...</div>}
                  {aiReportError && <div className="mb-4 text-red-600">{aiReportError}</div>}
                  {aiReport && (
                    <div className="mb-6 p-4 bg-blue-50 rounded">
                      <h3 className="text-lg font-bold mb-2">AI要約・インサイト・推奨グラフ</h3>
                      {/* summary */}
                      {aiReport.summary && (
                        <div className="mb-2 text-base text-gray-800">
                          <div>月: {aiReport.summary.month}</div>
                          <div>総売上: {aiReport.summary.totalSales?.toLocaleString()}円</div>
                          <div>総客数: {aiReport.summary.totalGuests?.toLocaleString()}人</div>
                          <div>平均客単価: {Math.round(aiReport.summary.avgSpend).toLocaleString()}円</div>
                          <div>売上トップカテゴリ: {aiReport.summary.topCategory}</div>
                        </div>
                      )}
                      {/* insights */}
                      {aiReport.insights && Array.isArray(aiReport.insights) && (
                        <ul className="mb-2 list-disc pl-5 text-gray-700">
                          {aiReport.insights.map((insight: string, idx: number) => (
                            <li key={idx}>{insight}</li>
                          ))}
                        </ul>
                      )}
                      {/* 推奨グラフ */}
                      {aiReport.recommendations && aiReport.recommendations.graph && aiReport.recommendations.graph.type === 'bar' && (
                        <div className="my-4">
                          <h4 className="font-semibold mb-2">{aiReport.recommendations.graph.title || '推奨グラフ'}</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={aiReport.recommendations.graph.series.map((s: any) => ({ name: s.name, 売上: s.data[0] }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="売上" fill="#8884d8" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      {/* JSON開閉式 */}
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-gray-500">AI生データ(JSON)</summary>
                        <pre className="bg-white p-2 rounded text-xs overflow-x-auto" style={{ whiteSpace: 'pre-wrap' }}>{typeof aiReport === 'string' ? aiReport : JSON.stringify(aiReport, null, 2)}</pre>
                      </details>
                    </div>
                  )}
                  {reportData ? (
                    <Dashboard data={reportData} onNewUpload={handleFileProcess} lastFileName={lastFileName} />
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500 mb-4">レポートを表示するには、まずデータをアップロードしてください。</p>
                      <button
                        onClick={() => setActiveSection('upload')}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                      >
                        データをアップロード
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'analytics' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">分析</h2>
                  {/* 売上分析グラフ */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-2">月別売上推移</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={salesByMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="sales" name="売上" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* AI要約・インサイト */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-2">AI要約・インサイト</h3>
                    {aiAnalyticsLoading && <div className="text-blue-600">AI要約・インサイトを生成中...</div>}
                    {aiAnalyticsError && <div className="text-red-600">{aiAnalyticsError}</div>}
                    {aiAnalytics && (
                      <div className="bg-blue-50 p-4 rounded">
                        {aiAnalytics.summary && (
                          <div className="mb-2 text-base text-gray-800">{aiAnalytics.summary}</div>
                        )}
                        {aiAnalytics.insights && Array.isArray(aiAnalytics.insights) && (
                          <ul className="list-disc pl-5 text-gray-700">
                            {aiAnalytics.insights.map((insight: string, idx: number) => (
                              <li key={idx}>{insight}</li>
                            ))}
                          </ul>
                        )}
                        {!aiAnalytics.summary && !aiAnalytics.insights && (
                          <pre className="text-xs text-gray-600">{typeof aiAnalytics === 'string' ? aiAnalytics : JSON.stringify(aiAnalytics, null, 2)}</pre>
                        )}
                      </div>
                    )}
                  </div>
                  {/* トレンド分析は今後拡張 */}
                </div>
              )}

              {activeSection === 'upload' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">データアップロード</h2>
                  <FileUpload onFileProcess={handleFileProcess} />
                </div>
              )}

              {activeSection === 'settings' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">設定</h2>
                  <div className="space-y-6">
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-semibold mb-3">データ管理</h3>
                      <div className="space-y-3">
                        <button
                          onClick={() => setShowBackupModal(true)}
                          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                        >
                          <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                          バックアップ・復元
                        </button>
                        {user && (
                          <button
                            onClick={() => syncDataWithFirestore()}
                            disabled={isSyncing}
                            className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                            {isSyncing ? '同期中...' : 'データ同期'}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-semibold mb-3">アカウント</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{user?.displayName || 'ユーザー'}</p>
                            <p className="text-sm text-gray-500">{user?.email}</p>
                          </div>
                          <button
                            onClick={handleLogout}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                          >
                            ログアウト
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">アプリ情報</h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p>バージョン: 1.0.9</p>
                        <p>最終更新: 2025年7月3日</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      {/* バックアップ・復元モーダル */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 lg:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">データのバックアップ・復元</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">バックアップの作成</h4>
                <p className="text-sm text-gray-600 mb-3">
                  現在のデータをJSONファイルとしてダウンロードします
                </p>
                <button
                  onClick={handleBackupDownload}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm lg:text-base"
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
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm lg:text-base"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理者のみユーザー管理画面を表示 */}
      {isAdmin && showUserManager && (
        <UserManager />
      )}
      {/* 管理者のみクライアント管理画面を表示 */}
      {isAdmin && showClientManager && (
        <ClientManager />
      )}

      {/* AI解析中・プレビューUI */}
      {aiLoading && (
        <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded shadow text-center text-lg text-blue-700">AI解析中...しばらくお待ちください</div>
      )}
      {aiError && (
        <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded shadow text-center text-lg text-red-700">{aiError}</div>
      )}
      {aiPreview && (
        <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded shadow">
          <h3 className="text-xl font-bold mb-2">AI提案内容（集計・可視化案プレビュー）</h3>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto mb-4" style={{ whiteSpace: 'pre-wrap' }}>{aiPreview}</pre>
          <button onClick={handleAiConfirm} className="px-6 py-2 bg-primary text-white rounded font-semibold hover:bg-primary-dark transition">この内容でダッシュボード作成</button>
        </div>
      )}

      {/* AI自動生成ダッシュボード */}
      {aiDashboard && (
        <AIDashboard 
          aiResponse={aiDashboard} 
          onClose={() => setAiDashboard(null)} 
        />
      )}

      {/* AIチャット */}
      {showAIChat && (
        <AIChat
          monthlyData={monthlyData}
          selectedMonths={selectedMonths}
          selectedStores={selectedStores}
          clientId={user?.uid} // ユーザーIDをクライアントIDとして使用
          onClose={() => setShowAIChat(false)}
        />
      )}
    </div>
  );
}

export default App;
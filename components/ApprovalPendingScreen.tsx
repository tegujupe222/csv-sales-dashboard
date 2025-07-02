import React from 'react';

interface ApprovalPendingScreenProps {
  userEmail: string;
  userName: string;
  onLogout: () => void;
}

const ApprovalPendingScreen: React.FC<ApprovalPendingScreenProps> = ({ userEmail, userName, onLogout }) => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md text-center max-w-md">
        <div className="mb-6">
          <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">⏳</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">承認待ちです</h2>
          <p className="text-gray-600">管理者の承認をお待ちください</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">申請情報</h3>
          <div className="text-sm text-blue-700">
            <p><strong>名前:</strong> {userName}</p>
            <p><strong>メール:</strong> {userEmail}</p>
            <p><strong>申請日時:</strong> {new Date().toLocaleString('ja-JP')}</p>
          </div>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">次のステップ</h3>
          <ul className="text-sm text-gray-600 text-left space-y-1">
            <li>• 管理者が申請を確認します</li>
            <li>• 承認されるとメールで通知されます</li>
            <li>• 承認後、アプリケーションにアクセスできます</li>
          </ul>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">管理者への連絡</h3>
          <p className="text-sm text-yellow-700 mb-2">
            承認が遅れている場合は、管理者に直接連絡してください：
          </p>
          <p className="text-sm font-medium text-yellow-800">
            igafactory2023@gmail.com
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            ログアウト
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            状態を更新
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalPendingScreen; 
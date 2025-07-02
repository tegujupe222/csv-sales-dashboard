import React from 'react';

interface RegistrationModalProps {
  userEmail: string;
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ userEmail, userName, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">アカウント登録</h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">以下の情報で登録します：</p>
          <div className="bg-gray-50 p-3 rounded">
            <p><strong>名前:</strong> {userName}</p>
            <p><strong>メール:</strong> {userEmail}</p>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          登録後、管理者の承認が必要です。承認されるまでアプリケーションにアクセスできません。
        </p>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            登録する
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationModal; 
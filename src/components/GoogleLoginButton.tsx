import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../../firebase';


const GoogleLoginButton: React.FC = () => {
  const handleLogin = async () => {
    try {
      if (!auth || !provider) {
        alert('Firebase認証が利用できません。設定を確認してください。');
        return;
      }
      
      const result = await signInWithPopup(auth, provider);
      alert(`ログイン成功: ${result.user.displayName}`);
      // ユーザー登録はApp.tsxで処理される
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/api-key-not-valid') {
        alert('Firebase APIキーが無効です。設定を確認してください。');
      } else if (error.code === 'auth/network-request-failed') {
        alert('ネットワークエラーが発生しました。インターネット接続を確認してください。');
      } else {
        alert('ログイン失敗: ' + (error.message || '不明なエラーが発生しました'));
      }
    }
  };

  // Firebaseが利用できない場合はボタンを無効化
  if (!auth || !provider) {
    return (
      <button
        disabled
        className="w-full lg:w-auto px-6 py-3 lg:py-2 bg-gray-400 text-gray-600 font-semibold rounded-lg cursor-not-allowed text-sm lg:text-base"
      >
        Firebase認証が利用できません
      </button>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="w-full lg:w-auto px-6 py-3 lg:py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-200 text-sm lg:text-base"
    >
      Googleでログイン
    </button>
  );
};

export default GoogleLoginButton; 
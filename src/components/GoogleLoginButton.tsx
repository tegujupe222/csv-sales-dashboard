import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../../firebase';
import { registerUser } from '../../services/userService';

const GoogleLoginButton: React.FC = () => {
  const handleLogin = async () => {
    try {
      if (!auth || !provider) {
        alert('Firebase認証が利用できません。設定を確認してください。');
        return;
      }
      
      const result = await signInWithPopup(auth, provider);
      // Firestoreにユーザー登録
      await registerUser({
        uid: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || ''
      });
      alert(`ログイン成功: ${result.user.displayName}`);
      // 必要ならユーザー情報を状態管理に保存
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
        style={{
          padding: 10,
          background: '#ccc',
          color: '#666',
          border: 'none',
          borderRadius: 4,
          fontWeight: 'bold',
          cursor: 'not-allowed'
        }}
      >
        Firebase認証が利用できません
      </button>
    );
  }

  return (
    <button
      onClick={handleLogin}
      style={{
        padding: 10,
        background: '#4285F4',
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        fontWeight: 'bold',
        cursor: 'pointer'
      }}
    >
      Googleでログイン
    </button>
  );
};

export default GoogleLoginButton; 
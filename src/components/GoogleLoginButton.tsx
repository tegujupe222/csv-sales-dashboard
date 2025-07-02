import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../../firebase';

const GoogleLoginButton: React.FC = () => {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      alert(`ログイン成功: ${result.user.displayName}`);
      // 必要ならユーザー情報を状態管理に保存
    } catch (error) {
      alert('ログイン失敗');
      console.error(error);
    }
  };

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
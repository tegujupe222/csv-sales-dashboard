import React, { useEffect, useState } from 'react';
import { getAllUsers, approveUser, deleteUser, AppUser } from '../services/userService';

const ADMIN_EMAIL = 'igafactory2023@gmail.com';

const AdminDashboard: React.FC<{ currentUserEmail: string | null }> = ({ currentUserEmail }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const users = await getAllUsers();
      setUsers(users);
    } catch (e: any) {
      setError(e.message || 'ユーザー一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (uid: string) => {
    await approveUser(uid);
    fetchUsers();
  };

  const handleDelete = async (uid: string) => {
    if (window.confirm('本当にこのユーザーを削除しますか？')) {
      await deleteUser(uid);
      fetchUsers();
    }
  };

  if (currentUserEmail !== ADMIN_EMAIL) {
    return <div>管理者権限がありません。</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 24 }}>
      <h2>ユーザー管理</h2>
      {loading ? (
        <p>読み込み中...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', padding: 8 }}>名前</th>
              <th style={{ borderBottom: '1px solid #ccc', padding: 8 }}>メール</th>
              <th style={{ borderBottom: '1px solid #ccc', padding: 8 }}>承認</th>
              <th style={{ borderBottom: '1px solid #ccc', padding: 8 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.uid}>
                <td style={{ padding: 8 }}>{user.displayName}</td>
                <td style={{ padding: 8 }}>{user.email}</td>
                <td style={{ padding: 8 }}>{user.approved ? '✔️' : '❌'}</td>
                <td style={{ padding: 8 }}>
                  {!user.approved && (
                    <button onClick={() => handleApprove(user.uid)} style={{ marginRight: 8 }}>承認</button>
                  )}
                  <button onClick={() => handleDelete(user.uid)} style={{ color: 'red' }}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminDashboard; 
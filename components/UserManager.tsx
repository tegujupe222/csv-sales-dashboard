import React, { useEffect, useState } from 'react';
import { getAllUsers, AppUser, getAllClients, assignUserToClient, approveUser } from '../services/userService';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null); // ユーザーごとの保存中状態

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [userList, clientList] = await Promise.all([
          getAllUsers(),
          getAllClients()
        ]);
        setUsers(userList);
        setClients(clientList);
        setError(null);
      } catch (err) {
        setError('ユーザーまたはクライアント一覧の取得に失敗しました');
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleClientChange = async (uid: string, clientId: string) => {
    setSaving(uid);
    try {
      await assignUserToClient(uid, clientId);
      setUsers(users => users.map(u => u.uid === uid ? { ...u, clientId } : u));
      setError(null);
    } catch (err) {
      setError('クライアント割り当てに失敗しました');
    }
    setSaving(null);
  };

  const handleApprove = async (uid: string) => {
    setSaving(uid);
    try {
      await approveUser(uid);
      setUsers(users => users.map(u => u.uid === uid ? { ...u, approved: true } : u));
      setError(null);
    } catch (err) {
      setError('承認に失敗しました');
    }
    setSaving(null);
  };

  const handleRoleChange = async (uid: string, role: string) => {
    setSaving(uid);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role });
      setUsers(users => users.map(u => u.uid === uid ? { ...u, role } : u));
      setError(null);
    } catch (err) {
      setError('ロール変更に失敗しました');
    }
    setSaving(null);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h2>ユーザー管理</h2>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div>読み込み中...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>名前</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>メール</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>承認</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>ロール</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>クライアント割り当て</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.uid}>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{user.displayName}</td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{user.email}</td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>
                  {user.approved ? '✔️' : (
                    <button onClick={() => handleApprove(user.uid)} disabled={saving === user.uid} style={{ padding: '4px 8px' }}>
                      承認
                    </button>
                  )}
                  {saving === user.uid && <span style={{ marginLeft: 8, color: '#888' }}>保存中...</span>}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>
                  <select
                    value={user.role}
                    onChange={e => handleRoleChange(user.uid, e.target.value)}
                    disabled={saving === user.uid}
                    style={{ padding: 4 }}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>
                  <select
                    value={(user as any).clientId || ''}
                    onChange={e => handleClientChange(user.uid, e.target.value)}
                    disabled={saving === user.uid}
                    style={{ padding: 4 }}
                  >
                    <option value="">未割り当て</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                  {saving === user.uid && <span style={{ marginLeft: 8, color: '#888' }}>保存中...</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserManager; 
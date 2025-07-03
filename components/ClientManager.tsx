import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  query,
  orderBy,
  updateDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';

interface Client {
  id: string;
  name: string;
  createdAt: any;
}

const ClientManager: React.FC = () => {
  const [clientName, setClientName] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  // クライアント一覧を取得
  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const clientList: Client[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Client, 'id'>)
        }));
        setClients(clientList);
      } catch (err) {
        setError('クライアント一覧の取得に失敗しました');
      }
      setLoading(false);
    };
    fetchClients();
  }, []);

  // クライアント追加
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clientName.trim() === '') return;
    try {
      const docRef = await addDoc(collection(db, 'clients'), {
        name: clientName,
        createdAt: Timestamp.now(),
      });
      setClients([{ id: docRef.id, name: clientName, createdAt: Timestamp.now() }, ...clients]);
      setClientName('');
      setError(null);
    } catch (err) {
      setError('クライアントの追加に失敗しました');
    }
  };

  // クライアント編集開始
  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setEditingName(client.name);
  };

  // クライアント名保存
  const handleSaveEdit = async (id: string) => {
    setSaving(id);
    try {
      const clientRef = doc(db, 'clients', id);
      await updateDoc(clientRef, { name: editingName });
      setClients(clients => clients.map(c => c.id === id ? { ...c, name: editingName } : c));
      setEditingId(null);
      setEditingName('');
      setError(null);
    } catch (err) {
      setError('クライアント名の更新に失敗しました');
    }
    setSaving(null);
  };

  // クライアント削除
  const handleDelete = async (id: string) => {
    if (!window.confirm('本当に削除しますか？この操作は元に戻せません。')) return;
    setSaving(id);
    try {
      const clientRef = doc(db, 'clients', id);
      await deleteDoc(clientRef);
      setClients(clients => clients.filter(c => c.id !== id));
      setError(null);
    } catch (err) {
      setError('クライアントの削除に失敗しました');
    }
    setSaving(null);
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
      <h2>クライアント管理</h2>
      <form onSubmit={handleAddClient} style={{ marginBottom: 24 }}>
        <input
          type="text"
          value={clientName}
          onChange={e => setClientName(e.target.value)}
          placeholder="新しいクライアント名"
          style={{ padding: 8, width: '70%' }}
        />
        <button type="submit" style={{ padding: 8, marginLeft: 8 }}>
          追加
        </button>
      </form>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      <h3>クライアント一覧</h3>
      {loading ? (
        <div>読み込み中...</div>
      ) : (
        <ul>
          {clients.map((client) => (
            <li key={client.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
              {editingId === client.id ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    style={{ padding: 4, marginRight: 8 }}
                  />
                  <button onClick={() => handleSaveEdit(client.id)} disabled={saving === client.id} style={{ marginRight: 8 }}>
                    保存
                  </button>
                  <button onClick={() => { setEditingId(null); setEditingName(''); }}>
                    キャンセル
                  </button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1 }}>{client.name}</span>
                  <button onClick={() => handleEdit(client)} style={{ marginLeft: 8 }}>
                    編集
                  </button>
                  <button onClick={() => handleDelete(client.id)} disabled={saving === client.id} style={{ marginLeft: 8, color: 'red' }}>
                    削除
                  </button>
                </>
              )}
              {saving === client.id && <span style={{ marginLeft: 8, color: '#888' }}>保存中...</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClientManager; 
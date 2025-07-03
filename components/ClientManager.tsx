import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  query,
  orderBy
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

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 24 }}>
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
            <li key={client.id}>{client.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClientManager; 
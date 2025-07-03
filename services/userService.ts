import { doc, setDoc, getDoc, updateDoc, getDocs, collection, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  approved: boolean;
  role: string; // 'admin' | 'user'
  createdAt: any;
}

// ユーザーをFirestoreに登録（初回ログイン時）
export async function registerUser({ uid, email, displayName }: { uid: string, email: string, displayName: string }) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    // 管理者は自動で承認
    const isAdmin = email === 'igafactory2023@gmail.com';
    await setDoc(userRef, {
      uid,
      email,
      displayName,
      approved: isAdmin,
      role: isAdmin ? 'admin' : 'user',
      createdAt: Timestamp.now()
    });
  }
}

// ユーザー情報を取得
export async function getUser(uid: string): Promise<AppUser | null> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as AppUser;
  }
  return null;
}

// 全ユーザー一覧を取得（管理者用）
export async function getAllUsers(): Promise<AppUser[]> {
  const usersCol = collection(db, 'users');
  const snap = await getDocs(usersCol);
  return snap.docs.map(doc => doc.data() as AppUser);
}

// ユーザーを承認
export async function approveUser(uid: string) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { approved: true });
}

// ユーザーを削除
export async function deleteUser(uid: string) {
  const userRef = doc(db, 'users', uid);
  await deleteDoc(userRef);
}

// ユーザーをクライアントに割り当て
export async function assignUserToClient(uid: string, clientId: string) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { clientId });
}

// クライアント一覧を取得
export async function getAllClients(): Promise<{ id: string; name: string }[]> {
  const clientsCol = collection(db, 'clients');
  const snap = await getDocs(clientsCol);
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as { name: string }) }));
} 
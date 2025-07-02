import { doc, setDoc, getDoc, updateDoc, getDocs, collection, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  approved: boolean;
  createdAt: any;
}

// ユーザーをFirestoreに登録（初回ログイン時）
export async function registerUser({ uid, email, displayName }: { uid: string, email: string, displayName: string }) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid,
      email,
      displayName,
      approved: false,
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
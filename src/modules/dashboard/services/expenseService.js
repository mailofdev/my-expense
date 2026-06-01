import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase';

export const expenseService = {
  async fetchAll(uid) {
    const q = query(
      collection(db, 'users', uid, 'expenses'),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async create(uid, expense) {
    const col = collection(db, 'users', uid, 'expenses');
    const payload = {
      ...expense,
      date: expense.date || new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(col, payload);
    return { id: ref.id, ...expense, date: payload.date };
  },

  async remove(uid, expenseId) {
    await deleteDoc(doc(db, 'users', uid, 'expenses', expenseId));
  },
};

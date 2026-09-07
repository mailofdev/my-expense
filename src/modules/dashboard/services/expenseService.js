import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
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
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || null,
      };
    });
  },

  async create(uid, expense) {
    const col = collection(db, 'users', uid, 'expenses');
    const payload = {
      ...expense,
      date: expense.date || new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(col, payload);
    return {
      id: ref.id,
      ...expense,
      date: payload.date,
      createdAt: new Date().toISOString(),
    };
  },

  async remove(uid, expenseId) {
    await deleteDoc(doc(db, 'users', uid, 'expenses', expenseId));
  },

  async update(uid, expenseId, {
    title,
    amount,
    category,
    subcategory,
    tags,
    date,
    paymentMode,
    accountId,
    split,
  }) {
    const expenseRef = doc(db, 'users', uid, 'expenses', expenseId);
    const updates = { title, amount, category, date, paymentMode };
    if (accountId) updates.accountId = accountId;
    if (subcategory !== undefined) updates.subcategory = subcategory || '';
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
    if (split === null) {
      updates.split = null;
    } else if (split !== undefined) {
      updates.split = split;
    }
    await updateDoc(expenseRef, updates);
    return { id: expenseId, ...updates };
  },
};

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase';
import { userService } from '../../auth/services/userService';

export const walletService = {
  async fetchTransactions(uid, max = 20) {
    const q = query(
      collection(db, 'users', uid, 'walletTransactions'),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() || null,
    }));
  },

  async addFunds(uid, { amount, note }) {
    const profile = await userService.getProfile(uid);
    const newBalance = (profile?.walletBalance || 0) + amount;

    await userService.updateProfile(uid, { walletBalance: newBalance });

    const col = collection(db, 'users', uid, 'walletTransactions');
    const ref = await addDoc(col, {
      type: 'credit',
      amount,
      note: note || 'Added to wallet',
      createdAt: serverTimestamp(),
    });

    return {
      transaction: { id: ref.id, type: 'credit', amount, note },
      walletBalance: newBalance,
    };
  },

  async adjustBalance(uid, delta) {
    const profile = await userService.getProfile(uid);
    const newBalance = (profile?.walletBalance || 0) + delta;
    await userService.updateProfile(uid, { walletBalance: newBalance });
    return newBalance;
  },
};

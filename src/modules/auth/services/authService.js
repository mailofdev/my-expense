import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../../../core/config/firebase';
import { userService } from './userService';

const mapFirebaseUser = (firebaseUser, token, profile = null) => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email,
  displayName:
    profile?.displayName ||
    firebaseUser.displayName ||
    firebaseUser.email?.split('@')[0] ||
    'User',
  token,
  createdAt: profile?.createdAt ?? null,
});

export const authService = {
  async signUp({ email, password, displayName }) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }
    const profile = await userService.createProfile(credential.user.uid, {
      email,
      displayName,
    });
    const token = await credential.user.getIdToken();
    return mapFirebaseUser(credential.user, token, profile);
  },

  async signIn({ email, password }) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await userService.ensureProfile(credential.user.uid, {
      email: credential.user.email,
      displayName: credential.user.displayName,
    });
    const token = await credential.user.getIdToken();
    return mapFirebaseUser(credential.user, token, profile);
  },

  async resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  },

  async signOut() {
    await signOut(auth);
  },

  async refreshToken(firebaseUser) {
    const profile = await userService.ensureProfile(firebaseUser.uid, {
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
    });
    const token = await firebaseUser.getIdToken(true);
    return mapFirebaseUser(firebaseUser, token, profile);
  },
};

export const getFirebaseErrorMessage = (error) => {
  const code = error?.code || '';
  const messages = {
    'auth/email-already-in-use': 'This email is already registered. Try logging in.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return messages[code] || error?.message || 'Something went wrong. Please try again.';
};

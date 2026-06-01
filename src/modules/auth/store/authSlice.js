import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../core/config/firebase';
import { authService, getFirebaseErrorMessage } from '../services/authService';
import { resetDashboard } from '../../dashboard/store/dashboardSlice';
import {
  saveAuthToStorage,
  clearAuthFromStorage,
  getStoredAuth,
} from '../../../core/utils/authStorage';

export const signUp = createAsyncThunk(
  'auth/signUp',
  async (payload, { rejectWithValue }) => {
    try {
      const user = await authService.signUp(payload);
      saveAuthToStorage(user.token, user);
      return user;
    } catch (error) {
      return rejectWithValue(getFirebaseErrorMessage(error));
    }
  }
);

export const signIn = createAsyncThunk(
  'auth/signIn',
  async (payload, { rejectWithValue }) => {
    try {
      const user = await authService.signIn(payload);
      saveAuthToStorage(user.token, user);
      return user;
    } catch (error) {
      return rejectWithValue(getFirebaseErrorMessage(error));
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email }, { rejectWithValue }) => {
    try {
      await authService.resetPassword(email);
      return { email };
    } catch (error) {
      return rejectWithValue(getFirebaseErrorMessage(error));
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      await authService.signOut();
      clearAuthFromStorage();
      dispatch(resetDashboard());
      return null;
    } catch (error) {
      return rejectWithValue(getFirebaseErrorMessage(error));
    }
  }
);

const stored = getStoredAuth();

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: stored.user,
    token: stored.token,
    isAuthenticated: Boolean(stored.token),
    initializing: true,
    loading: false,
    error: null,
    resetEmailSent: false,
  },
  reducers: {
    setAuthUser(state, action) {
      const user = action.payload;
      if (user) {
        state.user = user;
        state.token = user.token;
        state.isAuthenticated = true;
        saveAuthToStorage(user.token, user);
      } else {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        clearAuthFromStorage();
      }
      state.initializing = false;
    },
    clearAuthError(state) {
      state.error = null;
    },
    clearResetStatus(state) {
      state.resetEmailSent = false;
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => {
      state.loading = true;
      state.error = null;
    };
    const rejected = (state, action) => {
      state.loading = false;
      state.error = action.payload;
    };

    builder
      .addCase(signUp.pending, pending)
      .addCase(signUp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(signUp.rejected, rejected)

      .addCase(signIn.pending, pending)
      .addCase(signIn.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(signIn.rejected, rejected)

      .addCase(resetPassword.pending, pending)
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
        state.resetEmailSent = true;
      })
      .addCase(resetPassword.rejected, rejected)

      .addCase(logout.pending, pending)
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(logout.rejected, rejected);
  },
});

export const { setAuthUser, clearAuthError, clearResetStatus } = authSlice.actions;
export default authSlice.reducer;

export const initAuthListener = () => (dispatch) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const user = await authService.refreshToken(firebaseUser);
        dispatch(setAuthUser(user));
      } catch {
        dispatch(setAuthUser(null));
      }
    } else {
      const { token } = getStoredAuth();
      if (!token) {
        dispatch(setAuthUser(null));
      } else {
        dispatch(setAuthUser(null));
      }
    }
  });
};

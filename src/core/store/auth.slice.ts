import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  avatar?: string;
  avatarUrl?: string;
  mustChangePassword?: boolean;
  roles?: { id: string; name: string; slug: string; color?: string }[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  biometricsEnabled: boolean;
  rememberMe: boolean;
  sessionTimeoutMinutes: number;
  themeColor: string; // 'company' | 'blue' | 'green' | 'purple' | 'orange'
  // The live theme pulled from /api/theme (same source the admin panel's
  // Appearance settings write to) — 'company' resolves to these.
  companyTheme: { primary: string; logoUrl: string; appName: string } | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  permissions: [],
  isAuthenticated: false,
  biometricsEnabled: false,
  rememberMe: false,
  sessionTimeoutMinutes: 30,
  themeColor: 'company',
  companyTheme: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string; refreshToken: string; rememberMe: boolean; permissions?: string[] }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.rememberMe = action.payload.rememberMe;
      if (action.payload.permissions) {
        state.permissions = action.payload.permissions;
      }
    },
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.permissions = [];
      state.isAuthenticated = false;
    },
    updateTokens: (
      state,
      action: PayloadAction<{ token: string; refreshToken: string }>
    ) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
    },
    setBiometricsEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricsEnabled = action.payload;
    },
    updateProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setThemeColor: (state, action: PayloadAction<string>) => {
      state.themeColor = action.payload;
    },
    setCompanyTheme: (state, action: PayloadAction<{ primary: string; logoUrl: string; appName: string }>) => {
      state.companyTheme = action.payload;
    },
    clearMustChangePassword: (state) => {
      if (state.user) {
        state.user.mustChangePassword = false;
      }
    }
  }
});

export const { setCredentials, clearCredentials, updateTokens, setBiometricsEnabled, updateProfile, setThemeColor, setCompanyTheme, clearMustChangePassword } = authSlice.actions;
export default authSlice.reducer;

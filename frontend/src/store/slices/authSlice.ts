import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  role: 'ADMIN' | 'CALL_CENTER' | 'TECHNICIAN' | 'WORKSHOP_MANAGER';
  team_id: number | null;
  location_name?: string;
  lat?: number | null;
  lng?: number | null;
  specialization?: string;
  address?: string;
  profile_picture?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: false, // Will be set to true once user is loaded
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    }
  },
});

export const { setCredentials, logout, setUser } = authSlice.actions;
export default authSlice.reducer;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SocialAccount } from '@/lib/api';
import { PlatformKey } from './composerSlice';

export interface AccountState {
  connectedPlatforms: PlatformKey[];
  accounts: SocialAccount[];
  loading: boolean;
}

const initialState: AccountState = {
  connectedPlatforms: [],
  accounts: [],
  loading: true,
};

export const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    setConnectedPlatformsAction: (state, action: PayloadAction<PlatformKey[]>) => {
      state.connectedPlatforms = action.payload;
    },
    setAccountsAction: (state, action: PayloadAction<SocialAccount[]>) => {
      state.accounts = action.payload;
      state.connectedPlatforms = action.payload
        .filter((acc) => acc.isActive !== false)
        .map((acc) => acc.platform.toUpperCase() as PlatformKey);
      state.loading = false;
    },
    setAccountLoadingAction: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const {
  setConnectedPlatformsAction,
  setAccountsAction,
  setAccountLoadingAction,
} = accountSlice.actions;

export default accountSlice.reducer;

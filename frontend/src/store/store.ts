import { configureStore } from '@reduxjs/toolkit';
import composerReducer from './composerSlice';
import accountReducer from './accountSlice';

export const store = configureStore({
  reducer: {
    composer: composerReducer,
    account: accountReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

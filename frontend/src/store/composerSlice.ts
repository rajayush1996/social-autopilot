import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_COMPOSER_PLATFORMS, type PlatformId } from '@/config/platforms';

export type PlatformKey = PlatformId;

export interface ComposerState {
  selectedPlatforms: PlatformKey[];
  topic: string;
  tone: string;
  inputSource: 'PROMPT' | 'URL';
  articleUrl: string;
  emojiDensity: string;
  hashtagCount: string;
  formatStyle: string;
  contentLength: string;
  generatedDrafts: Record<string, string>;
  composerMode: 'SINGLE' | 'RECURRING';
}

const STORAGE_KEY = 'autopilot_composer_state';

const loadPersistedState = (): Partial<ComposerState> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse persisted composer state:', e);
  }
  return {};
};

const initialPersisted = loadPersistedState();

const initialState: ComposerState = {
  selectedPlatforms: initialPersisted.selectedPlatforms || DEFAULT_COMPOSER_PLATFORMS,
  topic: initialPersisted.topic || '',
  tone: initialPersisted.tone || 'ENGAGING',
  inputSource: initialPersisted.inputSource || 'PROMPT',
  articleUrl: initialPersisted.articleUrl || '',
  emojiDensity: initialPersisted.emojiDensity || 'MEDIUM',
  hashtagCount: initialPersisted.hashtagCount || 'MODERATE',
  formatStyle: initialPersisted.formatStyle || 'SINGLE',
  contentLength: initialPersisted.contentLength || 'BALANCED',
  generatedDrafts: initialPersisted.generatedDrafts || {},
  composerMode: initialPersisted.composerMode || 'SINGLE',
};

const saveToLocalStorage = (state: ComposerState) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to persist composer state:', e);
  }
};

export const composerSlice = createSlice({
  name: 'composer',
  initialState,
  reducers: {
    setSelectedPlatforms: (state, action: PayloadAction<PlatformKey[]>) => {
      state.selectedPlatforms = action.payload;
      saveToLocalStorage(state);
    },
    togglePlatformAction: (state, action: PayloadAction<PlatformKey>) => {
      const p = action.payload;
      if (state.selectedPlatforms.includes(p)) {
        state.selectedPlatforms = state.selectedPlatforms.filter(item => item !== p);
      } else {
        state.selectedPlatforms.push(p);
      }
      saveToLocalStorage(state);
    },
    setTopicAction: (state, action: PayloadAction<string>) => {
      state.topic = action.payload;
      saveToLocalStorage(state);
    },
    setToneAction: (state, action: PayloadAction<string>) => {
      state.tone = action.payload;
      saveToLocalStorage(state);
    },
    setInputSourceAction: (state, action: PayloadAction<'PROMPT' | 'URL'>) => {
      state.inputSource = action.payload;
      saveToLocalStorage(state);
    },
    setArticleUrlAction: (state, action: PayloadAction<string>) => {
      state.articleUrl = action.payload;
      saveToLocalStorage(state);
    },
    setEmojiDensityAction: (state, action: PayloadAction<string>) => {
      state.emojiDensity = action.payload;
      saveToLocalStorage(state);
    },
    setHashtagCountAction: (state, action: PayloadAction<string>) => {
      state.hashtagCount = action.payload;
      saveToLocalStorage(state);
    },
    setFormatStyleAction: (state, action: PayloadAction<string>) => {
      state.formatStyle = action.payload;
      saveToLocalStorage(state);
    },
    setContentLengthAction: (state, action: PayloadAction<string>) => {
      state.contentLength = action.payload;
      saveToLocalStorage(state);
    },
    setDraftForPlatformAction: (state, action: PayloadAction<{ platform: PlatformKey; content: string }>) => {
      state.generatedDrafts[action.payload.platform] = action.payload.content;
      saveToLocalStorage(state);
    },
    setAllDraftsAction: (state, action: PayloadAction<Record<string, string>>) => {
      state.generatedDrafts = action.payload;
      saveToLocalStorage(state);
    },
    setComposerModeAction: (state, action: PayloadAction<'SINGLE' | 'RECURRING'>) => {
      state.composerMode = action.payload;
      saveToLocalStorage(state);
    },
    resetDraftsAndInputsAction: (state) => {
      state.topic = '';
      state.articleUrl = '';
      state.generatedDrafts = {};
      saveToLocalStorage(state);
    },
  },
});

export const {
  setSelectedPlatforms,
  togglePlatformAction,
  setTopicAction,
  setToneAction,
  setInputSourceAction,
  setArticleUrlAction,
  setEmojiDensityAction,
  setHashtagCountAction,
  setFormatStyleAction,
  setContentLengthAction,
  setDraftForPlatformAction,
  setAllDraftsAction,
  setComposerModeAction,
  resetDraftsAndInputsAction,
} = composerSlice.actions;

export default composerSlice.reducer;

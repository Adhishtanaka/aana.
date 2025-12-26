import { create } from 'zustand';
import { SearchMode } from '../types/search';

interface SearchStore {
  query: string;
  mode: SearchMode;
  shouldSearch: boolean;
  setQuery: (query: string) => void;
  setMode: (mode: SearchMode) => void;
  clearQuery: () => void;
  executeSearch: () => void;
  resetSearchTrigger: () => void;
  
  switchMode: (mode: SearchMode, prefetchFn?: (query: string, mode: SearchMode) => void) => void;
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  
  query: '',
  mode: 'web',
  shouldSearch: false,
  
  setQuery: (query: string) => 
    set({ query, shouldSearch: false }),
  
  setMode: (mode: SearchMode) => 
    set({ mode }),
  
  clearQuery: () => 
    set({ query: '', shouldSearch: false }),
  
  executeSearch: () => {
    const { query } = get();
    if (query.trim()) {
      set({ shouldSearch: true });
    }
  },
  
  resetSearchTrigger: () => 
    set({ shouldSearch: false }),
  
  switchMode: (newMode: SearchMode, prefetchFn?: (query: string, mode: SearchMode) => void) => {
    const { mode, query } = get();
    if (newMode === mode) return;
    
    set({ mode: newMode });
    if (query.trim() && prefetchFn) {
      prefetchFn(query, newMode);
    }
  },
}));
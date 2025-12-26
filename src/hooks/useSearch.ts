import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchStore } from '../stores/searchStore';
import { 
  useWebSearch, 
  useImagesSearch, 
  useVideosSearch, 
  useShoppingSearch, 
  usePlacesSearch,
  searchKeys 
} from './useSearchQueries';
import { SearchAPI } from '../services/searchApi';
import { SearchMode } from '../types/search';

export const useSearch = () => {
  const {
    query,
    mode,
    shouldSearch,
    setQuery,
    clearQuery,
    executeSearch,
    switchMode: storeSwitchMode,
  } = useSearchStore();

  const queryClient = useQueryClient();
  const webQuery = useWebSearch(query, 1, shouldSearch && mode === 'web' && query.trim().length > 0);
  const imagesQuery = useImagesSearch(query, 10, shouldSearch && mode === 'images' && query.trim().length > 0);
  const videosQuery = useVideosSearch(query, 10, shouldSearch && mode === 'videos' && query.trim().length > 0);
  const shoppingQuery = useShoppingSearch(query, 40, shouldSearch && mode === 'shopping' && query.trim().length > 0);
  const placesQuery = usePlacesSearch(query, 10, shouldSearch && mode === 'places' && query.trim().length > 0);

  const activeQuery = useMemo(() => {
    switch (mode) {
      case 'web':
        return webQuery;
      case 'images':
        return imagesQuery;
      case 'videos':
        return videosQuery;
      case 'shopping':
        return shoppingQuery;
      case 'places':
        return placesQuery;
      default:
        return webQuery;
    }
  }, [mode, webQuery, imagesQuery, videosQuery, shoppingQuery, placesQuery]);

  const prefetchForMode = useCallback((query: string, mode: SearchMode) => {
    if (!query.trim()) return;

    switch (mode) {
      case 'web':
        queryClient.prefetchQuery({
          queryKey: searchKeys.web(query, 1),
          queryFn: () => SearchAPI.searchWeb(query, 1),
          staleTime: 5 * 60 * 1000,
        });
        break;
      case 'images':
        queryClient.prefetchQuery({
          queryKey: searchKeys.images(query, 10),
          queryFn: () => SearchAPI.searchImages(query, 10),
          staleTime: 10 * 60 * 1000,
        });
        break;
      case 'videos':
        queryClient.prefetchQuery({
          queryKey: searchKeys.videos(query, 10),
          queryFn: () => SearchAPI.searchVideos(query, 10),
          staleTime: 10 * 60 * 1000,
        });
        break;
      case 'shopping':
        queryClient.prefetchQuery({
          queryKey: searchKeys.shopping(query, 40),
          queryFn: () => SearchAPI.searchShopping(query, 40),
          staleTime: 15 * 60 * 1000,
        });
        break;
      case 'places':
        queryClient.prefetchQuery({
          queryKey: searchKeys.places(query, 10),
          queryFn: () => SearchAPI.searchPlaces(query, 10),
          staleTime: 30 * 60 * 1000,
        });
        break;
    }
  }, [queryClient]);
  const switchMode = useCallback((newMode: SearchMode) => {
    storeSwitchMode(newMode, prefetchForMode);
  }, [storeSwitchMode, prefetchForMode]);

  const clearResults = useCallback(() => {
    queryClient.removeQueries({ queryKey: searchKeys.all });
    clearQuery();
  }, [queryClient, clearQuery]);

  const hasResults = Boolean(activeQuery.data);
  
  const isEmpty = useMemo(() => {
    if (!activeQuery.data) return false;
    
    switch (mode) {
      case 'web':
        return !(activeQuery.data as any).organic || (activeQuery.data as any).organic.length === 0;
      case 'images':
        return !(activeQuery.data as any).images || (activeQuery.data as any).images.length === 0;
      case 'videos':
        return !(activeQuery.data as any).videos || (activeQuery.data as any).videos.length === 0;
      case 'shopping':
        return !(activeQuery.data as any).shopping || (activeQuery.data as any).shopping.length === 0;
      case 'places':
        return !(activeQuery.data as any).places || (activeQuery.data as any).places.length === 0;
      default:
        return true;
    }
  }, [activeQuery.data, mode]);

  const searchState = {
    query,
    mode,
    loading: activeQuery.isLoading,
    results: activeQuery.data,
    error: activeQuery.isError ? activeQuery.error : null,
  };

  return {
    searchState,
    setQuery,
    switchMode,
    clearResults,
    retrySearch: activeQuery.refetch,
    executeSearch,
    hasResults,
    isEmpty,
    isLoading: activeQuery.isLoading,
    isError: activeQuery.isError,
    error: activeQuery.error,
    data: activeQuery.data,
  };
};
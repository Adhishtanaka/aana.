import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SearchAPI } from '../services/searchApi';
import { SearchMode } from '../types/search';

export const searchKeys = {
  all: ['search'] as const,
  web: (query: string, page: number = 1) => [...searchKeys.all, 'web', query, page] as const,
  images: (query: string, num: number = 10) => [...searchKeys.all, 'images', query, num] as const,
  videos: (query: string, num: number = 10) => [...searchKeys.all, 'videos', query, num] as const,
  shopping: (query: string, num: number = 40) => [...searchKeys.all, 'shopping', query, num] as const,
  places: (query: string, num: number = 10) => [...searchKeys.all, 'places', query, num] as const,
  urlCheck: (url: string) => ['urlCheck', url] as const,
};

export const useWebSearch = (query: string, page: number = 1, enabled: boolean = true) => {
  return useQuery({
    queryKey: searchKeys.web(query, page),
    queryFn: () => SearchAPI.searchWeb(query, page),
    enabled: enabled && query.trim().length > 0,
    staleTime: 5 * 60 * 1000, 
    gcTime: 10 * 60 * 1000, 
  });
};

export const useImagesSearch = (query: string, num: number = 10, enabled: boolean = true) => {
  return useQuery({
    queryKey: searchKeys.images(query, num),
    queryFn: () => SearchAPI.searchImages(query, num),
    enabled: enabled && query.trim().length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000, 
  });
};

export const useVideosSearch = (query: string, num: number = 10, enabled: boolean = true) => {
  return useQuery({
    queryKey: searchKeys.videos(query, num),
    queryFn: () => SearchAPI.searchVideos(query, num),
    enabled: enabled && query.trim().length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000, 
  });
};

export const useShoppingSearch = (query: string, num: number = 40, enabled: boolean = true) => {
  return useQuery({
    queryKey: searchKeys.shopping(query, num),
    queryFn: () => SearchAPI.searchShopping(query, num),
    enabled: enabled && query.trim().length > 0,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

export const usePlacesSearch = (query: string, num: number = 10, enabled: boolean = true) => {
  return useQuery({
    queryKey: searchKeys.places(query, num),
    queryFn: () => SearchAPI.searchPlaces(query, num),
    enabled: enabled && query.trim().length > 0,
    staleTime: 30 * 60 * 1000, 
    gcTime: 2 * 60 * 60 * 1000, 
  });
};

export const useUrlAccessibilityCheck = (url: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: searchKeys.urlCheck(url),
    queryFn: () => SearchAPI.checkUrlAccessibility(url),
    enabled: enabled && url.trim().length > 0,
    staleTime: 5 * 60 * 1000, 
    gcTime: 15 * 60 * 1000, 
    retry: 1, 
  });
};

export const useSearch = (query: string, mode: SearchMode, enabled: boolean = true) => {
  const webQuery = useWebSearch(query, 1, enabled && mode === 'web');
  const imagesQuery = useImagesSearch(query, 10, enabled && mode === 'images');
  const videosQuery = useVideosSearch(query, 10, enabled && mode === 'videos');
  const shoppingQuery = useShoppingSearch(query, 40, enabled && mode === 'shopping');
  const placesQuery = usePlacesSearch(query, 10, enabled && mode === 'places');

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
};

export const useClearSearchCache = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.removeQueries({ queryKey: searchKeys.all });
  };
};

export const usePrefetchSearch = () => {
  const queryClient = useQueryClient();
  
  return {
    prefetchWeb: (query: string, page: number = 1) => {
      queryClient.prefetchQuery({
        queryKey: searchKeys.web(query, page),
        queryFn: () => SearchAPI.searchWeb(query, page),
        staleTime: 5 * 60 * 1000,
      });
    },
    prefetchImages: (query: string, num: number = 10) => {
      queryClient.prefetchQuery({
        queryKey: searchKeys.images(query, num),
        queryFn: () => SearchAPI.searchImages(query, num),
        staleTime: 10 * 60 * 1000,
      });
    },
    prefetchVideos: (query: string, num: number = 10) => {
      queryClient.prefetchQuery({
        queryKey: searchKeys.videos(query, num),
        queryFn: () => SearchAPI.searchVideos(query, num),
        staleTime: 10 * 60 * 1000,
      });
    },
    prefetchShopping: (query: string, num: number = 40) => {
      queryClient.prefetchQuery({
        queryKey: searchKeys.shopping(query, num),
        queryFn: () => SearchAPI.searchShopping(query, num),
        staleTime: 15 * 60 * 1000,
      });
    },
    prefetchPlaces: (query: string, num: number = 10) => {
      queryClient.prefetchQuery({
        queryKey: searchKeys.places(query, num),
        queryFn: () => SearchAPI.searchPlaces(query, num),
        staleTime: 30 * 60 * 1000,
      });
    },
  };
};
export type SearchMode = 'web' | 'images' | 'videos' | 'shopping' | 'places';

export interface SearchState {
  query: string;
  mode: SearchMode;
  loading: boolean;
  results: SearchResults | null;
  error: SearchError | null;
}

export interface SearchError {
  type: 'network' | 'api_limit' | 'forbidden' | 'timeout' | 'unknown' | 'empty_results' | 'token_limit';
  message: string;
  url?: string;
  retryable: boolean;
  suggestion?: string;
}

export interface WebSearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  sitelinks?: Sitelink[];
  attributes?: Record<string, string>;
}

export interface Sitelink {
  title: string;
  link: string;
}

export interface KnowledgeGraph {
  title: string;
  type: string;
  website?: string;
  imageUrl?: string;
  description: string;
  descriptionSource: string;
  descriptionLink: string;
  attributes: Record<string, string>;
}

export interface PeopleAlsoAsk {
  question: string;
  snippet: string;
  title: string;
  link: string;
}

export interface ImageResult {
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  imageWidth: number;
  imageHeight: number;
  source: string;
  domain: string;
  link: string;
  position: number;
}

export interface VideoResult {
  title: string;
  link: string;
  snippet: string;
  imageUrl: string;
  duration: string;
  source: string;
  channel: string;
  date: string;
  position: number;
}

export interface ShoppingResult {
  title: string;
  source: string;
  link: string;
  price: string;
  imageUrl: string;
  position: number;
}

export interface PlaceResult {
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  ratingCount: number;
  category: string;
  phoneNumber?: string;
  website?: string;
  position: number;
}

export interface WebSearchResponse {
  organic: WebSearchResult[];
  knowledgeGraph?: KnowledgeGraph;
  peopleAlsoAsk?: PeopleAlsoAsk[];
  relatedSearches?: Array<{ query: string }>;
}

export interface ImageSearchResponse {
  images: ImageResult[];
}

export interface VideoSearchResponse {
  videos: VideoResult[];
}

export interface ShoppingSearchResponse {
  shopping: ShoppingResult[];
}

export interface PlacesSearchResponse {
  places: PlaceResult[];
}

export type SearchResults = 
  | WebSearchResponse 
  | ImageSearchResponse 
  | VideoSearchResponse 
  | ShoppingSearchResponse 
  | PlacesSearchResponse;
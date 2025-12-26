import axios from 'axios';
import {
  SearchMode,
  WebSearchResponse,
  ImageSearchResponse,
  VideoSearchResponse,
  ShoppingSearchResponse,
  PlacesSearchResponse
} from '../types/search';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export class SearchAPI {

  static async searchWeb(query: string, page: number = 1): Promise<WebSearchResponse> {

    try {
      const response = await axios.post(`${API_BASE_URL}/search/web`, {
        query,
        page
      });
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  static async searchImages(query: string, num: number = 10): Promise<ImageSearchResponse> {

    try {
      const response = await axios.post(`${API_BASE_URL}/search/images`, {
        query,
        num
      });
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  static async searchVideos(query: string, num: number = 10): Promise<VideoSearchResponse> {

    try {
      const response = await axios.post(`${API_BASE_URL}/search/videos`, {
        query,
        num
      });
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  static async searchShopping(query: string, num: number = 40): Promise<ShoppingSearchResponse> {

    try {
      const response = await axios.post(`${API_BASE_URL}/search/shopping`, {
        query,
        num
      });
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  static async searchPlaces(query: string, num: number = 10): Promise<PlacesSearchResponse> {

    try {
      const response = await axios.post(`${API_BASE_URL}/search/places`, {
        query,
        num
      });
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  static async search(query: string, mode: SearchMode): Promise<any> {
    switch (mode) {
      case 'web':
        return this.searchWeb(query);
      case 'images':
        return this.searchImages(query);
      case 'videos':
        return this.searchVideos(query);
      case 'shopping':
        return this.searchShopping(query);
      case 'places':
        return this.searchPlaces(query);
      default:
        throw new Error(`Unknown search mode: ${mode}`);
    }
  }

  static async checkUrlAccessibility(url: string): Promise<{ accessible: boolean; reason: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/check-url`, { url });
      return response.data;
    } catch (error: any) {
      return {
        accessible: false,
        reason: error.response?.data?.detail || 'Failed to check URL accessibility'
      };
    }
  }
}
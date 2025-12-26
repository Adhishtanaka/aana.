import { SearchAPI } from '../services/searchApi';

export type UrlStatus = 'checking' | 'accessible' | 'blocked' | 'error';

export interface UrlCheckResult {
  url: string;
  status: UrlStatus;
  reason?: string;
}

export class UrlChecker {
  private static cache = new Map<string, UrlCheckResult>();
  private static pendingChecks = new Map<string, Promise<UrlCheckResult>>();

  static async checkUrl(url: string): Promise<UrlCheckResult> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }
    if (this.pendingChecks.has(url)) {
      return this.pendingChecks.get(url)!;
    }

    const checkPromise = this.performCheck(url);
    this.pendingChecks.set(url, checkPromise);

    try {
      const result = await checkPromise;
      this.cache.set(url, result);
      return result;
    } finally {
      this.pendingChecks.delete(url);
    }
  }

  private static async performCheck(url: string): Promise<UrlCheckResult> {
    try {
      const result = await SearchAPI.checkUrlAccessibility(url);
      
      if (result.accessible) {
        return {
          url,
          status: 'accessible',
          reason: 'URL is accessible'
        };
      } else {
        const isBlocked = result.reason.includes('403') || 
                         result.reason.toLowerCase().includes('forbidden');
        
        return {
          url,
          status: isBlocked ? 'blocked' : 'error',
          reason: result.reason
        };
      }
    } catch (error: any) {
      return {
        url,
        status: 'error',
        reason: error.message || 'Failed to check URL accessibility'
      };
    }
  }

  static async checkMultipleUrls(urls: string[]): Promise<UrlCheckResult[]> {
    const promises = urls.map(url => this.checkUrl(url));
    return Promise.all(promises);
  }

  static clearCache(url?: string): void {
    if (url) {
      this.cache.delete(url);
    } else {
      this.cache.clear();
    }
  }

  static getCachedResult(url: string): UrlCheckResult | null {
    return this.cache.get(url) || null;
  }
}
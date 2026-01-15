// Unsplash API Service
import { enhanceSearchQuery } from './searchUtils';
import { logger } from '../lib/logger';

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
const API_BASE_URL = 'https://api.unsplash.com';

interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string;
  description: string;
  user: {
    name: string;
    username: string;
  };
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashImage[];
}

/**
 * Search photos on Unsplash
 */
export async function searchUnsplashPhotos(
  query: string,
  options: {
    perPage?: number;
    page?: number;
    orientation?: 'landscape' | 'portrait' | 'squarish';
  } = {}
): Promise<UnsplashImage[]> {
  try {
    const enhancedQuery = enhanceSearchQuery(query);
    logger.log('[Unsplash] Searching for:', enhancedQuery);
    logger.log('[Unsplash] Access Key:', ACCESS_KEY ? 'Set' : 'Missing');

    if (!ACCESS_KEY) {
      console.error('[Unsplash] Access key is missing');
      return [];
    }

    const params = new URLSearchParams({
      query: enhancedQuery,
      per_page: (options.perPage || 20).toString(),
      page: (options.page || 1).toString(),
    });

    if (options.orientation) {
      params.append('orientation', options.orientation);
    }

    const response = await fetch(`${API_BASE_URL}/search/photos?${params}`, {
      headers: {
        'Authorization': `Client-ID ${ACCESS_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
    }

    const data: UnsplashSearchResponse = await response.json();
    logger.log('[Unsplash] Found', data.results.length, 'images');

    return data.results || [];
  } catch (error) {
    console.error('[Unsplash] Error searching photos:', error);
    return [];
  }
}

export interface UnsplashPhotoResult {
  imageUrl: string;
  sourceUrl: string;
  photographer: string;
}

/**
 * Get a random Unsplash photo based on query
 */
export async function getRandomUnsplashPhoto(
  query: string,
  options: { excludeUrls?: string[]; page?: number } = {}
): Promise<UnsplashPhotoResult | null> {
  try {
    const { excludeUrls = [], page = 1 } = options;
    const images = await searchUnsplashPhotos(query, { perPage: 20, page });

    if (images.length === 0) {
      logger.warn('[Unsplash] No images found for query:', query);
      return null;
    }

    // Filter out already used images
    const unusedImages = images.filter(img => !excludeUrls.includes(img.urls.regular));

    if (unusedImages.length === 0) {
      logger.warn('[Unsplash] All images on page', page, 'have been used');
      return null;
    }

    // Get a random image from the unused results
    const randomIndex = Math.floor(Math.random() * unusedImages.length);
    const selectedImage = unusedImages[randomIndex];

    const result: UnsplashPhotoResult = {
      imageUrl: selectedImage.urls.regular,
      sourceUrl: `https://unsplash.com/photos/${selectedImage.id}`,
      photographer: selectedImage.user.name,
      photographerUrl: `https://unsplash.com/@${selectedImage.user.username}`
    };

    logger.log('[Unsplash] Successfully selected image from page', page, ':', result);

    return result;
  } catch (error) {
    console.error('[Unsplash] Error getting random photo:', error);
    return null;
  }
}

/**
 * Get multiple Unsplash photos based on query
 */
export async function getUnsplashPhotos(query: string, count: number = 4): Promise<string[]> {
  try {
    const images = await searchUnsplashPhotos(query, { perPage: count * 2 });

    if (images.length === 0) {
      return [];
    }

    // Shuffle and take the requested number
    const shuffled = images.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    return selected.map(img => img.urls.regular);
  } catch (error) {
    console.error('[Unsplash] Error getting photos:', error);
    return [];
  }
}

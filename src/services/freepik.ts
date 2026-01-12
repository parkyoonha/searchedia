// Freepik API Service
import { enhanceSearchQuery } from './searchUtils';

const API_KEY = import.meta.env.VITE_FREEPIK_API_KEY;
const API_BASE_URL = 'https://api.freepik.com/v1';

interface FreepikResource {
  id: number;
  title: string;
  url: string;
  image: {
    source: {
      url: string;
    };
    type: string;
    orientation: string;
  };
  author: {
    name: string;
    id: string;
  };
}

interface FreepikSearchResponse {
  data: FreepikResource[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface FreepikPhotoResult {
  imageUrl: string;
  sourceUrl: string;
  photographer: string;
  photographerUrl: string;
}

export interface FreepikVideoResult {
  videoUrl: string;
  sourceUrl: string;
  photographer: string;
  photographerUrl: string;
}

/**
 * Search images on Freepik
 */
export async function searchFreepikImages(
  query: string,
  options: {
    perPage?: number;
    page?: number;
  } = {}
): Promise<FreepikResource[]> {
  try {
    const enhancedQuery = enhanceSearchQuery(query);
    console.log('[Freepik] Searching for images:', enhancedQuery);

    if (!API_KEY) {
      console.error('[Freepik] API key is missing');
      return [];
    }

    const params = new URLSearchParams({
      term: enhancedQuery,
      limit: (options.perPage || 20).toString(),
      page: (options.page || 1).toString(),
      order: 'relevance',
    });

    const response = await fetch(`${API_BASE_URL}/resources?${params}`, {
      headers: {
        'x-freepik-api-key': API_KEY,
        'Accept-Language': 'en-US',
      },
    });

    if (!response.ok) {
      throw new Error(`Freepik API error: ${response.status} ${response.statusText}`);
    }

    const data: FreepikSearchResponse = await response.json();
    console.log('[Freepik] Found', data.data.length, 'images');

    return data.data || [];
  } catch (error) {
    console.error('[Freepik] Error searching images:', error);
    return [];
  }
}

/**
 * Get a random Freepik image based on query
 */
export async function getRandomFreepikImage(
  query: string,
  options: { excludeUrls?: string[]; page?: number } = {}
): Promise<FreepikPhotoResult | null> {
  try {
    const { excludeUrls = [], page = 1 } = options;
    const images = await searchFreepikImages(query, { perPage: 20, page });

    if (images.length === 0) {
      console.warn('[Freepik] No images found for query:', query);
      return null;
    }

    // Filter out already used images
    const unusedImages = images.filter(img => !excludeUrls.includes(img.image.source.url));

    if (unusedImages.length === 0) {
      console.warn('[Freepik] All images on page', page, 'have been used');
      return null;
    }

    // Get a random image from the unused results
    const randomIndex = Math.floor(Math.random() * unusedImages.length);
    const selectedImage = unusedImages[randomIndex];

    const result: FreepikPhotoResult = {
      imageUrl: selectedImage.image.source.url,
      sourceUrl: selectedImage.url,
      photographer: selectedImage.author.name,
      photographerUrl: `https://www.freepik.com/author/${selectedImage.author.id}`
    };

    console.log('[Freepik] Successfully selected image:', result);

    return result;
  } catch (error) {
    console.error('[Freepik] Error getting random image:', error);
    return null;
  }
}

/**
 * Search videos on Freepik
 */
export async function searchFreepikVideos(
  query: string,
  options: {
    perPage?: number;
    page?: number;
  } = {}
): Promise<FreepikResource[]> {
  try {
    const enhancedQuery = enhanceSearchQuery(query);
    console.log('[Freepik] Searching for videos:', enhancedQuery);

    if (!API_KEY) {
      console.error('[Freepik] API key is missing');
      return [];
    }

    const params = new URLSearchParams({
      term: enhancedQuery,
      limit: (options.perPage || 20).toString(),
      page: (options.page || 1).toString(),
      order: 'relevance',
      content_type: 'video',
    });

    const response = await fetch(`${API_BASE_URL}/resources?${params}`, {
      headers: {
        'x-freepik-api-key': API_KEY,
        'Accept-Language': 'en-US',
      },
    });

    if (!response.ok) {
      throw new Error(`Freepik Video API error: ${response.status} ${response.statusText}`);
    }

    const data: FreepikSearchResponse = await response.json();
    console.log('[Freepik] Found', data.data.length, 'videos');

    return data.data || [];
  } catch (error) {
    console.error('[Freepik] Error searching videos:', error);
    return [];
  }
}

/**
 * Get a random Freepik video based on query
 */
export async function getRandomFreepikVideo(
  query: string,
  options: { excludeUrls?: string[]; page?: number } = {}
): Promise<FreepikVideoResult | null> {
  try {
    const { excludeUrls = [], page = 1 } = options;
    const videos = await searchFreepikVideos(query, { perPage: 20, page });

    if (videos.length === 0) {
      console.warn('[Freepik] No videos found for query:', query);
      return null;
    }

    // Filter out already used videos
    const unusedVideos = videos.filter(video => !excludeUrls.includes(video.image.source.url));

    if (unusedVideos.length === 0) {
      console.warn('[Freepik] All videos on page', page, 'have been used');
      return null;
    }

    // Get a random video from the unused results
    const randomIndex = Math.floor(Math.random() * unusedVideos.length);
    const selectedVideo = unusedVideos[randomIndex];

    const result: FreepikVideoResult = {
      videoUrl: selectedVideo.image.source.url,
      sourceUrl: selectedVideo.url,
      photographer: selectedVideo.author.name,
      photographerUrl: `https://www.freepik.com/author/${selectedVideo.author.id}`
    };

    console.log('[Freepik] Successfully selected video:', result);

    return result;
  } catch (error) {
    console.error('[Freepik] Error getting random video:', error);
    return null;
  }
}

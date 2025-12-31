// Pixabay API Service
import { enhanceSearchQuery } from './searchUtils';

const API_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
const API_BASE_URL = 'https://pixabay.com/api/';

interface PixabayImage {
  id: number;
  pageURL: string;
  largeImageURL: string;
  webformatURL: string;
  previewURL: string;
  tags: string;
  user: string;
  userImageURL: string;
}

interface PixabayImageSearchResponse {
  total: number;
  totalHits: number;
  hits: PixabayImage[];
}

interface PixabayVideo {
  id: number;
  pageURL: string;
  videos: {
    large: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    medium: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    small: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
  };
  user: string;
  userImageURL: string;
}

interface PixabayVideoSearchResponse {
  total: number;
  totalHits: number;
  hits: PixabayVideo[];
}

export interface PixabayPhotoResult {
  imageUrl: string;
  sourceUrl: string;
  photographer: string;
  photographerUrl: string;
}

export interface PixabayVideoResult {
  videoUrl: string;
  sourceUrl: string;
  photographer: string;
  photographerUrl: string;
}

/**
 * Search images on Pixabay
 */
export async function searchPixabayImages(
  query: string,
  options: {
    perPage?: number;
    page?: number;
  } = {}
): Promise<PixabayImage[]> {
  try {
    const enhancedQuery = enhanceSearchQuery(query);
    console.log('[Pixabay] Searching for images:', enhancedQuery);

    if (!API_KEY) {
      console.error('[Pixabay] API key is missing');
      return [];
    }

    const params = new URLSearchParams({
      key: API_KEY,
      q: enhancedQuery,
      per_page: (options.perPage || 20).toString(),
      page: (options.page || 1).toString(),
      image_type: 'photo',
      safesearch: 'true',
    });

    const response = await fetch(`${API_BASE_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status} ${response.statusText}`);
    }

    const data: PixabayImageSearchResponse = await response.json();
    console.log('[Pixabay] Found', data.hits.length, 'images');

    return data.hits || [];
  } catch (error) {
    console.error('[Pixabay] Error searching images:', error);
    return [];
  }
}

/**
 * Get a random Pixabay image based on query
 */
export async function getRandomPixabayImage(
  query: string,
  options: { excludeUrls?: string[]; page?: number } = {}
): Promise<PixabayPhotoResult | null> {
  try {
    const { excludeUrls = [], page = 1 } = options;
    const images = await searchPixabayImages(query, { perPage: 20, page });

    if (images.length === 0) {
      console.warn('[Pixabay] No images found for query:', query);
      return null;
    }

    // Filter out already used images
    const unusedImages = images.filter(img => !excludeUrls.includes(img.largeImageURL));

    if (unusedImages.length === 0) {
      console.warn('[Pixabay] All images on page', page, 'have been used');
      return null;
    }

    // Get a random image from the unused results
    const randomIndex = Math.floor(Math.random() * unusedImages.length);
    const selectedImage = unusedImages[randomIndex];

    const result: PixabayPhotoResult = {
      imageUrl: selectedImage.largeImageURL,
      sourceUrl: selectedImage.pageURL,
      photographer: selectedImage.user,
      photographerUrl: '' // Pixabay API doesn't provide direct photographer URL
    };

    console.log('[Pixabay] Successfully selected image from page', page, ':', result);

    return result;
  } catch (error) {
    console.error('[Pixabay] Error getting random image:', error);
    return null;
  }
}

/**
 * Search videos on Pixabay
 */
export async function searchPixabayVideos(
  query: string,
  options: {
    perPage?: number;
    page?: number;
  } = {}
): Promise<PixabayVideo[]> {
  try {
    const enhancedQuery = enhanceSearchQuery(query);
    console.log('[Pixabay] Searching for videos:', enhancedQuery);

    if (!API_KEY) {
      console.error('[Pixabay] API key is missing');
      return [];
    }

    const params = new URLSearchParams({
      key: API_KEY,
      q: enhancedQuery,
      per_page: (options.perPage || 20).toString(),
      page: (options.page || 1).toString(),
      video_type: 'all',
      safesearch: 'true',
    });

    const response = await fetch(`${API_BASE_URL}videos/?${params}`);

    if (!response.ok) {
      throw new Error(`Pixabay Video API error: ${response.status} ${response.statusText}`);
    }

    const data: PixabayVideoSearchResponse = await response.json();
    console.log('[Pixabay] Found', data.hits.length, 'videos');

    return data.hits || [];
  } catch (error) {
    console.error('[Pixabay] Error searching videos:', error);
    return [];
  }
}

/**
 * Get a random Pixabay video based on query
 */
export async function getRandomPixabayVideo(
  query: string,
  options: { excludeUrls?: string[]; page?: number } = {}
): Promise<PixabayVideoResult | null> {
  try {
    const { excludeUrls = [], page = 1 } = options;
    const videos = await searchPixabayVideos(query, { perPage: 20, page });

    if (videos.length === 0) {
      console.warn('[Pixabay] No videos found for query:', query);
      return null;
    }

    // Filter out already used videos
    const unusedVideos = videos.filter(video => !excludeUrls.includes(video.videos.large.url));

    if (unusedVideos.length === 0) {
      console.warn('[Pixabay] All videos on page', page, 'have been used');
      return null;
    }

    // Get a random video from the unused results
    const randomIndex = Math.floor(Math.random() * unusedVideos.length);
    const selectedVideo = unusedVideos[randomIndex];

    const result: PixabayVideoResult = {
      videoUrl: selectedVideo.videos.large.url,
      sourceUrl: selectedVideo.pageURL,
      photographer: selectedVideo.user,
      photographerUrl: '' // Pixabay API doesn't provide direct photographer URL
    };

    console.log('[Pixabay] Successfully selected video from page', page, ':', result);

    return result;
  } catch (error) {
    console.error('[Pixabay] Error getting random video:', error);
    return null;
  }
}

// Pexels API Service
import { enhanceSearchQuery } from './searchUtils';
import { logger } from '../lib/logger';

const API_KEY = import.meta.env.VITE_PEXELS_API_KEY;
const API_BASE_URL = 'https://api.pexels.com/v1';
const VIDEO_API_BASE_URL = 'https://api.pexels.com/videos';

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
  };
  alt: string;
  photographer: string;
  photographer_url: string;
  url: string;
}

interface PexelsPhotoSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
}

interface PexelsVideo {
  id: number;
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
  user: {
    name: string;
    url: string;
  };
  url: string;
}

interface PexelsVideoSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  videos: PexelsVideo[];
}

export interface PexelsPhotoResult {
  imageUrl: string;
  sourceUrl: string;
  photographer: string;
  photographerUrl: string;
}

export interface PexelsVideoResult {
  videoUrl: string;
  sourceUrl: string;
  photographer: string;
  photographerUrl: string;
}

/**
 * Search photos on Pexels
 */
export async function searchPexelsPhotos(
  query: string,
  options: {
    perPage?: number;
    page?: number;
  } = {}
): Promise<PexelsPhoto[]> {
  try {
    const enhancedQuery = enhanceSearchQuery(query);
    logger.log('[Pexels] Searching for photos:', enhancedQuery);

    if (!API_KEY) {
      console.error('[Pexels] API key is missing');
      return [];
    }

    const params = new URLSearchParams({
      query: enhancedQuery,
      per_page: (options.perPage || 20).toString(),
      page: (options.page || 1).toString(),
    });

    const response = await fetch(`${API_BASE_URL}/search?${params}`, {
      headers: {
        'Authorization': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
    }

    const data: PexelsPhotoSearchResponse = await response.json();
    logger.log('[Pexels] Found', data.photos.length, 'photos');

    return data.photos || [];
  } catch (error) {
    console.error('[Pexels] Error searching photos:', error);
    return [];
  }
}

/**
 * Get a random Pexels photo based on query
 */
export async function getRandomPexelsPhoto(
  query: string,
  options: { excludeUrls?: string[]; page?: number } = {}
): Promise<PexelsPhotoResult | null> {
  try {
    const { excludeUrls = [], page = 1 } = options;
    const photos = await searchPexelsPhotos(query, { perPage: 20, page });

    if (photos.length === 0) {
      logger.warn('[Pexels] No photos found for query:', query);
      return null;
    }

    // Filter out already used photos
    const unusedPhotos = photos.filter(photo => !excludeUrls.includes(photo.src.medium));

    if (unusedPhotos.length === 0) {
      logger.warn('[Pexels] All photos on page', page, 'have been used');
      return null;
    }

    // Get a random photo from the unused results
    const randomIndex = Math.floor(Math.random() * unusedPhotos.length);
    const selectedPhoto = unusedPhotos[randomIndex];

    const result: PexelsPhotoResult = {
      imageUrl: selectedPhoto.src.medium,
      sourceUrl: selectedPhoto.url,
      photographer: selectedPhoto.photographer,
      photographerUrl: selectedPhoto.photographer_url
    };

    logger.log('[Pexels] Successfully selected photo from page', page, ':', result);

    return result;
  } catch (error) {
    console.error('[Pexels] Error getting random photo:', error);
    return null;
  }
}

/**
 * Search videos on Pexels
 */
export async function searchPexelsVideos(
  query: string,
  options: {
    perPage?: number;
    page?: number;
  } = {}
): Promise<PexelsVideo[]> {
  try {
    const enhancedQuery = enhanceSearchQuery(query);
    logger.log('[Pexels] Searching for videos:', enhancedQuery);

    if (!API_KEY) {
      console.error('[Pexels] API key is missing');
      return [];
    }

    const params = new URLSearchParams({
      query: enhancedQuery,
      per_page: (options.perPage || 20).toString(),
      page: (options.page || 1).toString(),
    });

    const response = await fetch(`${VIDEO_API_BASE_URL}/search?${params}`, {
      headers: {
        'Authorization': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Pexels Video API error: ${response.status} ${response.statusText}`);
    }

    const data: PexelsVideoSearchResponse = await response.json();
    logger.log('[Pexels] Found', data.videos.length, 'videos');

    return data.videos || [];
  } catch (error) {
    console.error('[Pexels] Error searching videos:', error);
    return [];
  }
}

/**
 * Get a random Pexels video based on query
 */
export async function getRandomPexelsVideo(
  query: string,
  options: { excludeUrls?: string[]; page?: number } = {}
): Promise<PexelsVideoResult | null> {
  try {
    const { excludeUrls = [], page = 1 } = options;
    const videos = await searchPexelsVideos(query, { perPage: 20, page });

    if (videos.length === 0) {
      logger.warn('[Pexels] No videos found for query:', query);
      return null;
    }

    // Get video URLs to check against exclusions
    const videosWithUrls = videos.map(video => {
      const videoFile = video.video_files.find(f => f.quality === 'hd') || video.video_files[0];
      return { video, videoUrl: videoFile.link };
    });

    // Filter out already used videos
    const unusedVideos = videosWithUrls.filter(v => !excludeUrls.includes(v.videoUrl));

    if (unusedVideos.length === 0) {
      logger.warn('[Pexels] All videos on page', page, 'have been used');
      return null;
    }

    // Get a random video from the unused results
    const randomIndex = Math.floor(Math.random() * unusedVideos.length);
    const selected = unusedVideos[randomIndex];

    const result: PexelsVideoResult = {
      videoUrl: selected.videoUrl,
      sourceUrl: selected.video.url,
      photographer: selected.video.user.name,
      photographerUrl: selected.video.user.url
    };

    logger.log('[Pexels] Successfully selected video from page', page, ':', result);

    return result;
  } catch (error) {
    console.error('[Pexels] Error getting random video:', error);
    return null;
  }
}

// Shutterstock API Service
import { enhanceSearchQuery } from './searchUtils';

const CLIENT_ID = import.meta.env.VITE_SHUTTERSTOCK_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SHUTTERSTOCK_CLIENT_SECRET;
const API_BASE_URL = 'https://api.shutterstock.com/v2';

interface ShutterstockImage {
  id: string;
  description: string;
  assets: {
    preview: {
      url: string;
    };
    large_thumb: {
      url: string;
    };
  };
  contributor: {
    id: string;
  };
}

interface ShutterstockSearchResponse {
  data: ShutterstockImage[];
  page: number;
  per_page: number;
  total_count: number;
}

/**
 * Get OAuth access token for Shutterstock API
 */
async function getAccessToken(): Promise<string> {
  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

  const response = await fetch('https://api.shutterstock.com/v2/oauth/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      realm: 'customer',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Search images on Shutterstock
 */
export async function searchShutterstockImages(
  query: string,
  options: {
    perPage?: number;
    page?: number;
    imageType?: 'photo' | 'illustration' | 'vector';
    orientation?: 'horizontal' | 'vertical';
  } = {}
): Promise<ShutterstockImage[]> {
  try {
    const enhancedQuery = enhanceSearchQuery(query);
    console.log('[Shutterstock] Searching for images:', enhancedQuery);
    const accessToken = await getAccessToken();

    const params = new URLSearchParams({
      query: enhancedQuery,
      per_page: (options.perPage || 10).toString(),
      page: (options.page || 1).toString(),
    });

    if (options.imageType) {
      params.append('image_type', options.imageType);
    }

    if (options.orientation) {
      params.append('orientation', options.orientation);
    }

    const response = await fetch(`${API_BASE_URL}/images/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Shutterstock API error: ${response.statusText}`);
    }

    const data: ShutterstockSearchResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Shutterstock API error:', error);
    throw error;
  }
}

/**
 * Get a random Shutterstock image based on query
 */
export async function getRandomShutterstockImage(query: string): Promise<string | null> {
  try {
    console.log('[Shutterstock] Fetching image for query:', query);
    console.log('[Shutterstock] Client ID:', CLIENT_ID ? 'Set' : 'Missing');
    console.log('[Shutterstock] Client Secret:', CLIENT_SECRET ? 'Set' : 'Missing');

    const images = await searchShutterstockImages(query, { perPage: 20 });

    if (images.length === 0) {
      console.warn('[Shutterstock] No images found for query:', query);
      return null;
    }

    // Get a random image from the results
    const randomIndex = Math.floor(Math.random() * images.length);
    const selectedImage = images[randomIndex];

    const imageUrl = selectedImage.assets.preview.url || selectedImage.assets.large_thumb.url;
    console.log('[Shutterstock] Successfully fetched image:', imageUrl);

    // Return the preview URL
    return imageUrl;
  } catch (error) {
    console.error('[Shutterstock] Error getting random image:', error);
    return null;
  }
}

/**
 * Get multiple Shutterstock images based on query
 */
export async function getShutterstockImages(query: string, count: number = 4): Promise<string[]> {
  try {
    const images = await searchShutterstockImages(query, { perPage: count * 2 });

    if (images.length === 0) {
      return [];
    }

    // Shuffle and take the requested number
    const shuffled = images.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    return selected.map(img => img.assets.preview.url || img.assets.large_thumb.url);
  } catch (error) {
    console.error('Error getting Shutterstock images:', error);
    return [];
  }
}

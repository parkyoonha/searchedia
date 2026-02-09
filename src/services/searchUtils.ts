/**
 * Utility functions for enhancing stock photo search queries
 */
import { logger } from '../lib/logger';

// Words to skip (filler words, adverbs, adjectives)
const SKIP_WORDS = new Set([
  // Articles, prepositions, conjunctions
  'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'and', 'or', 'while',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'this', 'that', 'these', 'those',
  'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'i', 'you', 'he', 'she', 'it', 'we', 'they',
  // Setting/atmosphere words
  'outdoor', 'indoor', 'outside', 'inside', 'nature', 'landscape', 'background',
  'scene', 'setting', 'environment', 'atmosphere', 'style', 'photo', 'image',
  'modern', 'traditional', 'classic', 'contemporary', 'rustic',
  // Adjectives
  'beautiful', 'happy', 'cheerful', 'bright', 'colorful', 'vibrant', 'lovely',
  'new', 'old', 'big', 'small', 'large', 'little', 'young', 'fresh',
  // Adverbs (ending in -ly)
  'carefully', 'quickly', 'slowly', 'gently', 'softly', 'quietly', 'happily',
  'easily', 'simply', 'really', 'very', 'just', 'also', 'only'
]);

// People words (highest priority)
const PEOPLE_WORDS = new Set([
  'man', 'woman', 'child', 'kid', 'boy', 'girl', 'person', 'people', 'baby',
  'mother', 'father', 'mom', 'dad', 'parent', 'family', 'couple', 'friend',
  'worker', 'chef', 'doctor', 'teacher', 'student', 'customer', 'employee'
]);

// Action words (second priority)
const ACTION_WORDS = new Set([
  'holding', 'carrying', 'wearing', 'climbing', 'sitting', 'standing', 'walking',
  'running', 'reaching', 'grabbing', 'looking', 'eating', 'drinking', 'reading',
  'working', 'playing', 'cooking', 'shopping', 'driving', 'riding', 'swimming',
  'making', 'using', 'opening', 'closing', 'writing', 'typing', 'talking'
]);

/**
 * Extract core keywords from a long phrase (max 3-4 words)
 * Priority: people > action > objects
 */
export function extractCoreKeywords(query: string, maxWords: number = 4): string {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);

  const peopleFound: string[] = [];
  const actionsFound: string[] = [];
  const objectsFound: string[] = [];

  for (const word of words) {
    if (SKIP_WORDS.has(word)) continue;

    if (PEOPLE_WORDS.has(word)) {
      if (!peopleFound.includes(word)) peopleFound.push(word);
    } else if (ACTION_WORDS.has(word)) {
      if (!actionsFound.includes(word)) actionsFound.push(word);
    } else {
      if (!objectsFound.includes(word)) objectsFound.push(word);
    }
  }

  // Combine: people first, then ONE action, then objects
  const result: string[] = [];

  // Add first person
  if (peopleFound.length > 0) result.push(peopleFound[0]);

  // Add first action
  if (actionsFound.length > 0) result.push(actionsFound[0]);

  // Fill remaining with objects
  for (const obj of objectsFound) {
    if (result.length >= maxWords) break;
    result.push(obj);
  }

  return result.join(' ');
}

/**
 * Enhances search query for better results across stock photo sites
 * Extracts core keywords and handles special cases
 */
export function enhanceSearchQuery(query: string): string {
  const lowerQuery = query.toLowerCase();

  // Check for isolated/white background - handle specially
  const hasIsolated = lowerQuery.includes('isolated') || lowerQuery.includes('white background');

  // Extract core keywords (3-4 words max)
  let coreKeywords = extractCoreKeywords(query, hasIsolated ? 3 : 4);

  // Add "isolated" back if needed
  if (hasIsolated && !coreKeywords.includes('isolated')) {
    coreKeywords = coreKeywords + ' isolated';
  }

  console.log('[SearchUtils] Extracted keywords:', { original: query, extracted: coreKeywords });

  return coreKeywords || query;
}


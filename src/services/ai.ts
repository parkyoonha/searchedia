// AI Service with Groq, Gemini, and OpenAI fallback
// Implements caching and free tier optimization
import { logger } from '../lib/logger';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface OptimizedKeywords {
  phrase: string;
  keywords: string[];
  searchQuery: string;
  original: string;
  provider?: string; // Which AI provider was used
  cached?: boolean; // Was this result from cache
}

interface CacheEntry {
  result: OptimizedKeywords;
  timestamp: number;
  hits: number;
}

// In-memory cache
const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 1000;

// Provider usage tracking
let groqCallsToday = 0;
let geminiCallsToday = 0;
let openaiCallsToday = 0;
let lastResetDate = new Date().toDateString();

// Free tier limits (per day)
const GROQ_DAILY_LIMIT = 14400; // Groq: 14,400 requests/day
const GEMINI_DAILY_LIMIT = 1500; // Gemini: 1,500 requests/day

/**
 * Reset daily counters if it's a new day
 */
function resetDailyCounters() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    groqCallsToday = 0;
    geminiCallsToday = 0;
    openaiCallsToday = 0;
    lastResetDate = today;
    logger.log('[AI] 🔄 Daily counters reset');
  }
}

/**
 * Generate cache key from input parameters
 */
function getCacheKey(description: string, word?: string, excludeResult?: string): string {
  return `${description}|${word || ''}|${excludeResult || ''}`;
}

/**
 * Get cached result if available and not expired
 */
function getCached(cacheKey: string): OptimizedKeywords | null {
  const entry = cache.get(cacheKey);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_DURATION) {
    cache.delete(cacheKey);
    return null;
  }

  entry.hits++;
  logger.log(`[AI] ✅ Cache hit! (${entry.hits} hits, age: ${Math.round(age / 1000 / 60)}min)`);

  return {
    ...entry.result,
    cached: true
  };
}

/**
 * Save result to cache
 */
function saveToCache(cacheKey: string, result: OptimizedKeywords) {
  // Limit cache size
  if (cache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }

  cache.set(cacheKey, {
    result,
    timestamp: Date.now(),
    hits: 0
  });

  logger.log(`[AI] 💾 Cached result (cache size: ${cache.size})`);
}

/**
 * Build the prompt for keyword optimization
 */
function buildPrompt(description: string, word?: string, excludeResult?: string): string {
  const variations = [
    'Think of a unique angle or moment',
    'Imagine a different scenario',
    'Consider an alternative situation',
    'Visualize another perspective',
    'Create a fresh interpretation'
  ];
  const randomHint = variations[Math.floor(Math.random() * variations.length)];

  const excludeInstruction = excludeResult
    ? `\nDO NOT REPEAT THIS: "${excludeResult}"\nGenerate a COMPLETELY DIFFERENT variation!\n`
    : '';

  return `Convert to SPECIFIC VISUAL SCENE keywords for stock photos:
"${description}"${word ? ` (Main subject: ${word})` : ''}
${excludeInstruction}
CRITICAL INSTRUCTION: ${randomHint}!
- Identify the MAIN NOUNS (child, bag, woman, etc.) from the description
- IGNORE specific VERBS (buy, want, love, etc.) - they are too restrictive
- Create a COMPLETE VISUAL SCENE with action, not just noun lists
- Think: "What is ONE specific moment involving [subject] + [object]?"
- ALWAYS include WHO is doing WHAT with the object

RULES:
1. Describe concrete actions, objects, settings, and atmosphere
2. Include people ONLY if mentioned (I, my, person, woman, man, child, etc.)
3. IMPORTANT: When people are mentioned, PUT PEOPLE KEYWORDS FIRST (woman, man, child, person, customer, etc.) - this ensures images with people appear first in search results
4. If description has "isolated", "white background", "plain background", "cutout", or "no background" → Product photography style (isolated object on white background, studio shot, clean backdrop)
5. Avoid abstract words (purchase, emotion, feeling, concept)
6. DO NOT add adjectives NOT mentioned in description (colorful, bright, vibrant, beautiful, happy, cheerful, etc.) - these distract search results
7. Use ONLY what is explicitly stated or clearly implied

Examples showing COMPLETE VISUAL SCENES (not just noun lists):

"a child want to buy a bag"
  Thought: Main nouns = CHILD + BAG. Ignore "buy/want". Create any scene with child + bag.
  OUTPUT 1: child wearing backpack carrying schoolbag kid with bag on shoulder
  OUTPUT 2: child opening bag looking inside backpack kid exploring bag contents
  OUTPUT 3: child holding bag showing handbag happy kid with new bag
  OUTPUT 4: child packing bag preparing backpack kid organizing school bag

"I want to buy a new bag"
  Thought: Main nouns = WOMAN + BAG. Ignore "buy/want". Create any scene with woman + bag.
  OUTPUT 1: woman carrying leather bag walking with handbag shoulder bag
  OUTPUT 2: woman packing handbag organizing bag contents preparing purse
  OUTPUT 3: woman holding shopping bag retail customer with new bag

⚠️ CRITICAL: NEVER output just "child bag" or "woman bag" - ALWAYS include ACTION!
⚠️ The verb (buy, want, love) is just a HINT. Create ANY complete scene with the nouns!

YOUR OUTPUT MUST BE: [person] [action verb] [object] [details] [setting]
Example format: "child wearing backpack carrying schoolbag kid with bag on shoulder"

Return ONLY ONE set of keywords (space-separated):`;
}

/**
 * Call Groq API
 */
async function callGroq(prompt: string): Promise<string | null> {
  try {
    if (!GROQ_API_KEY) {
      logger.log('[AI] ⚠️ Groq API key not configured');
      return null;
    }

    resetDailyCounters();

    if (groqCallsToday >= GROQ_DAILY_LIMIT) {
      logger.log('[AI] ⚠️ Groq daily limit reached');
      return null;
    }

    logger.log(`[AI] 🚀 Calling Groq (${groqCallsToday + 1}/${GROQ_DAILY_LIMIT} today)...`);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // Fast and free on Groq
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating diverse visual scene descriptions for stock photo searches. ALWAYS describe a complete action scene, never just list nouns. Output only the keyword phrase.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.9,
        top_p: 0.95,
        max_tokens: 80,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[AI] Groq API error:', error);
      return null;
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content?.trim() || '';

    if (result) {
      groqCallsToday++;
      logger.log('[AI] ✅ Groq success');
    }

    return result;
  } catch (error) {
    console.error('[AI] Groq error:', error);
    return null;
  }
}

/**
 * Call Gemini API
 */
async function callGemini(prompt: string): Promise<string | null> {
  try {
    if (!GEMINI_API_KEY) {
      logger.log('[AI] ⚠️ Gemini API key not configured');
      return null;
    }

    resetDailyCounters();

    if (geminiCallsToday >= GEMINI_DAILY_LIMIT) {
      logger.log('[AI] ⚠️ Gemini daily limit reached');
      return null;
    }

    logger.log(`[AI] 🚀 Calling Gemini (${geminiCallsToday + 1}/${GEMINI_DAILY_LIMIT} today)...`);

    const systemInstruction = 'You are an expert at creating diverse visual scene descriptions for stock photo searches. ALWAYS describe a complete action scene, never just list nouns. Output only the keyword phrase.';

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemInstruction}\n\n${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          maxOutputTokens: 80,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[AI] Gemini API error:', error);
      return null;
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (result) {
      geminiCallsToday++;
      logger.log('[AI] ✅ Gemini success');
    }

    return result;
  } catch (error) {
    console.error('[AI] Gemini error:', error);
    return null;
  }
}

/**
 * Call OpenAI API (fallback)
 */
async function callOpenAI(prompt: string): Promise<string | null> {
  try {
    if (!OPENAI_API_KEY) {
      logger.log('[AI] ⚠️ OpenAI API key not configured');
      return null;
    }

    logger.log('[AI] 🚀 Calling OpenAI (fallback)...');

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating diverse visual scene descriptions for stock photo searches. ALWAYS describe a complete action scene, never just list nouns. Output only the keyword phrase.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.9,
        top_p: 0.95,
        max_tokens: 80,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[AI] OpenAI API error:', error);
      return null;
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content?.trim() || '';

    if (result) {
      openaiCallsToday++;
      logger.log('[AI] ✅ OpenAI success');
    }

    return result;
  } catch (error) {
    console.error('[AI] OpenAI error:', error);
    return null;
  }
}

/**
 * Optimize description for image search using AI with fallback
 * Priority: Cache → Groq → Gemini → OpenAI
 */
export async function optimizeKeywordsWithAI(
  description: string,
  word?: string,
  excludeResult?: string
): Promise<OptimizedKeywords | null> {
  try {
    logger.log('[AI] 🔍 Starting optimization:', {
      description,
      word,
      excluding: excludeResult || 'none'
    });

    // Check cache first
    const cacheKey = getCacheKey(description, word, excludeResult);
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }

    // Build prompt
    const prompt = buildPrompt(description, word, excludeResult);

    // Try providers in order: Groq → Gemini → OpenAI
    let phrase: string | null = null;
    let provider = '';

    // Try Groq first (free tier: 14,400 requests/day)
    phrase = await callGroq(prompt);
    if (phrase) {
      provider = 'Groq';
    }

    // Fallback to Gemini
    if (!phrase) {
      phrase = await callGemini(prompt);
      if (phrase) {
        provider = 'Gemini';
      }
    }

    // Fallback to OpenAI
    if (!phrase) {
      phrase = await callOpenAI(prompt);
      if (phrase) {
        provider = 'OpenAI';
      }
    }

    if (!phrase) {
      console.error('[AI] ❌ All providers failed');
      return null;
    }

    // Convert phrase to individual keywords
    const keywords = phrase
      .split(/[,\s]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    // Create search query (space-separated for stock sites)
    const searchQuery = keywords.join(' ');

    const result: OptimizedKeywords = {
      phrase,
      keywords,
      searchQuery,
      original: description,
      provider,
      cached: false
    };

    // Save to cache
    saveToCache(cacheKey, result);

    logger.log('[AI] ✅ Optimization complete:', {
      provider,
      original: description,
      phrase,
      keywords: keywords,
      searchQuery: searchQuery,
      groqCallsToday,
      geminiCallsToday,
      openaiCallsToday
    });

    return result;
  } catch (error) {
    console.error('[AI] Error optimizing keywords:', error);
    return null;
  }
}

/**
 * Get current usage statistics
 */
export function getUsageStats() {
  resetDailyCounters();
  return {
    groq: {
      used: groqCallsToday,
      limit: GROQ_DAILY_LIMIT,
      percentage: (groqCallsToday / GROQ_DAILY_LIMIT * 100).toFixed(1)
    },
    gemini: {
      used: geminiCallsToday,
      limit: GEMINI_DAILY_LIMIT,
      percentage: (geminiCallsToday / GEMINI_DAILY_LIMIT * 100).toFixed(1)
    },
    openai: {
      used: openaiCallsToday
    },
    cache: {
      size: cache.size,
      maxSize: MAX_CACHE_SIZE
    }
  };
}

/**
 * Clear cache manually
 */
export function clearCache() {
  cache.clear();
  logger.log('[AI] 🗑️ Cache cleared');
}

/**
 * Check if any AI provider is configured
 */
export function isAIConfigured(): boolean {
  return !!(GROQ_API_KEY || GEMINI_API_KEY || OPENAI_API_KEY);
}

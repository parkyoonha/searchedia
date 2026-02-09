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
  const randomSeed = Math.floor(Math.random() * 10000);

  // Level 1: Random scene (first generation)
  // Level 2+: Increasingly creative scenes (regeneration)
  const isRegeneration = !!excludeResult;

  // Common themes pool used for both first-gen and regen
  const themes = [
    'everyday/casual', 'holiday/seasonal', 'professional/work', 'family/home', 'romantic',
    'outdoor/nature', 'hobby/craft', 'repair/DIY', 'celebration/party',
    'teaching/learning', 'travel/adventure', 'relaxation', 'childhood',
    'sports/fitness', 'cooking/food', 'morning routine', 'weekend activity'
  ];

  if (!isRegeneration) {
    // LEVEL 1: Generate a RANDOM scene
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    const mainSubject = word || description.split(' ').slice(-1)[0];

    return `Convert to stock photo keywords (seed: ${randomSeed}):
"${description}"${word ? ` (Subject: ${word})` : ''}

Generate a "${randomTheme}" themed scene that includes "${mainSubject}".
Be creative and varied - do NOT always pick the most obvious scene.

Examples for "tree" (notice "tree" is always included):
- everyday: man climbing tree
- holiday: family decorating christmas tree
- relaxation: woman reading under tree
- childhood: kids playing in tree
- romantic: couple sitting under tree

Examples for "coffee" (notice "coffee" is always included):
- everyday: woman drinking coffee
- work: barista making coffee
- romantic: couple sharing coffee
- relaxation: man reading with coffee

RULES:
1. The subject "${mainSubject}" MUST appear in your answer
2. Person first if mentioned (man, woman, child)
3. Simple action verb
4. Keep it SHORT (3-6 words)

Return ONLY keywords (space-separated):`;
  } else {
    // LEVEL 2+: Generate creative scene with different theme
    const themes = [
      'holiday/seasonal', 'professional/work', 'family/home', 'romantic',
      'outdoor/nature', 'hobby/craft', 'repair/DIY', 'celebration/party',
      'teaching/learning', 'travel/adventure', 'relaxation', 'childhood'
    ];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];

    const mainSubject = word || description.split(' ').slice(-1)[0];

    return `Stock photo keywords (seed: ${randomSeed}):
"${description}"${word ? ` (Subject: ${word})` : ''}

⛔ ALREADY USED: "${excludeResult}"

⚠️ CRITICAL: You MUST include "${mainSubject}" in your output!

Generate a "${randomTheme}" themed scene that includes "${mainSubject}".

Examples for "tree" (notice "tree" is always included):
- basic: man climbing tree
- holiday: family decorating christmas tree
- relaxation: woman reading under tree
- childhood: kids playing in tree
- romantic: couple sitting under tree

Examples for "coffee" (notice "coffee" is always included):
- basic: woman drinking coffee
- work: barista making coffee
- romantic: couple sharing coffee
- relaxation: man reading with coffee

The subject "${mainSubject}" MUST appear in your answer!

Return keywords:`;
  }
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

    // Check cache first (skip cache for first generation to ensure randomness)
    const cacheKey = getCacheKey(description, word, excludeResult);
    if (excludeResult) {
      const cached = getCached(cacheKey);
      if (cached) {
        return cached;
      }
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

    // OpenAI fallback disabled - only use free APIs (Groq, Gemini)
    if (!phrase) {
      console.error('[AI] ❌ Free API limits reached (Groq: 14,400/day, Gemini: 1,500/day). AI disabled.');
      return null;
    }

    // Remove quotes and clean up phrase
    const cleanPhrase = phrase.replace(/^["']|["']$/g, '').replace(/["']/g, '').trim();

    // Convert phrase to individual keywords
    const keywords = cleanPhrase
      .split(/[,\s]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    // Create search query (space-separated for stock sites)
    const searchQuery = keywords.join(' ');

    const result: OptimizedKeywords = {
      phrase: cleanPhrase,
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
  return !!(GROQ_API_KEY || GEMINI_API_KEY);
}

/**
 * Check if free AI APIs are still available (not reached daily limit)
 */
export function isFreeAIAvailable(): boolean {
  resetDailyCounters();
  const groqAvailable = GROQ_API_KEY && groqCallsToday < GROQ_DAILY_LIMIT;
  const geminiAvailable = GEMINI_API_KEY && geminiCallsToday < GEMINI_DAILY_LIMIT;
  return !!(groqAvailable || geminiAvailable);
}

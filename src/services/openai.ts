// OpenAI API Service for Keyword Optimization
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

export interface OptimizedKeywords {
  phrase: string; // Human-readable description
  keywords: string[]; // Individual keywords for stock sites
  searchQuery: string; // Comma-separated keywords for search
  original: string;
}

/**
 * Optimize description for image search using GPT-4o-mini
 */
export async function optimizeKeywordsWithAI(
  description: string,
  word?: string,
  excludeResult?: string
): Promise<OptimizedKeywords | null> {
  try {
    // Add random element to force different variations each time
    const variations = [
      'Think of a unique angle or moment',
      'Imagine a different scenario',
      'Consider an alternative situation',
      'Visualize another perspective',
      'Create a fresh interpretation'
    ];
    const randomHint = variations[Math.floor(Math.random() * variations.length)];

    console.log('[OpenAI] 🔍 Starting optimization:', {
      description,
      word,
      hint: randomHint,
      excluding: excludeResult || 'none'
    });

    if (!API_KEY) {
      console.error('[OpenAI] ❌ API key is missing');
      return null;
    }

    const excludeInstruction = excludeResult
      ? `\nDO NOT REPEAT THIS: "${excludeResult}"\nGenerate a COMPLETELY DIFFERENT variation!\n`
      : '';

    const prompt = `Convert to SPECIFIC VISUAL SCENE keywords for stock photos:
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

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
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
      console.error('[OpenAI] API error:', error);
      return null;
    }

    const data = await response.json();
    const phrase = data.choices[0]?.message?.content?.trim() || '';

    if (!phrase) {
      console.error('[OpenAI] Empty response');
      return null;
    }

    // Convert phrase to individual keywords
    // "child hugging mother, family affection" → ["child", "hugging", "mother", "family", "affection"]
    const keywords = phrase
      .split(/[,\s]+/) // Split by comma or space
      .map(k => k.trim())
      .filter(k => k.length > 0);

    // Create search query (space-separated for stock sites)
    const searchQuery = keywords.join(' ');

    console.log('[OpenAI] ✅ Optimization complete:', {
      original: description,
      phrase,
      keywords: keywords,
      searchQuery: searchQuery,
      searchQueryLength: searchQuery.length,
      keywordCount: keywords.length
    });

    return {
      phrase,
      keywords,
      searchQuery,
      original: description,
    };
  } catch (error) {
    console.error('[OpenAI] Error optimizing keywords:', error);
    return null;
  }
}

/**
 * Check if OpenAI API is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!API_KEY;
}

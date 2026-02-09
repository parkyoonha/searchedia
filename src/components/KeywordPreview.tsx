import React, { useState, useEffect, useRef } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sparkles, Plus, Wand2, Loader2, Edit3, Check, RefreshCw, Crop, X } from 'lucide-react';
import { optimizeKeywordsWithAI, isAIConfigured } from '../services/ai';
import { logger } from '../lib/logger';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

// AI usage tracking - temporarily unlimited
const AI_DAILY_LIMIT = 99999;
const AI_USAGE_KEY = 'ai_usage_data';

interface AIUsageData {
  count: number;
  date: string;
}

function getAIUsageData(): AIUsageData {
  const stored = localStorage.getItem(AI_USAGE_KEY);
  if (!stored) return { count: 0, date: new Date().toDateString() };

  const data: AIUsageData = JSON.parse(stored);
  const today = new Date().toDateString();

  // Reset if it's a new day
  if (data.date !== today) {
    return { count: 0, date: today };
  }

  return data;
}

function incrementAIUsage(): boolean {
  const data = getAIUsageData();

  if (data.count >= AI_DAILY_LIMIT) {
    return false; // Limit reached
  }

  data.count += 1;
  localStorage.setItem(AI_USAGE_KEY, JSON.stringify(data));
  return true;
}

function checkAIUsageLimit(): { allowed: boolean; remaining: number } {
  const data = getAIUsageData();
  return {
    allowed: data.count < AI_DAILY_LIMIT,
    remaining: AI_DAILY_LIMIT - data.count
  };
}

interface KeywordPreviewProps {
  text: string;
  word: string;
  existingKeywords?: string; // Pre-generated keywords to prevent re-generation
  enableAI?: boolean; // Enable/disable AI optimization (default: false)
  isolatedBackground?: boolean; // Isolated background mode
  onAddKeyword?: (keyword: string) => void;
  onAddAllKeywords?: (keywords: string[]) => void;
  onKeywordsGenerated?: (keywords: string) => void; // Called when AI generates keywords
  onRegenerateImage?: () => void; // Called when regenerating context to also regenerate image
  onIsolatedBackgroundChange?: (value: boolean) => void; // Called when isolated background toggle changes
  onModeChange?: (enabled: boolean) => void; // Called when AI mode is toggled
}

// Korean to English keyword mapping
const keywordMapping: Record<string, string[]> = {
  '우울': ['sad', 'melancholy', 'gloomy', 'depressed'],
  '행복': ['happy', 'joyful', 'cheerful', 'delighted'],
  '날씨': ['weather', 'sky', 'atmosphere'],
  '비': ['rain', 'rainy', 'rainfall', 'drizzle'],
  '맑': ['clear', 'sunny', 'bright'],
  '구름': ['cloud', 'cloudy', 'overcast'],
  '혼자': ['alone', 'lonely', 'solitary', 'solo'],
  '걷': ['walk', 'walking', 'stroll'],
  '뛰': ['run', 'running', 'jog'],
  '사람': ['person', 'people', 'human'],
  '도시': ['city', 'urban', 'downtown'],
  '자연': ['nature', 'natural', 'outdoor'],
  '숲': ['forest', 'woods', 'tree'],
  '바다': ['sea', 'ocean', 'beach'],
  '산': ['mountain', 'hill', 'peak'],
  '강': ['river', 'stream'],
  '밤': ['night', 'evening', 'dark'],
  '낮': ['day', 'daytime', 'noon'],
  '아침': ['morning', 'dawn', 'sunrise'],
  '저녁': ['evening', 'sunset', 'dusk'],
  '겨울': ['winter', 'cold', 'snow'],
  '여름': ['summer', 'hot', 'warm'],
  '봄': ['spring', 'blossom', 'bloom'],
  '가을': ['autumn', 'fall', 'foliage'],
  '꽃': ['flower', 'blossom', 'bloom'],
  '나무': ['tree', 'wood', 'forest'],
  '하늘': ['sky', 'heaven', 'clouds'],
  '별': ['star', 'starry', 'constellation'],
  '달': ['moon', 'lunar', 'crescent'],
  '태양': ['sun', 'solar', 'sunshine'],
};

function extractKeywords(text: string, word: string) {
  const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'with', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'for', 'of', 'my', '이', '가', '을', '를', '에', '의', '는', '한', '하는', '있는', '그', '그것', '저', '것']);
  const words = (text || '').toLowerCase()
    .replace(/[^\w\s\uAC00-\uD7AF]/g, '') // Keep Korean characters
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w));

  const uniqueWords = Array.from(new Set(words)); // No limit!
  if (word && !uniqueWords.includes(word.toLowerCase())) {
    uniqueWords.unshift(word.toLowerCase());
  }

  return uniqueWords;
}

function suggestEnglishKeywords(koreanText: string): string[] {
  const suggestions: string[] = [];

  // Check each mapping
  for (const [korean, english] of Object.entries(keywordMapping)) {
    if (koreanText.includes(korean)) {
      // Add ALL suggestions from each matched category (no limit)
      suggestions.push(...english);
    }
  }

  // Remove duplicates only (no limit on count)
  return Array.from(new Set(suggestions));
}

export function KeywordPreview({ text, word, existingKeywords, enableAI = false, isolatedBackground = false, onAddKeyword, onAddAllKeywords, onKeywordsGenerated, onRegenerateImage, onIsolatedBackgroundChange, onModeChange }: KeywordPreviewProps) {
  const [aiOptimized, setAiOptimized] = useState<string>(existingKeywords || '');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuery, setEditedQuery] = useState(existingKeywords || '');
  const [mode, setMode] = useState<'ai' | 'manual'>('manual'); // Default to manual
  const [lastProcessedText, setLastProcessedText] = useState<string>('');
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const addKeywordInputRef = useRef<HTMLInputElement>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const keywordContainerRef = useRef<HTMLDivElement>(null);
  const [savedKeywordsBeforeIsolatedBg, setSavedKeywordsBeforeIsolatedBg] = useState<string>(''); // Store keywords before isolated bg
  const [previousResults, setPreviousResults] = useState<string[]>([]); // Track all previous results

  const extractedKeywords = extractKeywords(text, word);

  // Close delete button when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (keywordContainerRef.current && !keywordContainerRef.current.contains(event.target as Node)) {
        setSelectedKeyword(null);
      }
    };

    if (selectedKeyword) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [selectedKeyword]);
  const hasKorean = /[\uAC00-\uD7AF]/.test(text);
  const suggestions = hasKorean ? suggestEnglishKeywords(text) : [];
  const hasAI = isAIConfigured();

  // Sync mode with enableAI prop
  useEffect(() => {
    const expectedMode = enableAI ? 'ai' : 'manual';
    if (mode !== expectedMode) {
      setMode(expectedMode);
    }
  }, [enableAI]);

  // Initialize with existing keywords on first load and sync external updates
  useEffect(() => {
    if (existingKeywords) {
      // Update if this is first load OR if keywords changed externally (from bulk update)
      if (!lastProcessedText || existingKeywords !== aiOptimized) {
        setAiOptimized(existingKeywords);
        setEditedQuery(existingKeywords);
        if (!lastProcessedText) {
          setLastProcessedText(`${text}-${word}`);
        }
      }
    }
  }, [existingKeywords, text, word]);

  // Handle enableAI changes - switch between AI and manual mode
  useEffect(() => {
    if (!enableAI) {
      // AI is disabled, switch to manual mode
      setMode('manual');

      // Don't overwrite keywords if isolated background is active
      if (isolatedBackground) {
        logger.log('[KeywordPreview] AI disabled but isolated background is active, preserving keywords');
        return;
      }

      if (text || word) {
        // Use manual extraction
        const manualKeywords = extractedKeywords.join(' ');
        logger.log('[KeywordPreview] AI disabled, using manual extraction:', manualKeywords);
        setAiOptimized(manualKeywords);
        setEditedQuery(manualKeywords);
        onKeywordsGenerated?.(manualKeywords);
        setLastProcessedText(`${text}-${word}-manual`);
      }
    } else if (enableAI && (text || word) && hasAI) {
      // AI is re-enabled, switch back to AI mode and immediately regenerate keywords
      setMode('ai');
      const wasManual = lastProcessedText.includes('-manual');

      if (wasManual || !aiOptimized) {
        logger.log('[KeywordPreview] AI re-enabled, regenerating keywords immediately');
        setIsOptimizing(true);

        // Immediately generate AI keywords
        optimizeKeywordsWithAI(text, word).then(result => {
          if (result && enableAI) { // Double-check enableAI is still true
            setAiOptimized(result.searchQuery);
            setEditedQuery(result.searchQuery);
            setLastProcessedText(`${text}-${word}`);
            onKeywordsGenerated?.(result.searchQuery);
            logger.log('[KeywordPreview] Regenerated AI keywords:', result.searchQuery);
          }
          setIsOptimizing(false);
        }).catch(error => {
          console.error('[KeywordPreview] Failed to regenerate keywords:', error);
          setIsOptimizing(false);
        });
      }
    }
  }, [enableAI, text, word, hasAI, isolatedBackground]);

  // Auto-optimize when text changes (debounced)
  useEffect(() => {
    // Don't run if AI is disabled
    if (!enableAI) {
      return;
    }

    // If we have existing keywords and we haven't processed anything yet,
    // let the other useEffect handle it by setting the lastProcessedText.
    if (existingKeywords && !lastProcessedText) {
      return;
    }

    // Require at least text or word to be present
    if ((!text || text.trim().length === 0) && (!word || word.trim().length === 0)) {
      return;
    }

    if (!hasAI) {
      return;
    }

    // Skip if text hasn't changed
    const currentTextKey = `${text}-${word}`;
    if (currentTextKey === lastProcessedText) {
      return;
    }

    // Skip auto-regeneration if AI keywords already exist
    if (aiOptimized && aiOptimized.trim().length > 0) {
      logger.log('[KeywordPreview] AI keywords already exist, skipping auto-regeneration');
      return;
    }

    const timer = setTimeout(async () => {
      // Double-check enableAI before making API call
      if (!enableAI) {
        logger.log('[KeywordPreview] AI disabled during timeout, skipping optimization');
        return;
      }

      // Check AI usage limit (50 per day)
      const { allowed, remaining } = checkAIUsageLimit();
      if (!allowed) {
        logger.log('[KeywordPreview] AI daily limit reached');
        toast.error('AI context daily limit reached (50/day). Try again tomorrow or use manual mode.');
        setIsOptimizing(false);
        return;
      }

      setIsOptimizing(true);

      // Increment usage counter
      if (!incrementAIUsage()) {
        toast.error('AI context daily limit reached (50/day).');
        setIsOptimizing(false);
        return;
      }

      const result = await optimizeKeywordsWithAI(text, word);
      if (result) {
        setAiOptimized(result.searchQuery);
        setEditedQuery(result.searchQuery);
        setLastProcessedText(currentTextKey);
        // Notify parent component about generated keywords
        onKeywordsGenerated?.(result.searchQuery);
        logger.log('[KeywordPreview] Generated new keywords:', result.searchQuery);
        if (remaining - 1 <= 10) {
          toast.info(`AI context: ${remaining - 1} uses remaining today`);
        }
      }
      setIsOptimizing(false);
    }, 500); // Wait 0.5 second after user stops typing

    return () => clearTimeout(timer);
  }, [text, word, hasAI, enableAI, existingKeywords, lastProcessedText]);

  const handleUseAI = () => {
    if (onAddAllKeywords && aiOptimized) {
      const keywords = aiOptimized.split(',').map(k => k.trim());
      onAddAllKeywords(keywords);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedQuery(aiOptimized);
  };

  const handleSaveEdit = () => {
    setAiOptimized(editedQuery);
    setLastProcessedText(`${text}-${word}`); // Prevent auto-regeneration
    onKeywordsGenerated?.(editedQuery);
    setIsEditing(false);
    logger.log('[KeywordPreview] Manually edited keywords:', editedQuery);
  };

  const handleCancelEdit = () => {
    setEditedQuery(aiOptimized);
    setIsEditing(false);
  };

  const handleRegenerateContext = async () => {
    if ((!text && !word) || !hasAI || mode !== 'ai') return;

    // Check AI usage limit (50 per day)
    const { allowed, remaining } = checkAIUsageLimit();
    if (!allowed) {
      toast.error('AI context daily limit reached (50/day). Try again tomorrow.');
      return;
    }

    setIsOptimizing(true);

    // Increment usage counter
    if (!incrementAIUsage()) {
      toast.error('AI context daily limit reached (50/day).');
      setIsOptimizing(false);
      return;
    }

    // Add current result to previous results for exclusion
    const allPreviousResults = aiOptimized
      ? [...previousResults, aiOptimized].slice(-10) // Keep last 10 results
      : previousResults;

    // Pass ALL previous results to exclude them
    const excludeString = allPreviousResults.join(' | ');
    const result = await optimizeKeywordsWithAI(text, word, excludeString);

    if (result) {
      setPreviousResults(allPreviousResults); // Save for next regeneration
      setAiOptimized(result.searchQuery);
      setEditedQuery(result.searchQuery);
      // Use same format as auto-optimization to prevent re-triggering
      setLastProcessedText(`${text}-${word}`);
      onKeywordsGenerated?.(result.searchQuery);
      logger.log('[KeywordPreview] Regenerated new variation:', {
        previousCount: allPreviousResults.length,
        new: result.searchQuery
      });
      if (remaining - 1 <= 10) {
        toast.info(`AI context: ${remaining - 1} uses remaining today`);
      }
      // Image regeneration is handled by BulkGenerator when keywords change
    }
    setIsOptimizing(false);
  };

  if (extractedKeywords.length === 0 && suggestions.length === 0 && !aiOptimized) {
    return null;
  }

  const handleToggleMode = async () => {
    const newMode = mode === 'ai' ? 'manual' : 'ai';
    setMode(newMode);

    // Notify parent component of mode change
    onModeChange?.(newMode === 'ai');

    if (newMode === 'manual') {
      // Switching to manual mode
      if (text || word) {
        const manualKeywords = extractedKeywords.join(' ');
        logger.log('[KeywordPreview] Switched to manual mode:', manualKeywords);
        setAiOptimized(manualKeywords);
        setEditedQuery(manualKeywords);
        onKeywordsGenerated?.(manualKeywords);
        setLastProcessedText(`${text}-${word}-manual`);
      }
    } else if (newMode === 'ai') {
      // Switching to AI mode
      if ((text || word) && hasAI) {
        // Check AI usage limit (50 per day)
        const { allowed, remaining } = checkAIUsageLimit();
        if (!allowed) {
          toast.error('AI context daily limit reached (50/day). Try again tomorrow.');
          setMode('manual'); // Revert back to manual
          return;
        }

        logger.log('[KeywordPreview] Switched to AI mode, triggering optimization');
        setIsOptimizing(true);

        // Increment usage counter
        if (!incrementAIUsage()) {
          toast.error('AI context daily limit reached (50/day).');
          setIsOptimizing(false);
          setMode('manual'); // Revert back to manual
          return;
        }

        const result = await optimizeKeywordsWithAI(text, word);
        if (result) {
          setAiOptimized(result.searchQuery);
          setEditedQuery(result.searchQuery);
          setLastProcessedText(`${text}-${word}`);
          onKeywordsGenerated?.(result.searchQuery);
          logger.log('[KeywordPreview] AI optimization complete:', result.searchQuery);
          if (remaining - 1 <= 10) {
            toast.info(`AI context: ${remaining - 1} uses remaining today`);
          }
        }
        setIsOptimizing(false);
      }
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    // Get current keywords from either aiOptimized or extractedKeywords
    const currentKeywords = aiOptimized || extractedKeywords.join(' ');
    const keywords = currentKeywords.split(/[,\s]+/).filter(k => k && k !== keywordToRemove);
    const newKeywords = keywords.join(' ');
    setAiOptimized(newKeywords);
    setEditedQuery(newKeywords);
    onKeywordsGenerated?.(newKeywords);
    setLastProcessedText(`${text}-${word}`);
  };

  const handleStartAddKeyword = () => {
    // Initialize aiOptimized from extractedKeywords if empty
    if (!aiOptimized && mode === 'manual') {
      const manualKeywords = extractedKeywords.join(' ');
      setAiOptimized(manualKeywords);
      setEditedQuery(manualKeywords);
    }
    setSelectedKeyword(null); // Clear selected keyword when adding new one
    setIsAddingKeyword(true);
    setTimeout(() => {
      addKeywordInputRef.current?.focus();
    }, 0);
  };

  const handleSaveNewKeyword = () => {
    if (newKeyword.trim()) {
      // Get current keywords from either aiOptimized or extractedKeywords
      const currentKeywords = aiOptimized || extractedKeywords.join(' ');
      const keywords = currentKeywords.split(/[,\s]+/).filter(k => k);
      keywords.push(newKeyword.trim());
      const newKeywords = keywords.join(' ');
      setAiOptimized(newKeywords);
      setEditedQuery(newKeywords);
      onKeywordsGenerated?.(newKeywords);
      setLastProcessedText(`${text}-${word}`);
    }
    setNewKeyword('');
    setIsAddingKeyword(false);
  };

  return (
    <div className="flex flex-col pl-0 pr-0 py-3 rounded-lg w-full -mt-3">
      {/* Mode Toggle - Horizontal (only show if onModeChange is provided) */}
      {hasAI && onModeChange && (
        <div className="flex gap-2 mb-1">
          <Button
            variant={mode === 'manual' ? 'default' : 'outline'}
            size="sm"
            className={`h-8 px-3 flex items-center justify-center gap-1.5 ${
              mode === 'manual'
                ? 'bg-slate-800 hover:bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-700'
            }`}
            onClick={handleToggleMode}
            disabled={isOptimizing}
          >
            <Edit3 className="h-4 w-4" />
            <span className="text-sm font-medium">Manual</span>
          </Button>
          <Button
            variant={mode === 'ai' ? 'default' : 'outline'}
            size="sm"
            className={`h-8 px-3 flex items-center justify-center gap-1.5 ${
              mode === 'ai'
                ? 'bg-slate-800 hover:bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-700'
            }`}
            onClick={handleToggleMode}
            disabled={isOptimizing}
          >
            <Wand2 className="h-4 w-4" />
            <span className="text-sm font-medium hidden md:inline">AI context</span>
            <span className="text-sm font-medium md:hidden">AI</span>
          </Button>
          {mode === 'manual' && onIsolatedBackgroundChange && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-3 flex items-center gap-1.5 text-xs transition-colors ml-auto ${
                isolatedBackground
                  ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              onClick={() => {
                logger.log('[KeywordPreview] Isolated BG button clicked, current state:', isolatedBackground);
                const newValue = !isolatedBackground;
                logger.log('[KeywordPreview] New value will be:', newValue);
                onIsolatedBackgroundChange?.(newValue);
                if (newValue) {
                  // When enabling isolated background, always save current keywords
                  const currentKeywords = (aiOptimized || extractedKeywords.join(' '))
                    .replace(/\bisolated\s+background\b/gi, '') // Remove "isolated background" if present
                    .trim()
                    .replace(/\s+/g, ' '); // Normalize whitespace
                  setSavedKeywordsBeforeIsolatedBg(currentKeywords);
                  logger.log('[KeywordPreview] ENABLING isolated BG - Saved keywords:', currentKeywords);

                  // Then set keywords to "word isolated background"
                  const isolatedKeywords = `${word} isolated background`;
                  logger.log('[KeywordPreview] Setting isolated keywords:', isolatedKeywords);
                  setAiOptimized(isolatedKeywords);
                  setEditedQuery(isolatedKeywords);
                  onKeywordsGenerated?.(isolatedKeywords);
                  logger.log('[KeywordPreview] Called onKeywordsGenerated with:', isolatedKeywords);
                } else {
                  // When disabling, restore saved keywords (prefer saved, fallback to manual extraction)
                  const restoreKeywords = savedKeywordsBeforeIsolatedBg && savedKeywordsBeforeIsolatedBg.trim()
                    ? savedKeywordsBeforeIsolatedBg
                    : extractedKeywords.join(' ');
                  logger.log('[KeywordPreview] DISABLING isolated BG - Restoring keywords:', restoreKeywords, { saved: savedKeywordsBeforeIsolatedBg, manual: extractedKeywords.join(' ') });
                  onKeywordsGenerated?.(restoreKeywords);
                  setAiOptimized(restoreKeywords);
                  setEditedQuery(restoreKeywords);
                }
              }}
            >
              <Crop className="h-3 w-3" />
              <span className="text-sm font-medium">Isolate</span>
            </Button>
          )}
          {mode === 'ai' && aiOptimized && !isOptimizing && !isEditing && onRegenerateImage && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex items-center justify-center text-xs transition-colors ml-auto text-slate-700 hover:bg-slate-100 translate-x-2"
                onClick={handleRegenerateContext}
                disabled={isOptimizing || isolatedBackground}
              >
                <RefreshCw className={`h-3 w-3 ${isOptimizing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex items-center justify-center text-xs transition-colors text-slate-700 hover:bg-slate-100"
                onClick={handleStartEdit}
                disabled={isolatedBackground}
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="space-y-3">

      {/* AI Mode */}
      {mode === 'ai' && hasAI && (
        <div className="space-y-2">
          {isOptimizing && (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-xs font-medium">Optimizing with AI...</span>
            </div>
          )}

          {aiOptimized && !isOptimizing && (
            <div className="space-y-2">
              {/* AI Phrase (Context) */}
              <div className="space-y-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedQuery}
                      onChange={(e) => setEditedQuery(e.target.value)}
                      className="text-sm border-slate-300 focus:border-slate-500 focus:ring-slate-500 min-h-8"
                      placeholder="Enter keywords (space-separated)"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs bg-slate-800 hover:bg-slate-900"
                        onClick={handleSaveEdit}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-2 border rounded text-sm italic bg-slate-50 border-slate-200 text-slate-900 break-words">
                    <span className="break-words whitespace-normal">"{aiOptimized}"</span>
                  </div>
                )}
              </div>

              {/* Individual Keywords */}
              {!isEditing && (
                <div className="space-y-1">
                  <div ref={keywordContainerRef} className="flex flex-wrap gap-1.5 overflow-visible">
                    {aiOptimized.split(/[,\s]+/).filter(k => k).map((kw, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className={`relative text-xs px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 overflow-visible ${onKeywordsGenerated ? 'cursor-pointer select-none' : ''}`}
                        onClick={() => onKeywordsGenerated && setSelectedKeyword(selectedKeyword === kw ? null : kw)}
                      >
                        {kw}
                        {onKeywordsGenerated && selectedKeyword === kw && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveKeyword(kw);
                              setSelectedKeyword(null);
                            }}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-md z-10"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}

                    {/* Add Keyword Button (only if onAddKeyword is provided) */}
                    {onAddKeyword && (
                      isAddingKeyword ? (
                        <input
                          ref={addKeywordInputRef}
                          type="text"
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          onBlur={handleSaveNewKeyword}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveNewKeyword();
                            } else if (e.key === 'Escape') {
                              setNewKeyword('');
                              setIsAddingKeyword(false);
                            }
                          }}
                          className="h-6 px-2 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
                          placeholder="Type keyword..."
                        />
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0.5 border-dashed border-slate-300 text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={handleStartAddKeyword}
                        >
                          <Plus className="h-3 w-3" />
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Mode */}
      {mode === 'manual' && (
        <div className="mt-1.5">
          {/* Extracted Keywords */}
          {extractedKeywords.length > 0 && (
            <div ref={keywordContainerRef} className="flex flex-wrap gap-1.5 overflow-visible">
              {(isolatedBackground
                ? `${word} isolated background`.split(/\s+/)
                : (aiOptimized ? aiOptimized.split(/[,\s]+/).filter(k => k) : extractedKeywords)
              ).map((kw, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className={`relative overflow-visible ${isolatedBackground
                    ? "bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2 py-0.5"
                    : onKeywordsGenerated
                      ? "bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2 py-0.5 cursor-pointer select-none"
                      : "bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2 py-0.5"
                  }`}
                  onClick={() => !isolatedBackground && onKeywordsGenerated && setSelectedKeyword(selectedKeyword === kw ? null : kw)}
                >
                  {kw}
                  {!isolatedBackground && onKeywordsGenerated && selectedKeyword === kw && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveKeyword(kw);
                        setSelectedKeyword(null);
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-md z-10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}

              {/* Add Keyword Button (only when not in isolated background mode and onAddKeyword is provided) */}
              {!isolatedBackground && onAddKeyword && (
                isAddingKeyword ? (
                  <input
                    ref={addKeywordInputRef}
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onBlur={handleSaveNewKeyword}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveNewKeyword();
                      } else if (e.key === 'Escape') {
                        setNewKeyword('');
                        setIsAddingKeyword(false);
                      }
                    }}
                    className="h-6 px-2 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="Type keyword..."
                  />
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs px-1.5 py-0.5 border-dashed border-slate-300 text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={handleStartAddKeyword}
                  >
                    <Plus className="h-3 w-3" />
                  </Badge>
                )
              )}
            </div>
          )}

          {/* Suggested Keywords */}
          {suggestions.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-600">Suggested (better results)</span>
                </div>
                {onAddAllKeywords && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    onClick={() => onAddAllKeywords(suggestions)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add All
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="bg-white border-slate-200 text-slate-700 text-xs px-2 py-0.5 cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    onClick={() => onAddKeyword?.(suggestion)}
                  >
                    {suggestion}
                    <Plus className="h-3 w-3 ml-1 inline" />
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">💡 Click to add keywords to your description</p>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

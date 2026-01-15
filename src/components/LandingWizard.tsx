import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import {
  Image as ImageIcon,
  Box,
  Palette,
  Layers,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Wand2,
  Sparkles,
  Camera,
  Type,
  Video,
  Film,
  Aperture,
  Zap,
  DollarSign,
  Check,
  Plus,
  X,
  ChevronDown,
  Info
} from 'lucide-react';
import { cn } from './ui/utils';
import { getRandomShutterstockImage } from '../services/shutterstock';
import { getRandomUnsplashPhoto } from '../services/unsplash';
import { getRandomPexelsPhoto, getRandomPexelsVideo } from '../services/pexels';
import { getRandomPixabayImage, getRandomPixabayVideo } from '../services/pixabay';
import { getRandomFreepikImage, getRandomFreepikVideo } from '../services/freepik';
import { KeywordPreview } from './KeywordPreview';
import { TypingAnimation } from './ui/typing-animation';
import { optimizeKeywordsWithAI } from '../services/ai';
import { logger } from '../lib/logger';

const extractKeywords = (text: string, word: string) => {
    const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'with', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'for', 'of', 'my']);
    const words = (text || '').toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));
    
    const uniqueWords = Array.from(new Set(words)).slice(0, 3);
    if (word && !uniqueWords.includes(word.toLowerCase())) {
        uniqueWords.unshift(word.toLowerCase());
    }
    
    return uniqueWords.map(w => `#${w}`).join(' ');
};

// Configuration Data
const MEDIA_TYPES = [
  { id: 'image', name: 'Image', icon: ImageIcon, description: 'Static visual assets' },
  { id: 'video', name: 'Video', icon: Video, description: 'Motion and clips' },
];

const SOURCES = [
  { id: 'unsplash', name: 'Unsplash', type: 'free', media: ['image'], description: 'High-quality free photos' },
  { id: 'pexels', name: 'Pexels', type: 'free', media: ['image', 'video'], description: 'Best free stock photos & videos' },
  { id: 'pixabay', name: 'Pixabay', type: 'free', media: ['image', 'video'], description: 'Stunning free images & royalty free stock' },
  { id: 'mixkit', name: 'Mixkit', type: 'free', media: ['video'], description: 'Awesome free video assets' },
];

const STYLES = {
  image: [
    { id: 'photo', name: 'Photography', icon: Camera, color: 'bg-slate-100 text-slate-600' },
    { id: '3d', name: '3D Render', icon: Box, color: 'bg-slate-100 text-slate-600' },
    { id: 'minimal', name: 'Minimalist', icon: Layers, color: 'bg-slate-100 text-slate-600' },
    { id: 'abstract', name: 'Abstract', icon: Palette, color: 'bg-slate-100 text-slate-600' },
  ],
  video: [
    { id: 'cinematic', name: 'Cinematic', icon: Film, color: 'bg-slate-100 text-slate-600' },
    { id: 'drone', name: 'Drone/Aerial', icon: Aperture, color: 'bg-slate-100 text-slate-600' },
    { id: 'slowmo', name: 'Slow Motion', icon: Zap, color: 'bg-slate-100 text-slate-600' },
    { id: 'timelapse', name: 'Timelapse', icon: Layers, color: 'bg-slate-100 text-slate-600' },
  ]
};

const COUNTS = ['1', '2', '3', '4'];

interface LandingWizardProps {
  onComplete: (data: {
    mediaType: 'image' | 'video';
    sources: string[];
    style: string;
    count: string;
    baseKeywords?: string;
    items: Array<{
      word: string;
      description: string;
      keywords?: string;
      imageUrl?: string;
      imageSource?: string;
      imageSourceUrl?: string;
      mediaType?: 'image' | 'video';
      generatedImages?: Array<{ url: string; source: string; sourceUrl: string }>;
      selectedImageIndex?: number;
      isolated?: boolean;
      isolatedBackground?: boolean;
    }>;
  }) => void;
}

const StepContainer = ({ 
  children, 
  index, 
  isActive, 
  step,
  onRef,
  onStepChange
}: { 
  children: React.ReactNode; 
  index: number; 
  isActive: boolean; 
  step: number;
  onRef: (el: HTMLDivElement | null) => void;
  onStepChange: (index: number) => void;
}) => {
  if (index > step) return null;
  
  const isPast = index < step;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`w-full max-w-3xl mx-auto py-24 min-h-screen flex flex-col justify-center transition-all duration-300 relative ${
        isActive
          ? 'opacity-100'
          : 'opacity-40 grayscale'
      }`}
      ref={onRef}
      onClick={(e) => {
        if (isPast) onStepChange(index);
      }}
    >
      {isActive && index > 0 && (
        <div className="w-full max-w-2xl mx-auto mb-6">
           <Button
             variant="outline"
             className="bg-slate-100 text-slate-900 border-transparent hover:bg-slate-200 hover:text-slate-900 hover:scale-105 gap-2 pl-3 pr-4 rounded-full transition-all"
             onClick={() => onStepChange(index - 1)}
           >
             <ArrowLeft className="h-4 w-4" />
             이전 단계
           </Button>
        </div>
      )}

      <div className={isPast ? "pointer-events-none" : ""}>
        {children}
      </div>
    </motion.div>
  );
};

export function LandingWizard({ onComplete }: LandingWizardProps) {
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<{
    mediaType: 'image' | 'video';
    sources: string[];
    count: string;
    word: string;
    description: string;
    keywords?: string;
    baseKeywords?: string;
    isolatedBackground?: boolean;
    isolated?: boolean;
  }>({
    mediaType: 'image',
    sources: [],
    count: '',
    word: '',
    description: '',
    keywords: '',
    baseKeywords: '',
    isolatedBackground: false,
    isolated: true
  });

  // Brief Generate state
  const [briefItems, setBriefItems] = useState<Array<{ id: string; word: string; description: string; isolated?: boolean; keywords?: string; isolatedBackground?: boolean }>>([
    { id: '1', word: '', description: '', isolated: true, keywords: '', isolatedBackground: false }
  ]);
  const [briefSettings, setBriefSettings] = useState({
    sources: ['unsplash', 'pexels', 'pixabay'],
    count: '1'
  });

  // Refs for scrolling
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Prevent auto-scroll on page load
  useEffect(() => {
    // Disable browser's scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Force scroll to top
    window.scrollTo(0, 0);

    // Also set it after a short delay to ensure it takes effect
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Scroll to the new step (but not for step 0)
    if (step > 0 && step < 7 && sectionRefs.current[step]) {
      setTimeout(() => {
        sectionRefs.current[step]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Additional 2cm (80px) downward scroll offset
        setTimeout(() => {
          window.scrollBy({ top: 80, behavior: 'smooth' });
        }, 200);
      }, 100);
    }
  }, [step]);

  const handleNext = () => {
    setStep(prev => prev + 1);
  };

  // Helper function to search all selected sources in parallel
  const searchAllSources = async (searchTerms: string, selectedSources: string[], mediaType: 'image' | 'video') => {
    logger.log('[LandingWizard] 🔍 Searching all sources in parallel:', {
      sources: selectedSources,
      searchTerms,
      mediaType
    });

    // Create array of promises for all selected sources
    const searchPromises = selectedSources.map(async (source) => {
      try {
        logger.log(`[LandingWizard] 🔍 Trying ${source}...`);

        switch (source) {
          case 'unsplash':
            if (mediaType === 'image') {
              const result = await getRandomUnsplashPhoto(searchTerms);
              if (result) {
                return {
                  source: 'Unsplash',
                  imageUrl: result.imageUrl,
                  sourceUrl: result.sourceUrl,
                  photographer: result.photographer
                };
              }
            }
            break;

          case 'pexels':
            const pexelsResult = mediaType === 'video'
              ? await getRandomPexelsVideo(searchTerms)
              : await getRandomPexelsPhoto(searchTerms);
            if (pexelsResult) {
              return {
                source: 'Pexels',
                imageUrl: mediaType === 'video' ? pexelsResult.videoUrl : pexelsResult.imageUrl,
                sourceUrl: pexelsResult.sourceUrl,
                photographer: pexelsResult.photographer
              };
            }
            break;

          case 'pixabay':
            const pixabayResult = mediaType === 'video'
              ? await getRandomPixabayVideo(searchTerms)
              : await getRandomPixabayImage(searchTerms);
            if (pixabayResult) {
              return {
                source: 'Pixabay',
                imageUrl: mediaType === 'video' ? pixabayResult.videoUrl : pixabayResult.imageUrl,
                sourceUrl: pixabayResult.sourceUrl,
                photographer: pixabayResult.photographer
              };
            }
            break;

          case 'freepik':
            const freepikResult = mediaType === 'video'
              ? await getRandomFreepikVideo(searchTerms)
              : await getRandomFreepikImage(searchTerms);
            if (freepikResult) {
              return {
                source: 'Freepik',
                imageUrl: mediaType === 'video' ? freepikResult.videoUrl : freepikResult.imageUrl,
                sourceUrl: freepikResult.sourceUrl,
                photographer: freepikResult.photographer
              };
            }
            break;

          case 'shutterstock':
            const shutterstockImage = await getRandomShutterstockImage(searchTerms);
            if (shutterstockImage) {
              return {
                source: 'Shutterstock',
                imageUrl: shutterstockImage,
                sourceUrl: shutterstockImage,
                photographer: ''
              };
            }
            break;
        }

        logger.log(`[LandingWizard] ⚠️ ${source} returned no results`);
        return null;
      } catch (error) {
        console.error(`[LandingWizard] ❌ Error fetching from ${source}:`, error);
        return null;
      }
    });

    // Wait for all searches to complete
    const results = await Promise.all(searchPromises);

    // Filter out null results
    const validResults = results.filter(r => r !== null);

    logger.log(`[LandingWizard] ✅ Got ${validResults.length} results from ${selectedSources.length} sources`);

    return validResults;
  };

  const handleFinalSubmit = async () => {
    setStep(6); // Go to loading state

    // Use existing keywords if available, otherwise generate new ones
    let searchTerms = '';

    logger.log('[LandingWizard] 🔍 handleFinalSubmit - Current state:', {
      isolatedBackground: selections.isolatedBackground,
      isolated: selections.isolated,
      keywords: selections.keywords,
      word: selections.word
    });

    // Priority order:
    // 1. Isolated Background mode (highest priority)
    // 2. Pre-generated keywords from KeywordPreview
    // 3. AI mode or Manual mode
    if (selections.isolatedBackground) {
      // Manual mode + Isolated background - ALWAYS use this when isolatedBackground is true
      searchTerms = `${selections.word} isolated background`;
      logger.log('[LandingWizard] 🎯 Isolated background mode (PRIORITY):', searchTerms);
    } else if (selections.keywords && selections.keywords.trim().length > 0) {
      // Use pre-generated keywords from KeywordPreview
      searchTerms = selections.keywords;
      logger.log('[LandingWizard] ✅ Using keywords from KeywordPreview:', searchTerms);
    } else if (selections.isolated === false) {
      // AI mode - Try AI optimization first, fallback to manual extraction
      try {
        const aiResult = await optimizeKeywordsWithAI(selections.description, selections.word);

        if (aiResult && aiResult.searchQuery) {
          searchTerms = aiResult.searchQuery;
          logger.log('[LandingWizard] ✅ AI Success:', { searchQuery: searchTerms });
        } else {
          throw new Error('AI returned empty result');
        }
      } catch (error) {
        // Fallback to manual extraction
        logger.log('[LandingWizard] ⚠️ AI failed, using manual:', error);
        const keywords = extractKeywords(selections.description, selections.word);
        searchTerms = keywords.replace(/#/g, '').replace(/\s+/g, ' ');
        logger.log('[LandingWizard] Manual keywords:', searchTerms);
      }
    } else {
      // Manual mode - use manual extraction (fallback)
      const keywords = extractKeywords(selections.description, selections.word);
      searchTerms = keywords.replace(/#/g, '').replace(/\s+/g, ' ');
      logger.log('[LandingWizard] 🎯 Manual mode keywords (fallback):', searchTerms);
    }

    // Ensure searchTerms is not empty
    if (!searchTerms || searchTerms.trim().length === 0) {
      searchTerms = selections.word || 'nature';
      logger.log('[LandingWizard] ⚠️ Empty keywords, using fallback:', searchTerms);
    }

    // Prepend base keywords only in AI mode (isolated = false)
    let finalSearchTerms = searchTerms;
    if (!selections.isolated && selections.baseKeywords && selections.baseKeywords.trim()) {
      finalSearchTerms = `${selections.baseKeywords.trim()} ${searchTerms}`;
      logger.log('[LandingWizard] Added base keywords (AI mode):', finalSearchTerms);
    }

    // Generate multiple images based on count setting
    const count = parseInt(selections.count) || 1;
    const generatedImages: Array<{ url: string; source: string; sourceUrl: string }> = [];
    let imageUrl = '';
    let imageSource = 'AI';
    let imageSourceUrl = '';
    let photographer = '';
    let photographerUrl = '';

    try {
      logger.log('[LandingWizard] 🔍 Generating', count, 'media(s):', {
        selectedSources: selections.sources,
        searchTerms: finalSearchTerms,
        baseKeywords: selections.baseKeywords
      });

      // Generate count number of images
      for (let i = 0; i < count; i++) {
        // Search all selected sources in parallel
        const allResults = await searchAllSources(finalSearchTerms, selections.sources, selections.mediaType);

        // Pick result based on index to get variety
        let currentResult;
        if (allResults.length > 0) {
          // Define source priority
          const sourcePriority = ['unsplash', 'pexels', 'pixabay', 'freepik', 'shutterstock'];

          // Sort results by priority
          allResults.sort((a, b) => {
            const aPriority = sourcePriority.indexOf(a.source.toLowerCase());
            const bPriority = sourcePriority.indexOf(b.source.toLowerCase());
            return aPriority - bPriority;
          });

          // Cycle through results if we have multiple
          const resultIndex = i % allResults.length;
          currentResult = allResults[resultIndex];
        }

        // Use result or fallback to AI
        if (currentResult) {
          generatedImages.push({
            url: currentResult.imageUrl,
            source: currentResult.source,
            sourceUrl: currentResult.sourceUrl
          });

          if (i === 0) {
            imageUrl = currentResult.imageUrl;
            imageSource = currentResult.source;
            imageSourceUrl = currentResult.sourceUrl;
            photographer = currentResult.photographer || '';
            photographerUrl = currentResult.photographerUrl || '';
          }
        } else {
          // Fallback to AI-generated image
          let aiUrl, aiSource;
          if (selections.mediaType === 'video') {
            aiUrl = `https://www.w3schools.com/html/mov_bbb.mp4`;
            aiSource = 'AI Generated Video';
          } else {
            aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalSearchTerms)}%20stock%20photo?width=1000&height=1000&nologo=true&seed=${Math.floor(Math.random() * 1000) + i}`;
            aiSource = 'AI Generated Image';
          }

          generatedImages.push({
            url: aiUrl,
            source: aiSource,
            sourceUrl: ''
          });

          if (i === 0) {
            imageUrl = aiUrl;
            imageSource = aiSource;
            imageSourceUrl = '';
          }
        }
      }

      logger.log(`[LandingWizard] ✅ Generated ${count} media(s), primary source: ${imageSource}`);
    } catch (error) {
      console.error('[LandingWizard] Error fetching images:', error);
      // Fallback to AI-generated image on error
      for (let i = 0; i < count; i++) {
        let aiUrl, aiSource;
        if (selections.mediaType === 'video') {
          aiUrl = `https://www.w3schools.com/html/mov_bbb.mp4`;
          aiSource = 'AI Generated Video';
        } else {
          aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalSearchTerms)}%20stock%20photo?width=1000&height=1000&nologo=true&seed=${Math.floor(Math.random() * 1000) + i}`;
          aiSource = 'AI Generated Image';
        }

        generatedImages.push({
          url: aiUrl,
          source: aiSource,
          sourceUrl: ''
        });

        if (i === 0) {
          imageUrl = aiUrl;
          imageSource = aiSource;
          imageSourceUrl = '';
        }
      }
    }

    logger.log('[LandingWizard] 🔍 Completing with:', {
      isolated: selections.isolated,
      isolatedBackground: selections.isolatedBackground,
      searchTerms: searchTerms,
      selectionsKeywords: selections.keywords
    });
    onComplete({
      mediaType: selections.mediaType,
      sources: selections.sources,
      count: selections.count,
      baseKeywords: selections.baseKeywords,
      items: [{
          word: selections.word,
          description: selections.description,
          keywords: searchTerms,
          imageUrl: imageUrl,
          imageSource: imageSource,
          imageSourceUrl: imageSourceUrl,
          photographer: photographer,
          photographerUrl: photographerUrl,
          mediaType: selections.mediaType,
          generatedImages: generatedImages,
          selectedImageIndex: 0,
          isolated: selections.isolated,
          isolatedBackground: selections.isolatedBackground
      }]
    });
  };

  const updateSelection = (key: string, value: any) => {
    setSelections(prev => ({ ...prev, [key]: value }));
  };

  const handleAddKeyword = (keyword: string) => {
    setSelections(prev => {
      const currentDesc = prev.description;
      const newDesc = currentDesc ? `${currentDesc} ${keyword}` : keyword;
      return { ...prev, description: newDesc };
    });
  };

  const handleAddAllKeywords = (keywords: string[]) => {
    setSelections(prev => {
      const currentDesc = prev.description;
      const keywordsText = keywords.join(' ');
      const newDesc = currentDesc ? `${currentDesc} ${keywordsText}` : keywordsText;
      return { ...prev, description: newDesc };
    });
  };

  // Brief Generate handlers
  const handleAddBriefItem = () => {
    setBriefItems(prev => [...prev, { id: Date.now().toString(), word: '', description: '', isolated: true, keywords: '' }]);
  };

  const handleRemoveBriefItem = (id: string) => {
    setBriefItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateBriefItem = (id: string, field: 'word' | 'description', value: string) => {
    setBriefItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleBriefGenerate = () => {
    const validItems = briefItems.filter(item => item.word.trim());
    if (validItems.length === 0) {
      return;
    }

    onComplete({
      mediaType: 'image',
      sources: briefSettings.sources,
      style: 'photo',
      count: briefSettings.count,
      items: validItems.map(item => ({
        word: item.word,
        description: item.description
      }))
    });
  };

  const toggleBriefSource = (sourceId: string) => {
    setBriefSettings(prev => {
      const current = prev.sources;
      if (current.includes(sourceId)) {
        return { ...prev, sources: current.filter(id => id !== sourceId) };
      } else {
        return { ...prev, sources: [...current, sourceId] };
      }
    });
  };

  const toggleSource = (sourceId: string) => {
    setSelections(prev => {
      const current = prev.sources;
      if (current.includes(sourceId)) {
        return { ...prev, sources: current.filter(id => id !== sourceId) };
      } else {
        return { ...prev, sources: [...current, sourceId] };
      }
    });
  };

  if (step === 6) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center text-white">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6 max-w-md text-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-slate-500 blur-xl opacity-20 animate-pulse rounded-full" />
            <div className="h-20 w-20 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center relative z-10">
              <Sparkles className="h-10 w-10 text-slate-400 animate-spin-slow" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-light tracking-tight">Generating Visuals</h2>
            <p className="text-slate-400 text-lg">Visualizing Tags and Keywords...</p>
          </div>

          <div className="flex gap-2 items-center text-sm text-slate-500 mt-4">
             <span className="animate-bounce delay-75">●</span>
             <span className="animate-bounce delay-100">●</span>
             <span className="animate-bounce delay-150">●</span>
          </div>
        </motion.div>
      </div>
    );
  }

  const filteredSources = SOURCES.filter(s => s.media.includes(selections.mediaType));
  const freeSources = filteredSources.filter(s => s.type === 'free');
  const paidSources = filteredSources.filter(s => s.type === 'paid');

  const currentStyles = STYLES[selections.mediaType] || STYLES.image;

  return (
    <div className={`min-h-screen bg-slate-50 ${step === 0 ? 'flex flex-col justify-center' : 'pb-32'}`}>
       <div className={`w-full ${step === 0 ? '' : 'max-w-5xl mx-auto px-6 pt-8 space-y-8'}`}>
          {step > 0 && (
             <div className="flex justify-center">
                <div className="bg-white border px-3 py-1 rounded-full text-xs font-medium text-slate-500 shadow-sm">
                   Step {step} of 5
                </div>
             </div>
          )}
          
          {/* Step 0: Intro */}
          <StepContainer 
            index={0} 
            isActive={step === 0} 
            step={step} 
            onRef={el => sectionRefs.current[0] = el}
            onStepChange={setStep}
          >
             <div className="w-full h-full flex flex-col justify-center items-center md:items-start pb-12 pt-0 px-6 md:pl-[calc(8rem-0.5cm)] md:pr-8 mt-[calc(-1.75rem+0.5cm)]">
                {/* Title */}
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 m-0 p-0 mb-8 text-center md:text-left">
                    <TypingAnimation text="Save time on" /><br />
                    <TypingAnimation text="searching stock assets." delay={700} />
                </h1>

                {/* Buttons (horizontal on desktop, vertical on mobile) */}
                <div className="flex flex-col md:flex-row gap-4">
                    <motion.div
                        initial={{ width: 210 }}
                        animate={{ width: 310 }}
                        transition={{ duration: 0.5, delay: 1.5 }}
                        className="overflow-visible w-full md:w-auto"
                    >
                        <Button
                            size="lg"
                            className="h-14 px-8 text-lg font-bold rounded-full bg-slate-900 hover:bg-slate-800 hover:scale-105 border-0 outline-none focus:outline-none whitespace-nowrap w-full"
                            onClick={handleNext}
                        >
                            Start Searching
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.5, duration: 0.5 }}
                        className="w-full md:w-auto relative"
                    >
                        <Button
                            size="lg"
                            className="h-14 px-16 text-lg font-bold rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all hover:scale-105 border-0 outline-none focus:outline-none whitespace-nowrap w-full md:min-w-[228px]"
                            onClick={() => onComplete({
                                mediaType: 'image',
                                sources: [],
                                style: '',
                                count: '',
                                items: []
                            })}
                        >
                            Batch Search
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>

                        {/* About License Button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="absolute -bottom-6 right-0 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors">
                              <Info className="h-3 w-3" />
                              about license
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <Info className="h-5 w-5 text-blue-600" />
                                Image License Notice
                              </AlertDialogTitle>
                              <AlertDialogDescription className="space-y-4 pt-2">
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                                  <p className="font-semibold text-amber-900 text-sm">⚠️ Important Notice</p>
                                  <p className="text-sm text-slate-700">Images displayed are <span className="text-red-600 font-semibold">preview thumbnails only</span> and are not licensed for commercial use.</p>
                                </div>

                                <div className="space-y-2">
                                  <p className="font-semibold text-slate-900 text-sm">To use these images:</p>
                                  <ul className="space-y-1 text-sm text-slate-700">
                                    <li>• Visit the <span className="text-red-600 font-semibold">original stock website</span></li>
                                    <li>• Purchase or download the full-resolution image</li>
                                    <li>• Review and comply with the licensing terms</li>
                                  </ul>
                                </div>

                                <div className="bg-slate-50 rounded-lg p-3">
                                  <p className="text-xs text-slate-600">This tool helps you find and organize stock images. You are responsible for obtaining proper licenses before using any images.</p>
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogAction className="bg-blue-600 hover:bg-blue-700">I Understand</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </motion.div>
                </div>

                {/* Brief Generate Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3, duration: 0.6 }}
                    className="mt-16 w-full hidden"
                >
                    <div className="relative bg-white border border-slate-200 rounded-lg p-4 space-y-3 hover:border-slate-300 transition-colors focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-100">
                        <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                            <Input
                                placeholder="Subject..."
                                value={briefItems[0].word}
                                onChange={(e) => handleUpdateBriefItem(briefItems[0].id, 'word', e.target.value)}
                                className="h-6 text-sm font-semibold border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 placeholder:font-normal"
                            />
                        </div>
                        <Textarea
                            placeholder="Add description for better results..."
                            value={briefItems[0].description}
                            onChange={(e) => handleUpdateBriefItem(briefItems[0].id, 'description', e.target.value)}
                            className="min-h-[80px] text-sm border-0 bg-transparent px-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400"
                        />
                        <KeywordPreview
                            text={briefItems[0].description}
                            word={briefItems[0].word}
                            existingKeywords={briefItems[0].keywords}
                            enableAI={briefItems[0].isolated === false}
                            isolatedBackground={briefItems[0].isolatedBackground}
                            onAddKeyword={(keyword) => {
                                const newDesc = briefItems[0].description ? `${briefItems[0].description} ${keyword}` : keyword;
                                handleUpdateBriefItem(briefItems[0].id, 'description', newDesc);
                            }}
                            onAddAllKeywords={(keywords) => {
                                const keywordsText = keywords.join(' ');
                                const newDesc = briefItems[0].description ? `${briefItems[0].description} ${keywordsText}` : keywordsText;
                                handleUpdateBriefItem(briefItems[0].id, 'description', newDesc);
                            }}
                            onKeywordsGenerated={(keywords) => {
                                setBriefItems(prev => prev.map((i, idx) =>
                                    idx === 0 ? { ...i, keywords } : i
                                ));
                            }}
                            onIsolatedBackgroundChange={(value) => {
                                logger.log('[LandingWizard] onIsolatedBackgroundChange called with value:', value);
                                setBriefItems(prev => {
                                    const updated = prev.map((i, idx) =>
                                        idx === 0 ? { ...i, isolatedBackground: value } : i
                                    );
                                    logger.log('[LandingWizard] Updated briefItems:', updated[0]);
                                    return updated;
                                });
                            }}
                            onModeChange={(enabled) => {
                                setBriefItems(prev => prev.map((i, idx) =>
                                    idx === 0 ? { ...i, isolated: !enabled } : i
                                ));
                            }}
                        />

                        {/* Settings and Generate */}
                        <div className="flex items-center gap-4 pt-2 border-t border-slate-200">
                            <div className="flex gap-3 items-center flex-1">
                                <Label className="text-xs text-slate-500 font-medium">Sources:</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 text-xs">
                                            {briefSettings.sources.length > 0 ? (
                                                <span className="flex gap-1 items-center">
                                                    {briefSettings.sources.slice(0, 2).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
                                                    {briefSettings.sources.length > 2 && ` +${briefSettings.sources.length - 2}`}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">Select sources...</span>
                                            )}
                                            <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-48">
                                        <DropdownMenuLabel className="text-xs">Free Sources</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuCheckboxItem
                                            checked={briefSettings.sources.includes('unsplash')}
                                            onCheckedChange={() => toggleBriefSource('unsplash')}
                                            className="text-xs"
                                        >
                                            Unsplash
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem
                                            checked={briefSettings.sources.includes('pexels')}
                                            onCheckedChange={() => toggleBriefSource('pexels')}
                                            className="text-xs"
                                        >
                                            Pexels
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem
                                            checked={briefSettings.sources.includes('pixabay')}
                                            onCheckedChange={() => toggleBriefSource('pixabay')}
                                            className="text-xs"
                                        >
                                            Pixabay
                                        </DropdownMenuCheckboxItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Label className="text-xs text-slate-500 font-medium">Count:</Label>
                                <Select value={briefSettings.count} onValueChange={(value) => setBriefSettings(prev => ({ ...prev, count: value }))}>
                                    <SelectTrigger className="h-8 w-16 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1" className="text-xs">1</SelectItem>
                                        <SelectItem value="2" className="text-xs">2</SelectItem>
                                        <SelectItem value="3" className="text-xs">3</SelectItem>
                                        <SelectItem value="4" className="text-xs">4</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                size="sm"
                                onClick={handleBriefGenerate}
                                disabled={!briefItems[0].word.trim()}
                                className="h-9 px-6 text-xs bg-slate-700 hover:bg-slate-800 text-white"
                            >
                                <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                                Generate
                            </Button>
                        </div>
                    </div>
                </motion.div>
             </div>
          </StepContainer>

          {/* Step 1: Media Type */}
          <StepContainer 
            index={1} 
            isActive={step === 1} 
            step={step} 
            onRef={el => sectionRefs.current[1] = el}
            onStepChange={setStep}
          >
             <div className="space-y-6">
                <div className="space-y-2 text-center">
                   <h2 className="text-3xl font-bold text-slate-900">Select Media Type</h2>
                   <p className="text-lg text-slate-500">What kind of content are you searching?</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
                   {MEDIA_TYPES.map(type => (
                     <Card
                       key={type.id}
                       className={`cursor-pointer transition-all !border-2 hover:!border-blue-400 active:!border-blue-500 active:!bg-white active:!text-slate-900 focus:!border-blue-500 focus:!bg-white focus-visible:!border-blue-500 focus-visible:!bg-white focus-visible:!outline-blue-500 focus-visible:!ring-0 group ${selections.mediaType === type.id ? '!border-blue-500 !bg-white shadow-md' : '!border-transparent !bg-white'}`}
                       onClick={() => {
                         updateSelection('mediaType', type.id);
                         updateSelection('sources', []);
                         if (step === 1) handleNext();
                       }}
                       tabIndex={0}
                     >
                       <CardContent className="p-4 flex flex-col items-center gap-3 text-center">
                          <div className={`p-3 rounded-full bg-white shadow-sm group-hover:scale-110 transition-transform`}>
                             <type.icon className="h-6 w-6 text-slate-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">{type.name}</h3>
                            <p className="text-xs text-slate-500 mt-1">{type.description}</p>
                          </div>
                       </CardContent>
                     </Card>
                   ))}
                </div>
             </div>
          </StepContainer>

          {/* Step 2: Sources */}
          <StepContainer 
            index={2} 
            isActive={step === 2} 
            step={step} 
            onRef={el => sectionRefs.current[2] = el}
            onStepChange={setStep}
          >
             <div className="space-y-8">
                <div className="space-y-2 text-center">
                   <h2 className="text-3xl font-bold text-slate-900">Choose Sources</h2>
                   <p className="text-lg text-slate-500">Select one or more providers</p>
                </div>

                <div className="space-y-8">
                    {/* Free Sources */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 justify-center text-slate-500 text-sm font-medium uppercase tracking-wider">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">Free</Badge>
                            <span>Standard Sources</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {freeSources.map(source => {
                                const isFreepik = source.id === 'freepik';
                                const isDisabled = isFreepik;

                                return (
                                <Card
                                    key={source.id}
                                    className={`transition-all border-2 relative ${
                                        isDisabled
                                            ? 'opacity-50 cursor-not-allowed border-slate-200'
                                            : `cursor-pointer hover:!border-blue-400 active:!border-blue-500 focus:!border-blue-500 focus-visible:!border-blue-500 focus:outline-none ${selections.sources.includes(source.id) ? 'border-blue-500 bg-slate-50/50 shadow-md' : 'border-transparent'}`
                                    }`}
                                    onClick={() => !isDisabled && toggleSource(source.id)}
                                >
                                    {selections.sources.includes(source.id) && !isDisabled && (
                                        <div className="absolute top-3 right-3 text-blue-500">
                                            <CheckCircle2 className="h-5 w-5 fill-blue-100" />
                                        </div>
                                    )}
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                                            {source.media.includes('video') ? <Video className="h-5 w-5 text-slate-600" /> : <Camera className="h-5 w-5 text-slate-600" />}
                                        </div>
                                        <div className="text-left flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-slate-900">{source.name}</h3>
                                                {isFreepik && (
                                                    <Badge variant="secondary" className="text-[10px] bg-slate-200 text-slate-600">
                                                        CORS Error
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500">{source.description}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* Paid Sources */}
                    {paidSources.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 justify-center text-slate-500 text-sm font-medium uppercase tracking-wider">
                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">Premium</Badge>
                                <span>Paid Sources</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                                {paidSources.map(source => (
                                    <Card
                                        key={source.id}
                                        className={`cursor-pointer transition-all border-2 hover:!border-blue-400 active:!border-blue-500 focus:!border-blue-500 focus-visible:!border-blue-500 focus:outline-none relative ${selections.sources.includes(source.id) ? 'border-blue-500 bg-slate-50/50 shadow-md' : 'border-transparent'}`}
                                        onClick={() => toggleSource(source.id)}
                                    >
                                        {selections.sources.includes(source.id) && (
                                            <div className="absolute top-3 right-3 text-blue-500">
                                                <CheckCircle2 className="h-5 w-5 fill-blue-100" />
                                            </div>
                                        )}
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                                                <DollarSign className="h-5 w-5 text-slate-600" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-semibold text-slate-900">{source.name}</h3>
                                                <p className="text-xs text-slate-500">{source.description}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-center pt-4">
                    <Button
                        size="lg"
                        disabled={selections.sources.length === 0}
                        onClick={handleNext}
                        className="px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
                    >
                        Continue with {selections.sources.length} Source{selections.sources.length !== 1 ? 's' : ''}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
             </div>
          </StepContainer>

          {/* Step 3: Count */}
          <StepContainer
            index={3}
            isActive={step === 3}
            step={step}
            onRef={el => sectionRefs.current[3] = el}
            onStepChange={setStep}
          >
             <div className="space-y-6 max-w-md mx-auto w-full">
                <div className="space-y-2 text-center">
                   <h2 className="text-3xl font-bold text-slate-900">Item Count</h2>
                   <p className="text-lg text-slate-500">How many candidate images to fetch?</p>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                   {COUNTS.map(count => (
                     <Button
                       key={count}
                       variant={selections.count === count ? 'default' : 'outline'}
                       className={`h-16 text-xl font-semibold hover:!border-blue-400 hover:!text-blue-600 active:!bg-blue-600 active:!border-blue-600 active:!text-white focus:!bg-blue-600 focus:!border-blue-600 focus:!text-white focus-visible:!ring-blue-500 focus-visible:!ring-2 ${selections.count === count ? 'bg-blue-600 hover:bg-blue-700 border-blue-600' : ''}`}
                       onClick={() => {
                         updateSelection('count', count);
                         if (step === 3) handleNext();
                       }}
                     >
                       {count}
                     </Button>
                   ))}
                </div>
             </div>
          </StepContainer>

          {/* Step 4: Word Input */}
          <StepContainer
            index={4}
            isActive={step === 4}
            step={step}
            onRef={el => sectionRefs.current[4] = el}
            onStepChange={setStep}
          >
             <div className="space-y-6 max-w-lg mx-auto w-full">
                <div className="space-y-2 text-center">
                   <h2 className="text-3xl font-bold text-slate-900">Target Word</h2>
                   <p className="text-lg text-slate-500">What is the main subject?</p>
                </div>

                <div className="relative">
                   <Input
                     value={selections.word}
                     onChange={(e) => updateSelection('word', e.target.value)}
                     placeholder="e.g. Serendipity"
                     className="h-14 text-xl px-4 shadow-sm border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && selections.word) {
                         handleNext();
                       }
                     }}
                     autoFocus={step === 4}
                   />
                   <div className="absolute right-2 top-1/2 -translate-y-1/2">
                     <Button
                       size="icon"
                       disabled={!selections.word}
                       onClick={handleNext}
                       className="w-10 h-10 rounded-md bg-blue-600 hover:bg-blue-700"
                     >
                       <ArrowRight className="h-5 w-5" />
                     </Button>
                   </div>
                </div>
             </div>
          </StepContainer>

          {/* Step 5: Description Input */}
          <StepContainer
            index={5}
            isActive={step === 5}
            step={step}
            onRef={el => sectionRefs.current[5] = el}
            onStepChange={setStep}
          >
             <div className="space-y-6 max-w-lg mx-auto w-full">
                <div className="space-y-2 text-center">
                   <h2 className="text-3xl font-bold text-slate-900">Add Context</h2>
                   <p className="text-lg text-slate-500">Describe the scene or meaning (Optional)</p>
                </div>

                <div className="space-y-4">
                   <Textarea
                     value={selections.description}
                     onChange={(e) => updateSelection('description', e.target.value)}
                     placeholder="e.g. A happy accident finding something beautiful..."
                     className="min-h-[120px] text-lg p-4 resize-none shadow-sm border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                     autoFocus={step === 5}
                   />

                   <KeywordPreview
                     text={selections.description}
                     word={selections.word}
                     existingKeywords={selections.keywords}
                     enableAI={selections.isolated === false}
                     isolatedBackground={selections.isolatedBackground}
                     onAddKeyword={handleAddKeyword}
                     onAddAllKeywords={handleAddAllKeywords}
                     onKeywordsGenerated={(keywords) => updateSelection('keywords', keywords)}
                     onIsolatedBackgroundChange={(value) => {
                       logger.log('[LandingWizard Step5] onIsolatedBackgroundChange called with value:', value);
                       updateSelection('isolatedBackground', value);
                     }}
                     onModeChange={(enabled) => {
                       logger.log('[LandingWizard Step5] onModeChange called with enabled:', enabled);
                       updateSelection('isolated', !enabled);
                     }}
                   />

                   <div className="space-y-2 pt-2 hidden">
                     <Label className="text-sm font-medium text-slate-600">Base Keywords (Optional)</Label>
                     <Input
                       value={selections.baseKeywords || ''}
                       onChange={(e) => updateSelection('baseKeywords', e.target.value)}
                       placeholder="e.g., childrens book illustration, 4k, watercolor"
                       className="text-base border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                     />
                     <p className="text-xs text-slate-400">These keywords will be added to all searches</p>
                   </div>

                   <Button
                     size="lg"
                     className="w-full h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                     onClick={handleFinalSubmit}
                   >
                     Search
                   </Button>
                </div>
             </div>
          </StepContainer>

       </div>
    </div>
  );
}
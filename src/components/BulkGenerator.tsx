import React, { useState, useEffect, useRef } from 'react';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Checkbox } from './ui/checkbox';
import {
  Wand2,
  Plus,
  Trash2,
  Grid,
  Image as ImageIcon,
  History,
  RefreshCw,
  CheckSquare,
  ExternalLink,
  Search,
  Loader2,
  ChevronDown,
  ArrowUpDown,
  Download,
  X,
  FileJson,
  FileSpreadsheet,
  Presentation,
  FileText,
  Video,
  Save,
  Check,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
  User,
  EllipsisVertical,
  Copy,
  Edit,
  ArrowDown,
  Share2,
  Link2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { toast } from "sonner";
import { getRandomShutterstockImage } from '../services/shutterstock';
import { getRandomUnsplashPhoto } from '../services/unsplash';
import { getRandomPexelsPhoto, getRandomPexelsVideo } from '../services/pexels';
import { getRandomPixabayImage, getRandomPixabayVideo } from '../services/pixabay';
import { getRandomFreepikImage, getRandomFreepikVideo } from '../services/freepik';
import { KeywordPreview } from './KeywordPreview';
import { optimizeKeywordsWithAI } from '../services/ai';
import { ProjectNameDialog } from './project/ProjectNameDialog';
import { ConfirmDeleteProjectDialog } from './project/ConfirmDeleteProjectDialog';

// Generate stock site search URL based on source and keywords
function generateStockSiteSearchUrl(source: string, keywords: string, mediaType: 'image' | 'video' = 'image'): string {
  const encodedKeywords = encodeURIComponent(keywords.trim());

  switch (source.toLowerCase()) {
    case 'unsplash':
      return `https://unsplash.com/s/photos/${encodedKeywords}`;
    case 'pexels':
      return mediaType === 'video'
        ? `https://www.pexels.com/search/videos/${encodedKeywords}/`
        : `https://www.pexels.com/search/${encodedKeywords}/`;
    case 'pixabay':
      return mediaType === 'video'
        ? `https://pixabay.com/videos/search/${encodedKeywords}/`
        : `https://pixabay.com/images/search/${encodedKeywords}/`;
    case 'freepik':
      return `https://www.freepik.com/search?format=search&query=${encodedKeywords}`;
    case 'shutterstock':
      return mediaType === 'video'
        ? `https://www.shutterstock.com/video/search/${encodedKeywords}`
        : `https://www.shutterstock.com/search/${encodedKeywords}`;
    default:
      return '';
  }
}

export interface BulkItem {
  id: string;
  number: number;
  word: string;
  description: string;
  keywords?: string; // AI-generated keywords for image search (space-separated)
  note: string;
  status: 'pending' | 'processing' | 'completed';
  imageUrl?: string;
  imageSource?: string; // 'Unsplash', 'Shutterstock', 'AI', etc.
  imageSourceUrl?: string; // Original URL to stock site
  artistName?: string; // Artist/Contributor name
  artistUrl?: string; // Artist profile URL
  history: Array<{ url: string; mediaType?: 'image' | 'video' }>;
  createdAt: number;
  isolated?: boolean; // Per-item isolate toggle - disables AI context when true
  isolatedBackground?: boolean; // Per-item isolated background toggle - adds "isolated background" to search
  generatedImages?: Array<{ url: string; source: string; sourceUrl: string }>; // Multiple generated images for selection
  selectedImageIndex?: number; // Index of the selected image from generatedImages
  mediaType?: 'image' | 'video'; // Media type for this item
  reviewStatus?: 'pending' | 'approved' | 'rejected'; // Review status for workflow
  reviewComment?: string; // Reviewer's comment
  usedImageUrls?: string[]; // Track used image URLs to prevent duplicates
  currentPage?: number; // Current page number for API pagination (per source)
}

export interface ReviewSession {
  id: string;
  shareToken: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'in-review' | 'approved' | 'completed';
  items: BulkItem[];
  viewCount: number;
  maxViews: number;
}

interface BulkGeneratorProps {
  items: BulkItem[];
  setItems: React.Dispatch<React.SetStateAction<BulkItem[]>>;
  onDelete: (ids: Set<string>) => void;
  onGenerate: (items: Array<{word: string, description: string}>, settings: { sources: string[], count: string, mediaType: 'image' | 'video' }) => void;
  onCancel: () => void;
  userPlan: 'free' | 'pro';
  credits: number;
  onUpgrade: () => void;
  onConsumeCredits: (amount: number) => void;
  initialBaseKeywords?: string;
  projects: Array<{ id: string; name: string; items: BulkItem[] }>;
  activeProjectId: string | null;
  addProject: (name: string) => void;
  renameProject: (id: string, newName: string) => void;
  duplicateProject: (id: string, newName: string) => void;
  deleteProject: (id: string) => void;
  switchActiveProject: (id: string) => void;
  user: {id: string, name: string, email: string, plan: 'free' | 'pro'} | null;
  onShowLogin: () => void;
}

type SortOption = 'newest' | 'oldest' | 'word-asc' | 'word-desc' | 'status';


interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (update: { word?: string; description?: string; addKeywords?: string; }) => void;
  selectedCount: number;
}

function BulkEditDialog({ open, onOpenChange, onSave, selectedCount }: BulkEditDialogProps) {
  const [word, setWord] = useState('');
  const [description, setDescription] = useState('');
  const [addKeywords, setAddKeywords] = useState('');

  const [isEditingWord, setIsEditingWord] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isAddingKeywords, setIsAddingKeywords] = useState(false);

  const handleSave = () => {
    const update: { word?: string; description?: string; addKeywords?: string; } = {};
    if (isEditingWord) {
      update.word = word;
    }
    if (isEditingDescription) {
      update.description = description;
    }
    if (isAddingKeywords) {
        update.addKeywords = addKeywords;
    }
    onSave(update);
  };

  useEffect(() => {
    if (!open) {
      setWord('');
      setDescription('');
      setAddKeywords('');
      setIsEditingWord(false);
      setIsEditingDescription(false);
      setIsAddingKeywords(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Edit {selectedCount} Items</DialogTitle>
          <DialogDescription>
            Only checked fields will be updated across all selected items.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Word */}
          <div className="flex items-start space-x-4">
            <Checkbox id="edit-word" checked={isEditingWord} onCheckedChange={(c) => setIsEditingWord(c as boolean)} className="mt-2" />
            <div className="space-y-1 flex-1">
              <Label htmlFor="word-input" className="font-semibold">Word / Subject</Label>
              <Input id="word-input" value={word} onChange={(e) => setWord(e.target.value)} disabled={!isEditingWord} placeholder="Enter new word" />
            </div>
          </div>
          {/* Description */}
          <div className="flex items-start space-x-4">
            <Checkbox id="edit-description" checked={isEditingDescription} onCheckedChange={(c) => setIsEditingDescription(c as boolean)} className="mt-2" />
            <div className="space-y-1 flex-1">
              <Label htmlFor="description-input" className="font-semibold">Description</Label>
              <Textarea id="description-input" value={description} onChange={(e) => setDescription(e.target.value)} disabled={!isEditingDescription} placeholder="Enter new description" />
            </div>
          </div>
          {/* Add Keywords */}
          <div className="flex items-start space-x-4">
            <Checkbox id="add-keywords" checked={isAddingKeywords} onCheckedChange={(c) => setIsAddingKeywords(c as boolean)} className="mt-2" />
            <div className="space-y-1 flex-1">
              <Label htmlFor="keywords-input" className="font-semibold">Add Keywords (Prefix)</Label>
              <Input id="keywords-input" value={addKeywords} onChange={(e) => setAddKeywords(e.target.value)} disabled={!isAddingKeywords} placeholder="e.g., watercolor, for kids" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ShareForReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewLink: string;
  onCreateSession: (expirationHours: number, maxViews: number) => void;
}

function ShareForReviewDialog({ open, onOpenChange, reviewLink, onCreateSession }: ShareForReviewDialogProps) {
  const [expirationHours, setExpirationHours] = useState('24');
  const [maxViews, setMaxViews] = useState('10');
  const [linkGenerated, setLinkGenerated] = useState(false);

  const handleGenerate = () => {
    const hours = parseInt(expirationHours) || 24;
    const views = parseInt(maxViews) || 10;
    onCreateSession(hours, views);
    setLinkGenerated(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(reviewLink);
    toast.success('Review link copied to clipboard!');
  };

  useEffect(() => {
    if (!open) {
      setLinkGenerated(false);
      setExpirationHours('24');
      setMaxViews('10');
    }
  }, [open]);

  useEffect(() => {
    if (reviewLink && open) {
      setLinkGenerated(true);
    }
  }, [reviewLink, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share for Review</DialogTitle>
          <DialogDescription>
            Create a shareable link for others to review your work. Reviewers can approve, reject, or comment on each item without logging in.
          </DialogDescription>
        </DialogHeader>

        {!linkGenerated ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expiration">Link Expiration (hours)</Label>
              <Select value={expirationHours} onValueChange={setExpirationHours}>
                <SelectTrigger id="expiration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="72">3 days</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxViews">Maximum Views</Label>
              <Select value={maxViews} onValueChange={setMaxViews}>
                <SelectTrigger id="maxViews">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 view</SelectItem>
                  <SelectItem value="5">5 views</SelectItem>
                  <SelectItem value="10">10 views</SelectItem>
                  <SelectItem value="25">25 views</SelectItem>
                  <SelectItem value="100">100 views</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600 space-y-1">
              <p className="font-medium text-slate-700">Security Features:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Link expires after set time or view limit</li>
                <li>No login required for reviewers</li>
                <li>SEO blocked (noindex/nofollow)</li>
                <li>Read-only access for reviewers</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Review Link</Label>
              <div className="flex gap-2">
                <Input
                  value={reviewLink}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-700">
              <p className="font-medium mb-1">Review link created successfully!</p>
              <p>Share this link with reviewers. They can view, approve, reject, and comment on each item.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600 space-y-1">
              <p className="font-medium text-slate-700">Settings:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Expires in: {expirationHours} hours</li>
                <li>Max views: {maxViews}</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {!linkGenerated ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate}>
                <Link2 className="h-4 w-4 mr-2" />
                Generate Link
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BulkGenerator({ items, setItems, onDelete, onGenerate, onCancel, userPlan, credits, onUpgrade, onConsumeCredits, initialBaseKeywords, projects, activeProjectId, addProject, renameProject, duplicateProject, deleteProject, switchActiveProject, user, onShowLogin }: BulkGeneratorProps) {
  const [targetCount, setTargetCount] = useState(items.length > 0 ? items.length : 1);
  const [focusNewRow, setFocusNewRow] = useState(false);
  const [columnMode, setColumnMode] = useState<'2col' | '3col'>('3col');
  // Set initial mediaType based on last item (most recently added from landing)
  const [mediaType, setMediaType] = useState<'image' | 'video'>(() => {
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      return lastItem.mediaType || 'image';
    }
    return 'image';
  });

  // Update mediaType when new items are added (e.g., from landing wizard)
  const prevItemsLengthRef = useRef(items.length);

  useEffect(() => {
    const currentLength = items.length;
    const prevLength = prevItemsLengthRef.current;

    // Only update when items are added (length increases)
    if (currentLength > prevLength && currentLength > 0) {
      // Get the newly added items
      const newItems = items.slice(prevLength);
      // Use the first new item's mediaType
      if (newItems.length > 0 && newItems[0]?.mediaType) {
        setMediaType(newItems[0].mediaType);
      }
    }

    prevItemsLengthRef.current = currentLength;
  }, [items]);

  // Separate settings for Image and Video tabs
  const [imageSettings, setImageSettings] = useState({
    sources: ['unsplash'],
    count: '1',
    baseKeywords: initialBaseKeywords || ''
  });

  const [videoSettings, setVideoSettings] = useState({
    sources: ['pexels'],
    count: '1',
    baseKeywords: ''
  });

  // Current settings based on active tab
  const currentSettings = mediaType === 'image' ? imageSettings : videoSettings;
  const setCurrentSettings = mediaType === 'image' ? setImageSettings : setVideoSettings;

  // Aliases for backwards compatibility
  const imageSource = currentSettings.sources;
  const imageCount = currentSettings.count;
  const baseKeywords = currentSettings.baseKeywords;

  const setImageSource = (sources: string[] | ((prev: string[]) => string[])) => {
    setCurrentSettings(prev => ({
      ...prev,
      sources: typeof sources === 'function' ? sources(prev.sources) : sources
    }));
  };

  const setImageCount = (count: string) => {
    setCurrentSettings(prev => ({ ...prev, count }));
  };

  const setBaseKeywords = (keywords: string) => {
    setCurrentSettings(prev => ({ ...prev, baseKeywords: keywords }));
  };


  // Update targetCount when switching tabs
  useEffect(() => {
    const currentTabItems = items.filter(item => {
      if (!item.mediaType) return mediaType === 'image'; // Old items default to image
      return item.mediaType === mediaType;
    });
    setTargetCount(currentTabItems.length || 1);
  }, [mediaType]); // Don't depend on items to avoid infinite loop

  // Selection & Sorting
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [pinnedItemId, setPinnedItemId] = useState<string | null>(null); // Single item selection

  // Dialogs
  const [selectionDialogItem, setSelectionDialogItem] = useState<BulkItem | null>(null);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [candidateUrls, setCandidateUrls] = useState<Array<{url: string, selected: boolean}>>([]);
  const [newCandidateUrl, setNewCandidateUrl] = useState('');
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);

  // Project Dialogs
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [showRenameProjectDialog, setShowRenameProjectDialog] = useState(false);
  const [showDuplicateProjectDialog, setShowDuplicateProjectDialog] = useState(false);
  const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false);

  // Review Session Dialogs
  const [showShareForReviewDialog, setShowShareForReviewDialog] = useState(false);
  const [reviewSessions, setReviewSessions] = useState<ReviewSession[]>([]);
  const [currentReviewLink, setCurrentReviewLink] = useState<string>('');

  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleAddNewProject = () => {
    let newProjectNumber = 1;
    const projectNumbers = projects
        .map(p => {
            const match = p.name.match(/^Project (\d+)$/);
            return match ? parseInt(match[1]) : 0;
        })
        .filter(n => n > 0);

    if (projects.length > 0) {
      newProjectNumber = (projectNumbers.length > 0 ? Math.max(...projectNumbers) : 0) + 1;
    }

    const newProjectName = `Project ${newProjectNumber}`;
    addProject(newProjectName);
  };

  // Handle adding candidate URL
  const handleAddCandidateUrl = () => {
    const trimmedUrl = newCandidateUrl.trim();

    if (!trimmedUrl) return;

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch {
      toast.error('Invalid URL format');
      return;
    }

    // Check if URL already exists
    if (candidateUrls.some(c => c.url === trimmedUrl)) {
      toast.info('This URL is already added');
      return;
    }

    setCandidateUrls(prev => [...prev, { url: trimmedUrl, selected: false }]);
    setNewCandidateUrl('');
    toast.success('Candidate added successfully');
  };

  // Handle selecting candidate
  const handleSelectCandidate = (index: number) => {
    setSelectedCandidateIndex(index);
    setCandidateUrls(prev => prev.map((c, i) => ({ ...c, selected: i === index })));
  };

  // Handle replacing with selected candidate
  const handleReplaceWithCandidate = () => {
    if (selectedCandidateIndex !== null && selectionDialogItem) {
      const selectedCandidate = candidateUrls[selectedCandidateIndex];

      setItems(prev => prev.map(item => {
        if (item.id === selectionDialogItem.id) {
          const newHistory = item.imageUrl ? [{ url: item.imageUrl, mediaType: item.mediaType }, ...item.history] : item.history;
          return {
            ...item,
            imageUrl: selectedCandidate.url,
            // Keep the original stock site name instead of "Manual Selection"
            imageSource: item.imageSource,
            imageSourceUrl: selectedCandidate.url,
            artistName: item.artistName,
            artistUrl: item.artistUrl,
            history: newHistory,
            status: 'completed'
          };
        }
        return item;
      }));

      toast.success('Image replaced with selected candidate');
      setSelectionDialogItem(null);
      setCandidateUrls([]);
      setSelectedCandidateIndex(null);
    }
  };

  // Generate unique share token
  const generateShareToken = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Handle creating review session
  const handleCreateReviewSession = (expirationHours: number, maxViews: number) => {
    const token = generateShareToken();
    const now = Date.now();
    const expiresAt = now + (expirationHours * 60 * 60 * 1000);

    const session: ReviewSession = {
      id: Date.now().toString(),
      shareToken: token,
      createdAt: now,
      expiresAt,
      status: 'pending',
      items: items.map(item => ({
        ...item,
        reviewStatus: 'pending'
      })),
      viewCount: 0,
      maxViews
    };

    setReviewSessions(prev => [...prev, session]);

    // Save to localStorage
    const existingSessions = JSON.parse(localStorage.getItem('reviewSessions') || '[]');
    localStorage.setItem('reviewSessions', JSON.stringify([...existingSessions, session]));

    // Generate review link
    const reviewLink = `${window.location.origin}/review/${token}`;
    setCurrentReviewLink(reviewLink);

    toast.success('Review link created successfully!');
  };

  // Initialize items when targetCount changes
  useEffect(() => {
    setItems(prev => {
      const current = [...prev];
      // Only count items that match current mediaType
      const currentTabItems = current.filter(item => {
        if (!item.mediaType) return mediaType === 'image'; // Old items default to image
        return item.mediaType === mediaType;
      });

      if (currentTabItems.length < targetCount) {
        // Add more items for current tab
        const needed = targetCount - currentTabItems.length;
        const maxNumber = currentTabItems.length > 0 ? Math.max(...currentTabItems.map(i => i.number || 0)) : 0;
        const newItems = Array(needed).fill(null).map((_, i) => ({
          id: Date.now().toString() + i,
          number: maxNumber + i + 1,
          word: '',
          description: '',
          note: '',
          status: 'pending' as const,
          history: [],
          createdAt: Date.now() + i,
          mediaType: mediaType // Assign current mediaType to new items
        }));
        return [...current, ...newItems];
      } else if (currentTabItems.length > targetCount) {
        // Remove excess items from current tab only
        const itemsToRemove = currentTabItems.slice(targetCount);
        const removeIds = new Set(itemsToRemove.map(i => i.id));
        return current.filter(item => !removeIds.has(item.id));
      }
      return current;
    });
  }, [targetCount, mediaType]);

  const handleUpdateItem = (id: string, field: keyof BulkItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds(new Set());
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.map(i => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkUpdate = (update: { word?: string; description?: string; addKeywords?: string; }) => {
    setItems(prev =>
      prev.map(item => {
        if (!selectedIds.has(item.id)) {
          return item; // Not selected, do nothing
        }

        let updatedItem = { ...item };
        if (update.word !== undefined) {
          updatedItem.word = update.word;
        }
        if (update.description !== undefined) {
          updatedItem.description = update.description;
        }

        // Handle adding keywords
        if (update.addKeywords && update.addKeywords.trim()) {
            const existingKeywords = updatedItem.keywords || '';
            updatedItem.keywords = `${update.addKeywords.trim()} ${existingKeywords}`.trim();
        }

        return updatedItem;
      })
    );
    toast.success(`Updated ${selectedIds.size} items.`);
    setIsBulkEditDialogOpen(false);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    onDelete(selectedIds);
    // setItems handled by parent via onDelete effect or passed down, but usually we just call onDelete and parent updates items.
    // However, since setItems is passed, we can update local view too if parent doesn't immediately.
    // But usually we rely on parent to update `items` prop.
    // Let's assume parent updates `items`.

    // Also update targetCount
    setTargetCount(prev => Math.max(1, prev - selectedIds.size));
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleImageLoad = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'completed' } : i));
  };

  // Direct editing - if item is selected, apply to all selected items
  const handleInputChange = (id: string, field: 'word' | 'description' | 'note', value: string) => {
    if (isSelectionMode && selectedIds.has(id) && selectedIds.size > 1) {
      // Apply to all selected items
      selectedIds.forEach(selectedId => {
        handleUpdateItem(selectedId, field, value);
      });
    } else {
      // Apply to single item
      handleUpdateItem(id, field, value);
    }
  };

  // Handle mode changes - apply to all selected if in selection mode
  const handleModeChange = (id: string, enabled: boolean) => {
    const value = !enabled;
    if (isSelectionMode && selectedIds.has(id) && selectedIds.size > 1) {
      selectedIds.forEach(selectedId => {
        handleUpdateItem(selectedId, 'isolated', value as any);
      });
    } else {
      handleUpdateItem(id, 'isolated', value as any);
    }
  };

  // Handle isolated background changes - apply to all selected if in selection mode
  const handleIsolatedBgChange = (id: string, value: boolean) => {
    if (isSelectionMode && selectedIds.has(id) && selectedIds.size > 1) {
      selectedIds.forEach(selectedId => {
        handleUpdateItem(selectedId, 'isolatedBackground', value as any);
      });
    } else {
      handleUpdateItem(id, 'isolatedBackground', value as any);
    }
  };

  // Handle keyword changes - apply to all selected if in selection mode
  const handleKeywordsChange = (id: string, newKeywords: string) => {
    if (isSelectionMode && selectedIds.has(id) && selectedIds.size > 1) {
      // Get the item being edited to find what changed
      const editedItem = items.find(i => i.id === id);
      if (!editedItem) return;

      // Compare old and new keywords to find changes
      const oldKeywordsArray = (editedItem.keywords || '').split(/[,\s]+/).filter(k => k);
      const newKeywordsArray = newKeywords.split(/[,\s]+/).filter(k => k);

      // Find added and removed keywords
      const addedKeywords = newKeywordsArray.filter(k => !oldKeywordsArray.includes(k));
      const removedKeywords = oldKeywordsArray.filter(k => !newKeywordsArray.includes(k));

      console.log(`[BulkGenerator] 🔄 Applying changes to ${selectedIds.size} selected items:`, {
        added: addedKeywords,
        removed: removedKeywords
      });

      // Apply the same changes to all selected items
      selectedIds.forEach(selectedId => {
        const item = items.find(i => i.id === selectedId);
        if (!item) return;

        // Get current keywords for this item
        let itemKeywordsArray = (item.keywords || '').split(/[,\s]+/).filter(k => k);

        // Remove keywords that were removed
        itemKeywordsArray = itemKeywordsArray.filter(k => !removedKeywords.includes(k));

        // Add keywords that were added (avoid duplicates)
        addedKeywords.forEach(k => {
          if (!itemKeywordsArray.includes(k)) {
            itemKeywordsArray.push(k);
          }
        });

        // Update the item with modified keywords
        const updatedKeywords = itemKeywordsArray.join(' ');
        handleUpdateItem(selectedId, 'keywords', updatedKeywords);
      });
    } else {
      handleUpdateItem(id, 'keywords', newKeywords);
    }
  };

  const handleAddKeywordToItem = (id: string, keyword: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const useEditMode = !!item.imageUrl || item.status === 'completed' || item.status === 'processing';
    const currentDesc = useEditMode ? (edits[id]?.description ?? item.description) : item.description;
    const newDesc = currentDesc ? `${currentDesc} ${keyword}` : keyword;

    handleInputChange(id, 'description', newDesc);
  };

  const handleAddAllKeywordsToItem = (id: string, keywords: string[]) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const useEditMode = !!item.imageUrl || item.status === 'completed' || item.status === 'processing';
    const currentDesc = useEditMode ? (edits[id]?.description ?? item.description) : item.description;
    const keywordsText = keywords.join(' ');
    const newDesc = currentDesc ? `${currentDesc} ${keywordsText}` : keywordsText;

    handleInputChange(id, 'description', newDesc);
  };


  // Mock Generation Logic
  const handleRegenerateItem = async (id: string, updatedData?: { word?: string, description?: string, keywords?: string }) => {
    const currentItem = items.find(i => i.id === id);
    if (!currentItem) return;

    const itemMediaType = currentItem.mediaType || mediaType;
    console.log(`[BulkGenerator] 🎬 handleRegenerateItem called for item ${id} - Item mediaType: ${itemMediaType}, Global mediaType: ${mediaType}`);

    // Free plan: unlimited access (no credit check)

    // Merge updatedData with currentItem, ensuring we use the latest keywords
    const item = updatedData ? { ...currentItem, ...updatedData } : currentItem;

    // Log the keywords being used for regeneration
    console.log(`[BulkGenerator] 🔑 Regenerating with keywords:`, item.keywords || 'none');

    if (!item.word) {
        toast.error("Please enter a word first");
        return;
    }

    // Free plan: no credit consumption

    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'processing', ...(updatedData || {}) } : i));

    // Generate search terms
    let searchTerms = '';

    // Check AI mode first - AI context takes priority over isolatedBackground
    if (!item.isolated) {
      // AI mode is enabled - use AI context (ignore isolatedBackground)
      if (item.keywords && item.keywords.trim().length > 0) {
        // Use existing keywords
        searchTerms = item.keywords;
        console.log('[BulkGenerator] ✅ AI mode - Using item keywords:', searchTerms);
      } else {
        // Generate new keywords with AI
        console.log('[BulkGenerator] 🤖 AI mode - Generating keywords with AI...');
        try {
          const aiResult = await optimizeKeywordsWithAI(item.description, item.word);
          if (aiResult && aiResult.searchQuery) {
            searchTerms = aiResult.searchQuery;
            console.log('[BulkGenerator] ✅ AI Success:', searchTerms);
          } else {
            throw new Error('AI returned empty result');
          }
        } catch (error) {
          console.log('[BulkGenerator] ⚠️ AI failed, using word fallback:', error);
          searchTerms = item.word || 'nature';
        }
      }
    } else if (item.isolatedBackground) {
      // Manual mode + Isolated background
      searchTerms = `${item.word} isolated background`;
      console.log('[BulkGenerator] 🎯 Manual mode - Isolated background:', searchTerms);
    } else if (item.keywords && item.keywords.trim().length > 0) {
      // Manual mode + keywords
      searchTerms = item.keywords;
      console.log('[BulkGenerator] ✅ Manual mode - Using keywords:', searchTerms);
    } else {
      // Manual mode without keywords - use word only
      searchTerms = item.word;
      console.log('[BulkGenerator] 🎯 Manual mode - Word only:', searchTerms);
    }

    if (!searchTerms || searchTerms.trim().length === 0) {
      searchTerms = item.word || 'nature';
      console.log('[BulkGenerator] ⚠️ Empty keywords, using fallback:', searchTerms);
    }

    let finalSearchTerms = searchTerms;
    // Apply base keywords only in AI mode (isolated = false)
    if (!item.isolated && baseKeywords && baseKeywords.trim()) {
      finalSearchTerms = `${baseKeywords.trim()} ${searchTerms}`;
    }

    const count = parseInt(imageCount) || 1;
    const generatedImages: Array<{ url: string; source: string; sourceUrl: string }> = [];
    let mainImageUrl = '';
    let mainResultSource = 'AI';
    let mainImageSourceUrl = '';
    let mainArtistName = '';
    let mainArtistUrl = '';

    const searchAllSources = async (searchTerms: string, selectedSources: string[]) => {
      console.log('[BulkGenerator] 🔍 Searching all sources in parallel:', {
        sources: selectedSources,
        searchTerms,
        mediaType: itemMediaType
      });

      // Get tracking data from current item
      const usedUrls = currentItem.usedImageUrls || [];
      let currentPage = currentItem.currentPage || 1;

      const searchPromises = selectedSources.map(async (source) => {
        try {
          console.log(`[BulkGenerator] 🔍 Trying ${source}...`);

          switch (source) {
            case 'unsplash':
              let unsplashResult = await getRandomUnsplashPhoto(searchTerms, { excludeUrls: usedUrls, page: currentPage });
              // If page exhausted, try next page
              if (!unsplashResult) {
                console.log(`[BulkGenerator] Unsplash page ${currentPage} exhausted, trying page ${currentPage + 1}`);
                unsplashResult = await getRandomUnsplashPhoto(searchTerms, { excludeUrls: [], page: currentPage + 1 });
                if (unsplashResult) {
                  currentPage++;
                }
              }
              if (unsplashResult) {
                return {
                  source: 'Unsplash',
                  imageUrl: unsplashResult.imageUrl,
                  sourceUrl: unsplashResult.sourceUrl,
                  photographer: unsplashResult.photographer,
                  photographerUrl: unsplashResult.photographerUrl
                };
              }
              break;

            case 'pexels':
              console.log(`[BulkGenerator] Pexels search - mediaType: ${itemMediaType}`);
              let pexelsResult = itemMediaType === 'video'
                ? await getRandomPexelsVideo(searchTerms, { excludeUrls: usedUrls, page: currentPage })
                : await getRandomPexelsPhoto(searchTerms, { excludeUrls: usedUrls, page: currentPage });
              // If page exhausted, try next page
              if (!pexelsResult) {
                console.log(`[BulkGenerator] Pexels page ${currentPage} exhausted, trying page ${currentPage + 1}`);
                pexelsResult = itemMediaType === 'video'
                  ? await getRandomPexelsVideo(searchTerms, { excludeUrls: [], page: currentPage + 1 })
                  : await getRandomPexelsPhoto(searchTerms, { excludeUrls: [], page: currentPage + 1 });
                if (pexelsResult) {
                  currentPage++;
                }
              }
              if (pexelsResult) {
                const url = itemMediaType === 'video' ? pexelsResult.videoUrl : pexelsResult.imageUrl;
                console.log(`[BulkGenerator] Pexels result - URL: ${url}, mediaType: ${itemMediaType}`);
                return {
                  source: 'Pexels',
                  imageUrl: url,
                  sourceUrl: pexelsResult.sourceUrl,
                  photographer: pexelsResult.photographer,
                  photographerUrl: pexelsResult.photographerUrl
                };
              }
              break;

            case 'pixabay':
              let pixabayResult = itemMediaType === 'video'
                ? await getRandomPixabayVideo(searchTerms, { excludeUrls: usedUrls, page: currentPage })
                : await getRandomPixabayImage(searchTerms, { excludeUrls: usedUrls, page: currentPage });
              // If page exhausted, try next page
              if (!pixabayResult) {
                console.log(`[BulkGenerator] Pixabay page ${currentPage} exhausted, trying page ${currentPage + 1}`);
                pixabayResult = itemMediaType === 'video'
                  ? await getRandomPixabayVideo(searchTerms, { excludeUrls: [], page: currentPage + 1 })
                  : await getRandomPixabayImage(searchTerms, { excludeUrls: [], page: currentPage + 1 });
                if (pixabayResult) {
                  currentPage++;
                }
              }
              if (pixabayResult) {
                return {
                  source: 'Pixabay',
                  imageUrl: itemMediaType === 'video' ? pixabayResult.videoUrl : pixabayResult.imageUrl,
                  sourceUrl: pixabayResult.sourceUrl,
                  photographer: pixabayResult.photographer,
                  photographerUrl: pixabayResult.photographerUrl
                };
              }
              break;

            case 'freepik':
              const freepikResult = itemMediaType === 'video'
                ? await getRandomFreepikVideo(searchTerms)
                : await getRandomFreepikImage(searchTerms);
              if (freepikResult) {
                return {
                  source: 'Freepik',
                  imageUrl: itemMediaType === 'video' ? freepikResult.videoUrl : freepikResult.imageUrl,
                  sourceUrl: freepikResult.sourceUrl,
                  photographer: freepikResult.photographer,
                  photographerUrl: freepikResult.photographerUrl
                };
              }
              break;

            case 'shutterstock':
              const shutterstockImage = await getRandomShutterstockImage(searchTerms);
              if (shutterstockImage) {
                return {
                  source: 'Shutterstock',
                  imageUrl: shutterstockImage,
                  sourceUrl: shutterstockImage
                };
              }
              break;
          }

          console.log(`[BulkGenerator] ⚠️ ${source} returned no results`);
          return null;
        } catch (error) {
          console.error(`[BulkGenerator] ❌ Error fetching from ${source}:`, error);
          return null;
        }
      });

      const results = await Promise.all(searchPromises);
      const validResults = results.filter(r => r !== null);
      console.log(`[BulkGenerator] ✅ Got ${validResults.length} results from ${selectedSources.length} sources`);
      return { results: validResults, updatedPage: currentPage };
    };

    const generateSingleImage = async (preferredSource?: string) => {
      let imageUrl = '';
      let resultSource = 'AI';
      let imageSourceUrl = '';
      let photographerName = '';
      let photographerUrl = '';

      // Get tracking data from current item
      const usedUrls = currentItem.usedImageUrls || [];
      const currentPage = currentItem.currentPage || 1;

      try {
        if (preferredSource) {
          console.log(`[BulkGenerator] 🎯 Using preferred source: ${preferredSource}`);

          switch (preferredSource) {
            case 'unsplash':
              const unsplashResult = await getRandomUnsplashPhoto(finalSearchTerms, { excludeUrls: usedUrls, page: currentPage });
              if (unsplashResult) {
                return {
                  imageUrl: unsplashResult.imageUrl,
                  resultSource: 'Unsplash',
                  imageSourceUrl: unsplashResult.sourceUrl,
                  photographerName: unsplashResult.photographer,
                  photographerUrl: unsplashResult.photographerUrl
                };
              }
              break;

            case 'pexels':
              const pexelsResult = itemMediaType === 'video'
                ? await getRandomPexelsVideo(finalSearchTerms, { excludeUrls: usedUrls, page: currentPage })
                : await getRandomPexelsPhoto(finalSearchTerms, { excludeUrls: usedUrls, page: currentPage });
              if (pexelsResult) {
                return {
                  imageUrl: itemMediaType === 'video' ? pexelsResult.videoUrl : pexelsResult.imageUrl,
                  resultSource: 'Pexels',
                  imageSourceUrl: pexelsResult.sourceUrl,
                  photographerName: pexelsResult.photographer,
                  photographerUrl: pexelsResult.photographerUrl
                };
              }
              break;

            case 'pixabay':
              const pixabayResult = itemMediaType === 'video'
                ? await getRandomPixabayVideo(finalSearchTerms, { excludeUrls: usedUrls, page: currentPage })
                : await getRandomPixabayImage(finalSearchTerms, { excludeUrls: usedUrls, page: currentPage });
              if (pixabayResult) {
                return {
                  imageUrl: itemMediaType === 'video' ? pixabayResult.videoUrl : pixabayResult.imageUrl,
                  resultSource: 'Pixabay',
                  imageSourceUrl: pixabayResult.sourceUrl,
                  photographerName: pixabayResult.photographer,
                  photographerUrl: pixabayResult.photographerUrl
                };
              }
              break;

            case 'freepik':
              const freepikResult = itemMediaType === 'video'
                ? await getRandomFreepikVideo(finalSearchTerms)
                : await getRandomFreepikImage(finalSearchTerms);
              if (freepikResult) {
                return {
                  imageUrl: itemMediaType === 'video' ? freepikResult.videoUrl : freepikResult.imageUrl,
                  resultSource: 'Freepik',
                  imageSourceUrl: freepikResult.sourceUrl,
                  photographerName: freepikResult.photographer,
                  photographerUrl: freepikResult.photographerUrl
                };
              }
              break;

            case 'shutterstock':
              const shutterstockImage = await getRandomShutterstockImage(finalSearchTerms);
              if (shutterstockImage) {
                return {
                  imageUrl: shutterstockImage,
                  resultSource: 'Shutterstock',
                  imageSourceUrl: shutterstockImage
                };
              }
              break;
          }
        }

        if (itemMediaType === 'video') {
          imageUrl = `https://www.w3schools.com/html/mov_bbb.mp4`;
          resultSource = 'AI Generated Video';
        } else {
          imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalSearchTerms)}%20stock%20photo?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
          resultSource = 'AI Generated Image';
        }
        imageSourceUrl = '';

        return { imageUrl, resultSource, imageSourceUrl, photographerName, photographerUrl };
      } catch (error) {
        console.error('[BulkGenerator] Error fetching image/video:', error);
        if (itemMediaType === 'video') {
          imageUrl = `https://www.w3schools.com/html/mov_bbb.mp4`;
          resultSource = 'AI Generated Video';
        } else {
          imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalSearchTerms)}%20stock%20photo?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
          resultSource = 'AI Generated Image';
        }
        imageSourceUrl = '';
        return { imageUrl, resultSource, imageSourceUrl, photographerName, photographerUrl };
      }
    };

    console.log(`[BulkGenerator] Generating ${count} ${itemMediaType}(s)...`);

    const { results: allResults, updatedPage } = await searchAllSources(finalSearchTerms, Array.from(imageSource));

    if (count === 1) {
      if (allResults.length > 0) {
        const sourcePriority = ['unsplash', 'pexels', 'pixabay', 'freepik', 'shutterstock'];
        allResults.sort((a, b) => {
          const aPriority = sourcePriority.indexOf(a.source.toLowerCase());
          const bPriority = sourcePriority.indexOf(b.source.toLowerCase());
          return aPriority - bPriority;
        });

        const bestResult = allResults[0];
        mainImageUrl = bestResult.imageUrl;
        mainResultSource = bestResult.source;
        mainImageSourceUrl = bestResult.sourceUrl;
        mainArtistName = bestResult.photographer || '';
        mainArtistUrl = bestResult.photographerUrl || '';
        generatedImages.push({
          url: bestResult.imageUrl,
          source: bestResult.source,
          sourceUrl: bestResult.sourceUrl
        });

        console.log(`[BulkGenerator] ✅ Selected best result from ${mainResultSource}`);
      } else {
        const fallback = await generateSingleImage();
        mainImageUrl = fallback.imageUrl;
        mainResultSource = fallback.resultSource;
        mainImageSourceUrl = fallback.imageSourceUrl;
        mainArtistName = fallback.photographerName || '';
        mainArtistUrl = fallback.photographerUrl || '';
        generatedImages.push({
          url: fallback.imageUrl,
          source: fallback.resultSource,
          sourceUrl: fallback.imageSourceUrl
        });
      }
    } else {
      if (allResults.length > 0) {
        for (let i = 0; i < count; i++) {
          const resultIndex = i % allResults.length;
          const result = allResults[resultIndex];
          const newResult = await generateSingleImage(result.source.toLowerCase());
          generatedImages.push({
            url: newResult.imageUrl,
            source: newResult.resultSource,
            sourceUrl: newResult.imageSourceUrl
          });

          if (i === 0) {
            mainImageUrl = newResult.imageUrl;
            mainResultSource = newResult.resultSource;
            mainImageSourceUrl = newResult.imageSourceUrl;
            mainArtistName = newResult.photographerName || '';
            mainArtistUrl = newResult.photographerUrl || '';
          }
        }

        console.log(`[BulkGenerator] ✅ Generated ${count} images from different sources`);
      } else {
        for (let i = 0; i < count; i++) {
          const result = await generateSingleImage();
          generatedImages.push({
            url: result.imageUrl,
            source: result.resultSource,
            sourceUrl: result.imageSourceUrl
          });
          if (i === 0) {
            mainImageUrl = result.imageUrl;
            mainResultSource = result.resultSource;
            mainImageSourceUrl = result.imageSourceUrl;
            mainArtistName = result.photographerName || '';
            mainArtistUrl = result.photographerUrl || '';
          }
        }
      }
    }

    console.log('🎨 [DEBUG] Saving artist data:', {
      artistName: mainArtistName,
      artistUrl: mainArtistUrl,
      imageSource: mainResultSource
    });

    setItems(prev => prev.map(i => {
        if (i.id === id) {
            const allGeneratedImages = generatedImages;
            const newHistory = i.imageUrl ? [{ url: i.imageUrl, mediaType: i.mediaType }, ...i.history] : i.history;

            // Update tracking data for duplicate prevention
            const currentUsedUrls = i.usedImageUrls || [];
            const updatedUsedUrls = mainImageUrl ? [...currentUsedUrls, mainImageUrl] : currentUsedUrls;

            const updatedItem = {
                ...i,
                status: 'completed',
                imageUrl: mainImageUrl,
                imageSource: mainResultSource,
                imageSourceUrl: mainImageSourceUrl,
                artistName: mainArtistName,
                artistUrl: mainArtistUrl,
                generatedImages: allGeneratedImages, // Always include for carousel
                selectedImageIndex: 0,
                history: newHistory,
                mediaType: itemMediaType,
                usedImageUrls: updatedUsedUrls, // Track used image URLs
                currentPage: updatedPage // Update current page for pagination
            };

            console.log('✅ [DEBUG] Updated item:', {
              id: updatedItem.id,
              artistName: updatedItem.artistName,
              artistUrl: updatedItem.artistUrl,
              usedImageCount: updatedUsedUrls.length,
              currentPage: updatedPage
            });

            return updatedItem;
        }
        return i;
    }));
  };

  // Helper functions for stock type checking
  const isFreeStock = (source: string) => {
    const freeSources = ['unsplash', 'pexels', 'pixabay'];
    return freeSources.includes(source.toLowerCase());
  };

  const isPaidStock = (source: string) => {
    const paidSources = ['shutterstock', 'freepik'];
    return paidSources.includes(source.toLowerCase());
  };

  const handleExportData = (format: 'json' | 'csv' | 'excel' | 'ppt' | 'sheets') => {
    const timestamp = new Date().toISOString().slice(0,10);

    if (format === 'ppt') {
        toast.info("PowerPoint export requires server-side processing");
        return;
    }

    if (format === 'sheets') {
        // For Google Sheets, we'll export as CSV and provide instructions
        toast.info("Exporting CSV for Google Sheets import");
        // Fall through to CSV export
        format = 'csv';
    }

    if (format === 'json') {
        const dataStr = JSON.stringify(items, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `bulk-generator-export-${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Exported as JSON");
    } else {
        // CSV or Excel (CSV based) with FREE vs PAID differentiation
        const headers = [
            "ID",
            "Word",
            "Description",
            "Keywords",
            "Media Type",
            "Stock Type",
            "Source",
            "Source URL",
            "Image/Video URL",
            "Photographer",
            "Photographer URL",
            "License Info",
            "Export Permission",
            "Notes",
            "Status",
            "Created At"
        ];

        const rows = items.map(item => {
            const source = item.imageSource?.[0] || 'Unknown';
            const isFree = isFreeStock(source);
            const isPaid = isPaidStock(source);

            // Determine stock type and export permission
            let stockType = 'Unknown';
            let exportPermission = 'N/A';
            let licenseInfo = '';
            let imageUrlForExport = '';

            if (isFree) {
                stockType = 'FREE';
                exportPermission = 'Preview & export thumbnails allowed';
                licenseInfo = 'Free stock – Check license before use';
                // For free sources, include the actual image URL
                imageUrlForExport = item.imageUrl || '';
            } else if (isPaid) {
                stockType = 'PAID';
                exportPermission = 'Preview only · export links only';
                licenseInfo = 'Paid stock – License required';
                // For paid sources, only include the source URL, not the image
                imageUrlForExport = item.imageSourceUrl || '';
            } else {
                stockType = 'Unknown';
                exportPermission = 'Check license';
                licenseInfo = 'Unknown source – Verify licensing';
                imageUrlForExport = item.imageUrl || '';
            }

            return [
                item.id,
                `"${(item.word || '').replace(/"/g, '""')}"`,
                `"${(item.description || '').replace(/"/g, '""')}"`,
                `"${(item.keywords || '').replace(/"/g, '""')}"`,
                item.mediaType || 'image',
                stockType,
                source,
                item.imageSourceUrl || "",
                imageUrlForExport,
                item.artistName || "",
                item.artistUrl || "",
                licenseInfo,
                exportPermission,
                `"${(item.note || '').replace(/"/g, '""')}"`,
                item.status,
                new Date(item.createdAt).toISOString()
            ];
        });

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        // Add BOM for Excel UTF-8 compatibility
        const bom = "\uFEFF";
        const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `bulk-generator-export-${timestamp}.${format === 'excel' ? 'csv' : 'csv'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        const freeCount = items.filter(item => isFreeStock(item.imageSource?.[0] || '')).length;
        const paidCount = items.filter(item => isPaidStock(item.imageSource?.[0] || '')).length;

        toast.success(`Exported ${items.length} items (${freeCount} FREE, ${paidCount} PAID) as ${format === 'excel' ? 'Excel (CSV)' : 'CSV'}`);
    }
  };

  const handleExtractImages = async () => {
    // Filter items that have a word but NO image (exclude Landing generated ones or already generated ones)
    const itemsToProcess = items.filter(i => i.word.trim() && !i.imageUrl);

    if (itemsToProcess.length === 0) {
        toast.info("All items already have images or are empty");
        return;
    }

    // Free plan: unlimited access (no credit check or consumption)

    // Set status to processing
    const processingIds = new Set(itemsToProcess.map(i => i.id));
    setItems(prev => prev.map(i => processingIds.has(i.id) ? { ...i, status: 'processing' } : i));

    // Process each item with AI optimization and selected sources
    const processItem = async (item: BulkItem) => {
        // Generate search terms
        let searchTerms = '';

        // Check AI mode first - AI context takes priority over isolatedBackground
        if (!item.isolated) {
            // AI mode is enabled - use AI context (ignore isolatedBackground)
            if (item.keywords && item.keywords.trim().length > 0) {
                // Use existing keywords
                searchTerms = item.keywords;
                console.log('[BulkGenerator Extract] ✅ AI mode - Using existing keywords:', searchTerms);
            } else {
                // Generate new keywords with AI
                console.log('[BulkGenerator Extract] 🤖 AI mode - Generating with AI...');
                try {
                    const aiResult = await optimizeKeywordsWithAI(item.description, item.word);
                    if (aiResult && aiResult.searchQuery) {
                        searchTerms = aiResult.searchQuery;
                        console.log('[BulkGenerator Extract] ✅ AI Success:', searchTerms);
                    } else {
                        throw new Error('AI returned empty result');
                    }
                } catch (error) {
                    console.log('[BulkGenerator Extract] ⚠️ AI failed, using word fallback:', error);
                    searchTerms = item.word || 'nature';
                }
            }
        } else if (item.isolatedBackground) {
            // Manual mode + Isolated background
            searchTerms = `${item.word} isolated background`;
            console.log('[BulkGenerator Extract] 🎯 Manual mode - Isolated background:', searchTerms);
        } else if (item.keywords && item.keywords.trim().length > 0) {
            // Manual mode + keywords
            searchTerms = item.keywords;
            console.log('[BulkGenerator Extract] ✅ Manual mode - Using keywords:', searchTerms);
        } else {
            // Manual mode without keywords - use word only
            searchTerms = item.word;
            console.log('[BulkGenerator Extract] 🎯 Manual mode - Word only:', searchTerms);
        }

        // Ensure searchTerms is not empty
        if (!searchTerms || searchTerms.trim().length === 0) {
            searchTerms = item.word || 'nature';
            console.log('[BulkGenerator Extract] ⚠️ Empty keywords, using fallback:', searchTerms);
        }

        // Prepend base keywords only in AI mode (isolated = false)
        let finalSearchTerms = searchTerms;
        if (!item.isolated && baseKeywords && baseKeywords.trim()) {
          finalSearchTerms = `${baseKeywords.trim()} ${searchTerms}`;
        }

        // Generate multiple images based on imageCount setting
        const count = parseInt(imageCount) || 1;
        const generatedImages: string[] = [];
        let mainImageUrl = '';
        let mainResultSource = 'AI';
        let mainImageSourceUrl = '';
        let mainArtistName = '';
        let mainArtistUrl = '';

        const generateSingleImage = async (itemMediaType: 'image' | 'video') => {
          let imageUrl = '';
          let resultSource = 'AI';
          let imageSourceUrl = '';
          let artistName = '';
          let artistUrl = '';

          try {
            // Try Unsplash if selected (Image only)
            if (itemMediaType === 'image' && imageSource.includes('unsplash')) {
              const unsplashResult = await getRandomUnsplashPhoto(finalSearchTerms);
              if (unsplashResult) {
                return {
                  imageUrl: unsplashResult.imageUrl,
                  resultSource: 'Unsplash',
                  imageSourceUrl: unsplashResult.sourceUrl,
                  artistName: unsplashResult.photographer,
                  artistUrl: unsplashResult.photographerUrl
                };
              }
            }

            // Try Pexels if selected
            if (imageSource.includes('pexels')) {
              const pexelsResult = itemMediaType === 'video'
                ? await getRandomPexelsVideo(finalSearchTerms)
                : await getRandomPexelsPhoto(finalSearchTerms);
              if (pexelsResult) {
                const url = itemMediaType === 'video' ? pexelsResult.videoUrl : pexelsResult.imageUrl;
                return {
                  imageUrl: url,
                  resultSource: 'Pexels',
                  imageSourceUrl: pexelsResult.sourceUrl,
                  artistName: pexelsResult.photographer,
                  artistUrl: pexelsResult.photographerUrl
                };
              }
            }

            // Try Pixabay if selected
            if (imageSource.includes('pixabay')) {
              const pixabayResult = itemMediaType === 'video'
                ? await getRandomPixabayVideo(finalSearchTerms)
                : await getRandomPixabayImage(finalSearchTerms);
              if (pixabayResult) {
                const url = itemMediaType === 'video' ? pixabayResult.videoUrl : pixabayResult.imageUrl;
                return {
                  imageUrl: url,
                  resultSource: 'Pixabay',
                  imageSourceUrl: pixabayResult.sourceUrl,
                  artistName: pixabayResult.photographer,
                  artistUrl: pixabayResult.photographerUrl
                };
              }
            }

            // Try Freepik if selected
            if (imageSource.includes('freepik')) {
              const freepikResult = itemMediaType === 'video'
                ? await getRandomFreepikVideo(finalSearchTerms)
                : await getRandomFreepikImage(finalSearchTerms);
              if (freepikResult) {
                const url = itemMediaType === 'video' ? freepikResult.videoUrl : freepikResult.imageUrl;
                return {
                  imageUrl: url,
                  resultSource: 'Freepik',
                  imageSourceUrl: freepikResult.sourceUrl,
                  artistName: freepikResult.photographer,
                  artistUrl: freepikResult.photographerUrl
                };
              }
            }

            // Try Shutterstock if selected (Image only in current implementation)
            if (itemMediaType === 'image' && imageSource.includes('shutterstock')) {
              const shutterstockImage = await getRandomShutterstockImage(finalSearchTerms);
              if (shutterstockImage) {
                return {
                  imageUrl: shutterstockImage,
                  resultSource: 'Shutterstock',
                  imageSourceUrl: shutterstockImage,
                  artistName: '',
                  artistUrl: ''
                };
              }
            }

            // Fallback to AI-generated image/video if no source selected or all failed
            if (itemMediaType === 'video') {
              imageUrl = `https://www.w3schools.com/html/mov_bbb.mp4`; // Placeholder for AI-generated video
              resultSource = 'AI Generated Video';
            } else {
              imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalSearchTerms)}%20stock%20photo?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 100000) + parseInt(item.id)}`;
              resultSource = 'AI Generated Image';
            }
            imageSourceUrl = '';
            artistName = '';
            artistUrl = '';

            return { imageUrl, resultSource, imageSourceUrl, artistName, artistUrl };
          } catch (error) {
            console.error('[BulkGenerator Extract] Error fetching media:', error);
            if (itemMediaType === 'video') {
              imageUrl = `https://www.w3schools.com/html/mov_bbb.mp4`; // Placeholder for AI-generated video
              resultSource = 'AI Generated Video';
            } else {
              imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalSearchTerms)}%20stock%20photo?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 100000) + parseInt(item.id)}`;
              resultSource = 'AI Generated Image';
            }
            imageSourceUrl = '';
            artistName = '';
            artistUrl = '';
            return { imageUrl, resultSource, imageSourceUrl, artistName, artistUrl };
          }
        };

        // Generate multiple images
        console.log(`[BulkGenerator Extract] Generating ${count} ${mediaType}(s) for ${item.word}...`);
        for (let i = 0; i < count; i++) {
          const result = await generateSingleImage(mediaType);
          generatedImages.push(result.imageUrl);
          if (i === 0) {
            mainImageUrl = result.imageUrl;
            mainResultSource = result.resultSource;
            mainImageSourceUrl = result.imageSourceUrl;
            mainArtistName = result.artistName || '';
            mainArtistUrl = result.artistUrl || '';
          }
        }

        // Store all generated images for carousel selection
        const allGeneratedImages = generatedImages.map((url, idx) => ({
            url,
            source: idx === 0 ? mainResultSource : (mediaType === 'video' ? 'AI Generated Video' : 'AI Generated Image'),
            sourceUrl: idx === 0 ? mainImageSourceUrl : ''
        }));


        return {
            id: item.id,
            imageUrl: mainImageUrl,
            imageSource: mainResultSource,
            imageSourceUrl: mainImageSourceUrl,
            artistName: mainArtistName,
            artistUrl: mainArtistUrl,
            generatedImages: allGeneratedImages, // Always include for carousel
            selectedImageIndex: 0,
            history: item.history,
            mediaType: mediaType
        };
    };

    // Process all items in parallel with a small delay for batch effect
    setTimeout(async () => {
        try {
            const results = await Promise.all(itemsToProcess.map(item => processItem(item)));

            // Update all items at once
            setItems(prev => prev.map(item => {
                const result = results.find(r => r.id === item.id);
                if (result) {
                    return {
                        ...item,
                        status: 'completed',
                        imageUrl: result.imageUrl,
                        imageSource: result.imageSource,
                        imageSourceUrl: result.imageSourceUrl,
                        artistName: result.artistName,
                        artistUrl: result.artistUrl,
                        generatedImages: result.generatedImages,
                        selectedImageIndex: result.selectedImageIndex,
                        history: result.history,
                        mediaType: result.mediaType
                    };
                }
                return item;
            }));

            const sourceCounts = results.reduce((acc, r) => {
                acc[r.imageSource] = (acc[r.imageSource] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const sourcesSummary = Object.entries(sourceCounts)
                .map(([source, count]) => `${source}: ${count}`)
                .join(', ');

            toast.success(`Generated ${mediaType === 'video' ? 'videos' : 'images'} for ${itemsToProcess.length} items (${sourcesSummary})`);
        } catch (error) {
            console.error('[BulkGenerator Extract] Batch processing error:', error);
            toast.error('Some images failed to generate');
        }
    }, 2000);
  };

  // Sorting Logic - Filter items by media type
  const filteredItems = (items || []).filter(item => {
    if (!item.mediaType) return mediaType === 'image'; // Old items default to image
    return item.mediaType === mediaType;
  });

  const sortedItems = [...(filteredItems || [])].sort((a, b) => {
    if (sortBy === 'word-asc') return a.word.localeCompare(b.word);
    if (sortBy === 'word-desc') return b.word.localeCompare(a.word);
    if (sortBy === 'status') return a.status.localeCompare(b.status);
    if (sortBy === 'oldest') return a.createdAt - b.createdAt;
    return b.createdAt - a.createdAt; // newest
  });

  const maxCreatedAt = (items || []).length > 0 ? Math.max(...(items || []).map(i => i.createdAt)) : 0;
  
  const showVisuals = (items || []).some(i => i.status === 'processing' || i.status === 'completed' || !!i.imageUrl);

  return (
    <>
    <div className="max-w-full mx-auto flex gap-0 p-0 h-screen">
      {/* Left: Settings Panel (Fixed on Scroll) */}
      <div className="w-64 flex-shrink-0 h-full">
        <div className="h-full overflow-y-auto flex flex-col">
          <Card className="border-slate-200 shadow-none bg-white flex flex-col h-full rounded-none border-y-0 border-l-0">
        {/* Home Button */}
        <div className="px-4 py-3 border-b border-slate-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="w-full justify-start text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>

        <CardContent className="pt-0 flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end justify-between">
             <div className="space-y-4 flex-1 w-full">
                {/* Image/Video Toggle */}
                <div className="mb-4">
                   <Tabs value={mediaType} onValueChange={(v) => setMediaType(v as any)} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="image" className="text-xs">
                           <ImageIcon className="h-3.5 w-3.5 mr-2" />
                           Image
                        </TabsTrigger>
                        <TabsTrigger value="video" className="text-xs">
                           <Video className="h-3.5 w-3.5 mr-2" />
                           Video
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                </div>

                <div className="space-y-7">
                   {/* Sources */}
                   <div className="space-y-2 pt-5">
                     <Label className="text-xs font-medium text-slate-500 uppercase">
                       Sources<span className="text-red-500 text-xs font-bold ml-0.5">*</span>
                     </Label>
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="outline" className="w-full justify-between font-normal h-8 px-3 rounded bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300 focus:bg-white focus:border-slate-300">
                            {imageSource.length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                {imageSource.slice(0, 3).map(s => (
                                    <Badge key={s} variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-slate-50 text-slate-700 border border-slate-200">
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </Badge>
                                ))}
                                {imageSource.length > 3 && (
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal text-slate-500">
                                        +{imageSource.length - 3}
                                    </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-xs">Select sources...</span>
                            )}
                            <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent className="w-[200px]" align="start">
                         <DropdownMenuLabel>Free Sources</DropdownMenuLabel>
                         <DropdownMenuSeparator />
                         {mediaType === 'image' ? (
                           <>
                             <DropdownMenuCheckboxItem
                                checked={imageSource.includes('unsplash')}
                                onCheckedChange={(c) => setImageSource(p => c ? [...p, 'unsplash'] : p.filter(s => s !== 'unsplash'))}
                             >
                               Unsplash
                             </DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem
                                checked={imageSource.includes('pexels')}
                                onCheckedChange={(c) => setImageSource(p => c ? [...p, 'pexels'] : p.filter(s => s !== 'pexels'))}
                             >
                               Pexels
                             </DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem
                                checked={imageSource.includes('pixabay')}
                                onCheckedChange={(c) => setImageSource(p => c ? [...p, 'pixabay'] : p.filter(s => s !== 'pixabay'))}
                             >
                               Pixabay
                             </DropdownMenuCheckboxItem>
                             <DropdownMenuSeparator />
                             <DropdownMenuLabel>Premium Sources</DropdownMenuLabel>
                             <DropdownMenuSeparator />
                             <DropdownMenuCheckboxItem
                                checked={imageSource.includes('shutterstock')}
                                onCheckedChange={(c) => setImageSource(p => c ? [...p, 'shutterstock'] : p.filter(s => s !== 'shutterstock'))}
                             >
                               Shutterstock
                             </DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem
                                checked={imageSource.includes('getty')}
                                onCheckedChange={(c) => setImageSource(p => c ? [...p, 'getty'] : p.filter(s => s !== 'getty'))}
                             >
                               Getty Images
                             </DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem
                                checked={imageSource.includes('adobestock')}
                                onCheckedChange={(c) => setImageSource(p => c ? [...p, 'adobestock'] : p.filter(s => s !== 'adobestock'))}
                             >
                               Adobe Stock
                             </DropdownMenuCheckboxItem>
                           </>
                         ) : (
                           <>
                             <DropdownMenuCheckboxItem
                                checked={imageSource.includes('pexels')}
                                onCheckedChange={(c) => setImageSource(p => c ? [...p, 'pexels'] : p.filter(s => s !== 'pexels'))}
                             >
                               Pexels
                             </DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem
                                checked={imageSource.includes('pixabay')}
                                onCheckedChange={(c) => setImageSource(p => c ? [...p, 'pixabay'] : p.filter(s => s !== 'pixabay'))}
                             >
                               Pixabay
                             </DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem
                                checked={imageSource.includes('mixkit')}
                                onCheckedChange={(c) => setImageSource(p => c ? [...p, 'mixkit'] : p.filter(s => s !== 'mixkit'))}
                             >
                               Mixkit
                             </DropdownMenuCheckboxItem>
                             <DropdownMenuSeparator />
                             <DropdownMenuLabel>Premium Sources</DropdownMenuLabel>
                             <DropdownMenuSeparator />
                             <DropdownMenuCheckboxItem
                                checked={imageSource.includes('shutterstock')}
                                onCheckedChange={(c) => setImageSource(p => c ? [...p, 'shutterstock'] : p.filter(s => s !== 'shutterstock'))}
                             >
                               Shutterstock
                             </DropdownMenuCheckboxItem>
                             <DropdownMenuCheckboxItem
                                checked={imageSource.includes('adobestock')}
                                onCheckedChange={(c) => setImageSource(p => c ? [...p, 'adobestock'] : p.filter(s => s !== 'adobestock'))}
                             >
                               Adobe Stock
                             </DropdownMenuCheckboxItem>
                           </>
                         )}
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </div>

                   {/* Count per item and Grid Rows - Horizontal */}
                   <div className="flex gap-4 items-end -my-5">
                      <div className="space-y-2">
                         <Label className="text-xs font-medium text-slate-500 uppercase">per item</Label>
                         <Select value={imageCount} onValueChange={setImageCount}>
                           <SelectTrigger className="w-24 !h-8 bg-slate-50 border-slate-200 focus:bg-white focus:border-slate-300 rounded">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="1">1</SelectItem>
                             <SelectItem value="2">2</SelectItem>
                             <SelectItem value="3">3</SelectItem>
                             <SelectItem value="4">4</SelectItem>
                           </SelectContent>
                         </Select>
                      </div>

                      <div className="space-y-2">
                         <Label className="text-xs font-medium text-slate-500 uppercase">Grid Rows</Label>
                         <div className="relative w-24">
                           <Input
                             type="number"
                             min="1"
                             max="50"
                             value={targetCount}
                             onChange={(e) => {
                               const val = e.target.value;
                               if (val === '') {
                                 setTargetCount(1);
                               } else {
                                 const num = parseInt(val);
                                 if (!isNaN(num) && num >= 1) {
                                   setTargetCount(num);
                                 }
                               }
                             }}
                             className="w-full h-8 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-300 transition-all rounded pr-6 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                           />
                           <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0">
                             <button
                               type="button"
                               onClick={() => setTargetCount(prev => Math.min(50, prev + 1))}
                               className="h-3 w-4 flex items-center justify-center hover:bg-slate-200 rounded-sm transition-colors"
                             >
                               <ChevronDown className="h-2.5 w-2.5 rotate-180 opacity-50" />
                             </button>
                             <button
                               type="button"
                               onClick={() => setTargetCount(prev => Math.max(1, prev - 1))}
                               className="h-3 w-4 flex items-center justify-center hover:bg-slate-200 rounded-sm transition-colors"
                             >
                               <ChevronDown className="h-2.5 w-2.5 opacity-50" />
                             </button>
                           </div>
                         </div>
                      </div>
                   </div>

                   {/* Base Keywords */}
                   <div className="space-y-2 pb-5">
                      <Label className="text-xs font-medium text-slate-500 uppercase">Base Keywords (Applied to all)</Label>
                      <Input
                        placeholder="e.g., childrens book illustration, 4k, watercolor"
                        value={baseKeywords}
                        onChange={(e) => setBaseKeywords(e.target.value)}
                        className="h-8 bg-slate-100 border-transparent focus:bg-white focus:border-slate-200 transition-all rounded"
                      />
                   </div>
                </div>

                {/* Project Folder Section */}
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <Label className="text-xs font-medium text-slate-500 uppercase">Project Folder</Label>

                  {/* Project Tabs - Browser Style */}
                  <div className="flex flex-col gap-1">
                    {projects.map(project => (
                      <div
                        key={project.id}
                        className={`flex items-center gap-1 h-8 px-2 border rounded transition-all ${
                          project.id === activeProjectId
                            ? 'bg-white border-slate-300 shadow-sm'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {/* Project Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 hover:bg-slate-200 rounded"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <EllipsisVertical className="h-3 w-3 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-40" align="start">
                            <DropdownMenuItem onClick={() => {
                              switchActiveProject(project.id);
                              setShowRenameProjectDialog(true);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              switchActiveProject(project.id);
                              setShowDuplicateProjectDialog(true);
                            }}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              switchActiveProject(project.id);
                              setShowDeleteProjectDialog(true);
                            }} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <button
                          className="flex items-center text-xs font-normal px-1 hover:opacity-80 transition-opacity flex-1"
                          onClick={() => switchActiveProject(project.id)}
                        >
                          <span className={project.id === activeProjectId ? 'text-slate-900 font-medium' : 'text-slate-600'}>
                            {project.name}
                          </span>
                        </button>
                      </div>
                    ))}

                    {/* New Project Button */}
                    {projects.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-full text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        onClick={handleAddNewProject}
                      >
                        <Plus className="h-3.5 w-3.5 mr-2" />
                        New Project
                      </Button>
                    )}
                  </div>
                </div>
             </div>
          </div>
        </CardContent>

        {/* Account / Login Section */}
        <div className="p-4 border-t border-slate-100 mt-auto">
          {!user ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onShowLogin}
            >
              <User className="h-4 w-4 mr-2" />
              Login
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-medium text-slate-700">{user.name}</span>
                <Badge variant="secondary" className="text-[10px] h-5 px-2">
                  {user.plan === 'pro' ? 'Pro' : 'Free'}
                </Badge>
              </div>
              <div className="text-[10px] text-slate-500 px-2">
                {user.email}
              </div>
            </div>
          )}
        </div>
      </Card>
        </div>
      </div>

      {/* Right: List Section */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <Card className="border-slate-200 shadow-none bg-white overflow-hidden h-full flex flex-col rounded-none border-y-0 border-r-0">
        {/* Toolbar Header - Sticky */}
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center justify-end gap-2">
              {/* Sort Button */}
              <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs min-w-[90px]"
                  onClick={() => setSortBy(prev => prev === 'newest' ? 'oldest' : 'newest')}
              >
                  <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-slate-500" />
                  {sortBy === 'newest' ? 'Newest' : 'Oldest'}
              </Button>

              {/* Add Row Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setTargetCount(prev => prev + 1); setFocusNewRow(true); }}
                className="h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-2 text-slate-500" />
                Add Row
              </Button>

              {/* Selection Button */}
              {isSelectionMode ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleToggleSelectionMode} className="h-8 text-xs">
                        Cancel
                    </Button>
                    {selectedIds.size > 0 && (
                        <>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200 h-8 px-3">
                            {selectedIds.size} selected - Edit any to apply to all
                          </Badge>
                          <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="h-8 text-xs">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete ({selectedIds.size})
                          </Button>
                        </>
                    )}
                  </>
              ) : (
                  <Button variant="outline" size="sm" onClick={handleToggleSelectionMode} className="h-8 text-xs">
                      <CheckSquare className="mr-2 h-3.5 w-3.5 text-slate-500" /> Select
                  </Button>
              )}

              <div className="w-px h-4 bg-slate-300 mx-1" />

              {/* Share for Review Button */}
              <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowShareForReviewDialog(true)}
                  disabled={items.length === 0}
              >
                  <Share2 className="h-3.5 w-3.5 mr-2 text-slate-500" />
                  Share for Review
              </Button>

              {/* Export Button */}
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                          <Download className="h-3.5 w-3.5 mr-2 text-slate-500" />
                          Export
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Choose Format</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs text-slate-600 bg-slate-50">
                        FREE sources: thumbnails included • PAID sources: links only
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleExportData('csv')}>
                          <FileText className="mr-2 h-4 w-4 text-slate-500" />
                          <span>CSV (.csv)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportData('excel')}>
                          <FileSpreadsheet className="mr-2 h-4 w-4 text-slate-500" />
                          <span>Excel (.xlsx)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportData('sheets')}>
                          <Grid className="mr-2 h-4 w-4 text-slate-500" />
                          <span>Google Sheets (CSV)</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleExportData('json')}>
                          <FileJson className="mr-2 h-4 w-4 text-slate-500" />
                          <span>JSON (.json)</span>
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
        </div>

        {/* Scrollable Table Container */}
        <div className="flex-1 overflow-y-auto -mt-6">
        <Table className="m-0">
           <TableHeader className="sticky top-0 z-10 border-t-0">
              <TableRow>
                 <TableHead className="w-[20px] p-0"></TableHead>
                 {isSelectionMode && (
                   <TableHead className="w-[40px] px-2 text-center">
                     <Checkbox
                         checked={items.length > 0 && selectedIds.size === items.length}
                         onCheckedChange={handleSelectAll}
                     />
                   </TableHead>
                 )}
                 <TableHead className="w-[50px] text-center font-bold text-slate-300">#</TableHead>
                 {showVisuals && (
                   <>
                     <TableHead className="w-[10px] p-0"></TableHead>
                     <TableHead className="w-[200px] font-bold text-slate-300">Visual & Source</TableHead>
                   </>
                 )}
                 <TableHead className="w-[180px] font-bold text-slate-300">Word</TableHead>
                 {columnMode === '3col' && <TableHead className="w-[580px] font-bold text-slate-300 translate-x-5">Description</TableHead>}
                 <TableHead className="w-[40px] p-0"></TableHead>
                 <TableHead className="w-[150px] font-bold text-slate-300">Note</TableHead>
              </TableRow>
           </TableHeader>
           <TableBody>
              {sortedItems.map((item, idx) => (
                 <TableRow
                   key={item.id}
                   className={`group border-b border-slate-100 last:border-0 hover:bg-slate-50/50 ${
                     isSelectionMode && selectedIds.has(item.id)
                       ? 'bg-slate-50/30'
                       : ''
                   }`}
                 >
                    <TableCell className={`w-[20px] p-0 ${
                      isSelectionMode && selectedIds.has(item.id)
                        ? 'border-l-4 border-l-slate-500'
                        : ''
                    }`}></TableCell>
                    {isSelectionMode && (
                        <TableCell className="text-center align-top pt-2 px-2">
                          <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={(checked) => handleSelectRow(item.id, checked as boolean)}
                          />
                        </TableCell>
                    )}
                    <TableCell className="text-center font-medium text-slate-400 align-top pt-5">
                       <span>{item.number}</span>
                    </TableCell>
                    {showVisuals && (
                    <>
                    <TableCell className="w-[10px] p-0"></TableCell>
                    <TableCell className="text-left align-top pt-4">
                       {item.status === 'processing' ? (
                           <div className="flex flex-col gap-1.5 w-44">
                               <div className="aspect-[3/2] w-full overflow-hidden border border-slate-200 shadow-sm relative bg-slate-50 flex items-center justify-center">
                                    <span className="text-xs text-slate-400 font-medium">Loading...</span>
                                    {item.imageUrl && (
                                       <img
                                         src={item.imageUrl}
                                         className="hidden"
                                         onLoad={() => handleImageLoad(item.id)}
                                         onError={() => handleImageLoad(item.id)}
                                       />
                                    )}
                               </div>
                           </div>
                       ) : item.imageUrl ? (
                           <div className="flex flex-col gap-1.5 w-44">
                               <div className="aspect-[3/2] w-full overflow-hidden border border-slate-200 shadow-sm relative group/img bg-slate-50 flex items-center justify-center">
                                    {item.mediaType === 'video' ? (
                                      <video src={item.imageUrl} className="w-full h-full object-cover" controls loop muted />
                                    ) : (
                                      <img src={item.imageUrl} alt={item.word} className="w-full h-full object-cover" />
                                    )}

                                  {/* Stock Type Badge - Top Left */}
                                  {item.imageSource?.[0] && (
                                    <div className="absolute top-1 left-1">
                                      {isFreeStock(item.imageSource[0]) ? (
                                        <Badge variant="secondary" className="bg-slate-600 text-white border-0 text-[8px] px-1.5 h-4 backdrop-blur-sm shadow-sm font-medium">
                                          FREE
                                        </Badge>
                                      ) : isPaidStock(item.imageSource[0]) ? (
                                        <Badge variant="secondary" className="bg-slate-700 text-white border-0 text-[8px] px-1.5 h-4 backdrop-blur-sm shadow-sm font-medium">
                                          PAID
                                        </Badge>
                                      ) : null}
                                    </div>
                                  )}

                                  {/* Source Badge - Bottom Right */}
                                  <div className="absolute bottom-1 right-1">
                                    <Badge variant="secondary" className="bg-black/60 text-white border-0 text-[9px] px-1.5 h-4 backdrop-blur-sm shadow-sm">
                                      {item.imageSource || 'AI Generated'}
                                    </Badge>
                                  </div>

                                  {/* Carousel Navigation */}
                                  {item.generatedImages && item.generatedImages.length > 1 && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 bg-white/80 hover:bg-white shadow-md backdrop-blur-sm opacity-0 group-hover/img:opacity-100 transition-opacity"
                                        onClick={() => {
                                          const currentIndex = item.selectedImageIndex || 0;
                                          const newIndex = currentIndex > 0 ? currentIndex - 1 : item.generatedImages!.length - 1;
                                          const selectedImage = item.generatedImages![newIndex];
                                          handleUpdateItem(item.id, 'selectedImageIndex', newIndex as any);
                                          handleUpdateItem(item.id, 'imageUrl', selectedImage.url as any);
                                          handleUpdateItem(item.id, 'imageSource', selectedImage.source as any);
                                          handleUpdateItem(item.id, 'imageSourceUrl', selectedImage.sourceUrl as any);
                                        }}
                                      >
                                        <ChevronLeft className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 bg-white/80 hover:bg-white shadow-md backdrop-blur-sm opacity-0 group-hover/img:opacity-100 transition-opacity"
                                        onClick={() => {
                                          const currentIndex = item.selectedImageIndex || 0;
                                          const newIndex = currentIndex < item.generatedImages!.length - 1 ? currentIndex + 1 : 0;
                                          const selectedImage = item.generatedImages![newIndex];
                                          handleUpdateItem(item.id, 'selectedImageIndex', newIndex as any);
                                          handleUpdateItem(item.id, 'imageUrl', selectedImage.url as any);
                                          handleUpdateItem(item.id, 'imageSource', selectedImage.source as any);
                                          handleUpdateItem(item.id, 'imageSourceUrl', selectedImage.sourceUrl as any);
                                        }}
                                      >
                                        <ChevronRight className="h-4 w-4" />
                                      </Button>
                                      <div className="absolute top-1 left-1/2 -translate-x-1/2">
                                        <Badge variant="secondary" className="bg-black/60 text-white border-0 text-[9px] px-1.5 h-4 backdrop-blur-sm shadow-sm">
                                          {(item.selectedImageIndex || 0) + 1}/{item.generatedImages.length}
                                        </Badge>
                                      </div>
                                      {/* Select/Confirm button */}
                                      <Button
                                        size="sm"
                                        className="absolute bottom-2 left-1/2 -translate-x-1/2 h-7 px-3 text-xs bg-slate-800 hover:bg-slate-900 text-white shadow-lg"
                                        onClick={() => {
                                          // Keep only selected image and remove carousel
                                          handleUpdateItem(item.id, 'generatedImages', undefined as any);
                                        }}
                                      >
                                        <Check className="h-3.5 w-3.5 mr-1" />
                                        Select
                                      </Button>
                                    </>
                                  )}
                               </div>

                               <div className="flex items-center justify-between px-0.5">
                                  {/* DEBUG */}
                                  {console.log('🖼️ [RENDER] Item data:', {
                                    id: item.id,
                                    artistName: item.artistName,
                                    artistUrl: item.artistUrl,
                                    imageSource: item.imageSource
                                  })}

                                  {/* Left: Artist */}
                                  <div className="flex items-center gap-1">
                                    {/* Artist Button */}
                                    {item.artistName ? (
                                      <button
                                        onClick={() => {
                                          console.log('🎨 [CLICK] Artist clicked:', item.artistName, item.artistUrl);
                                          if (item.artistUrl && item.artistUrl.trim() !== '') {
                                            window.open(item.artistUrl, '_blank', 'noopener,noreferrer');
                                          } else {
                                            toast.info(`Artist: ${item.artistName}`);
                                          }
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors border border-transparent hover:border-slate-300"
                                        title={`Artist: ${item.artistName}`}
                                      >
                                        <User className="h-2.5 w-2.5" />
                                        <span>artist</span>
                                      </button>
                                    ) : (
                                      console.log('❌ [NO ARTIST] Missing artistName for item:', item.id)
                                    )}
                                  </div>

                                  {/* Center: Search and Redo icon buttons */}
                                  {item.imageUrl && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          setSelectionDialogItem(item);
                                          setCandidateUrls([]);
                                          setSelectedCandidateIndex(null);
                                          setNewCandidateUrl('');
                                        }}
                                        className="flex items-center justify-center p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors border border-transparent hover:border-slate-300"
                                        title="Search more options"
                                      >
                                        <Search className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleRegenerateItem(item.id, { keywords: item.keywords });
                                        }}
                                        disabled={item.status === 'processing' || !item.word}
                                        className="flex items-center justify-center p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors border border-transparent hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={item.status === 'processing' ? 'Generating...' : 'Regenerate'}
                                      >
                                        <RefreshCw className={`h-3 w-3 ${item.status === 'processing' ? 'animate-spin' : ''}`} />
                                      </button>
                                    </div>
                                  )}

                                  {/* Right: Original Link */}
                                  {item.imageSourceUrl && (
                                    <a
                                      href={item.imageSourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors border border-transparent hover:border-slate-300"
                                      title="View original on stock site"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                               </div>

                               {/* Export Permission Info */}
                               {item.imageSource?.[0] && (
                                 <div className="px-0.5 mt-1">
                                   {isFreeStock(item.imageSource[0]) ? (
                                     <p className="text-[9px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                       Preview & export thumbnails allowed
                                     </p>
                                   ) : isPaidStock(item.imageSource[0]) ? (
                                     <p className="text-[9px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                       Preview only · export links only
                                     </p>
                                   ) : null}
                                 </div>
                               )}

                               {/* Working badge */}
                               {item.status === 'processing' && (
                                 <div className="flex gap-1 mt-2 px-0.5 items-center">
                                   <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 gap-1 pl-1 pr-2">
                                       <Loader2 className="h-3 w-3 animate-spin" /> Working
                                   </Badge>
                                 </div>
                               )}
                           </div>
                       ) : null}
                    </TableCell>
                    </>
                    )}
                    <TableCell className="w-[180px] font-semibold text-slate-900 align-top pt-4">
                       <Input
                         placeholder="Enter subject..."
                         autoFocus={(focusNewRow && item.createdAt === maxCreatedAt) || (items.length === 1 && !item.word && idx === 0)}
                         value={item.word}
                         onChange={(e) => handleInputChange(item.id, 'word', e.target.value)}
                         className="bg-slate-100 border-transparent focus:bg-white focus:border-slate-200 transition-all px-2 h-8 font-semibold -ml-2 w-full placeholder:font-normal placeholder:text-slate-400"
                       />
                    </TableCell>
                    {columnMode === '3col' && (
                       <TableCell className="text-slate-600 align-top pt-4 w-[580px] max-w-[580px] translate-x-5">
                          <div className="space-y-2 -ml-2">
                            <div className="relative">
                              <Textarea
                                placeholder="Add details for better results..."
                                value={item.description}
                                onChange={(e) => handleInputChange(item.id, 'description', e.target.value)}
                                className="bg-slate-100 border-transparent focus:bg-white focus:border-slate-200 transition-all px-2 py-1.5 min-h-[32px] h-auto leading-tight text-slate-500 w-full resize-none overflow-hidden"
                                rows={1}
                                style={{ height: 'auto' }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                            </div>
                            <div className="mt-1">
                            <KeywordPreview
                              text={item.description}
                              word={item.word}
                              existingKeywords={item.keywords}
                              enableAI={item.isolated === false}
                              isolatedBackground={item.isolatedBackground}
                              onAddKeyword={(keyword) => handleAddKeywordToItem(item.id, keyword)}
                              onAddAllKeywords={(keywords) => handleAddAllKeywordsToItem(item.id, keywords)}
                              onKeywordsGenerated={(keywords) => handleKeywordsChange(item.id, keywords)}
                              onRegenerateImage={item.imageUrl ? () => {
                                // Use the current item's keywords directly from render
                                handleRegenerateItem(item.id, { keywords: item.keywords });
                              } : undefined}
                              onIsolatedBackgroundChange={(value) => handleIsolatedBgChange(item.id, value)}
                              onModeChange={(enabled) => handleModeChange(item.id, enabled)}
                            />
                            </div>
                          </div>
                       </TableCell>
                    )}
                    <TableCell className="w-[40px] p-0"></TableCell>
                    <TableCell className="text-slate-600 align-top pt-4">
                        <Input
                            placeholder="Memo..."
                            value={item.note}
                            onChange={(e) => handleInputChange(item.id, 'note', e.target.value)}
                            className="bg-slate-100 border-transparent focus:bg-white focus:border-slate-200 transition-all px-2 h-8 text-slate-500 text-sm -ml-2 w-full"
                        />
                    </TableCell>
                 </TableRow>
              ))}
           </TableBody>
        </Table>
        </div>

        {/* Action Footer - Sticky */}
        <div className="sticky bottom-0 z-10 border-t border-slate-200 p-4 bg-white flex justify-end gap-4">
           <Button variant="ghost" onClick={onCancel}>
              Cancel
           </Button>
           <Button
              onClick={handleExtractImages}
              className="bg-slate-800 hover:bg-slate-900 text-white min-w-[150px]"
              disabled={items.filter(i => i.word.trim() && !i.imageUrl).length === 0}
           >
              {(() => {
                const count = items.filter(i => i.word.trim() && !i.imageUrl).length;
                return count > 0 ? `Search ${count} items` : 'Search items';
              })()}
           </Button>
        </div>
      </Card>
      </div>
    </div>

      {/* Manual Selection Dialog */}
      <Dialog open={!!selectionDialogItem} onOpenChange={(open) => !open && setSelectionDialogItem(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manual Selection</DialogTitle>
            <DialogDescription>
              Select or import {selectionDialogItem?.mediaType === 'video' ? 'video' : 'image'} for "{selectionDialogItem?.word}"
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="candidates" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="candidates">Candidates</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Candidates Tab */}
            <TabsContent value="candidates" className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-4">
                {/* Link Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectionDialogItem?.keywords && imageSource.length > 0) {
                        const url = generateStockSiteSearchUrl(imageSource[0], selectionDialogItem.keywords, selectionDialogItem.mediaType);
                        window.open(url, '_blank');
                      } else {
                        toast.info('Please select a source first');
                      }
                    }}
                  >
                    <Search className="h-3.5 w-3.5 mr-2" />
                    Keyword Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectionDialogItem?.artistName && selectionDialogItem?.artistUrl) {
                        window.open(selectionDialogItem.artistUrl, '_blank');
                      } else {
                        toast.info('No artist info available');
                      }
                    }}
                  >
                    <User className="h-3.5 w-3.5 mr-2" />
                    Artist Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectionDialogItem?.imageSourceUrl) {
                        window.open(selectionDialogItem.imageSourceUrl, '_blank');
                      } else {
                        toast.info('No original link available');
                      }
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    Original Link
                  </Button>
                </div>

                {/* Instructions */}
                <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">💡</span>
                    <div className="flex-1 text-sm text-slate-700">
                      <p className="font-semibold mb-2">How to get {selectionDialogItem?.mediaType === 'video' ? 'video' : 'image'} URL:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Click one of the link buttons above to open stock site</li>
                        <li><strong>Right-click on the {selectionDialogItem?.mediaType === 'video' ? 'video' : 'image'}</strong> you like</li>
                        <li>Select <strong>"Copy Image Address"</strong> or <strong>"Copy Image Link"</strong></li>
                        <li>Paste the URL in the input box below</li>
                        <li>Click Add button</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* URL Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder={`Paste ${selectionDialogItem?.mediaType === 'video' ? 'video' : 'image'} URL here...`}
                    value={newCandidateUrl}
                    onChange={(e) => setNewCandidateUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddCandidateUrl();
                      }
                    }}
                    className="flex-1 border-2 border-slate-300 focus:border-slate-500"
                  />
                  <Button onClick={handleAddCandidateUrl} disabled={!newCandidateUrl.trim()} className="px-3">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Candidate Images Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {candidateUrls.map((candidate, idx) => (
                    <div
                      key={idx}
                      className={`relative group cursor-pointer rounded-md overflow-hidden border-2 transition-all ${
                        selectedCandidateIndex === idx
                          ? 'border-slate-500 ring-2 ring-slate-200'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                      onClick={() => handleSelectCandidate(idx)}
                    >
                      {selectionDialogItem?.mediaType === 'video' ? (
                        <video
                          src={candidate.url}
                          className="w-full h-32 object-cover bg-slate-100"
                          controls
                          loop
                          muted
                          onError={(e) => {
                            const target = e.target as HTMLVideoElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML += '<div class="w-full h-32 flex flex-col items-center justify-center bg-red-50 text-red-600 text-xs"><X class="h-6 w-6 mb-1" /><span>Failed to load video</span></div>';
                            }
                          }}
                        />
                      ) : (
                        <img
                          src={candidate.url}
                          alt={`Candidate ${idx + 1}`}
                          className="w-full h-32 object-cover bg-slate-100"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.error-placeholder')) {
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'error-placeholder w-full h-32 flex flex-col items-center justify-center bg-red-50 text-red-600 text-xs';
                              errorDiv.innerHTML = '<svg class="h-6 w-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg><span>Failed to load image</span><span class="text-[10px] text-red-500 mt-1 px-2 text-center break-all">Invalid URL or CORS blocked</span>';
                              parent.appendChild(errorDiv);
                            }
                          }}
                        />
                      )}
                      {selectedCandidateIndex === idx && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-slate-600 text-white">Selected</Badge>
                        </div>
                      )}
                      <button
                        className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCandidateUrls(prev => prev.filter((_, i) => i !== idx));
                          if (selectedCandidateIndex === idx) {
                            setSelectedCandidateIndex(null);
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {candidateUrls.length === 0 && (
                    <div className="col-span-3 flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      <ImageIcon className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-sm">No candidates added yet</p>
                      <p className="text-xs mt-1">Paste URLs above to add candidates</p>
                    </div>
                  )}
                </div>

                {/* Replace Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={handleReplaceWithCandidate}
                    disabled={selectedCandidateIndex === null}
                    className="bg-slate-700 hover:bg-slate-800"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Replace with Selected
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 overflow-y-auto mt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectionDialogItem?.imageUrl && (
                  <div className="relative group">
                    {selectionDialogItem.mediaType === 'video' ? (
                      <video src={selectionDialogItem.imageUrl} className="w-full h-32 object-cover rounded-md border-2 border-slate-700" controls loop muted />
                    ) : (
                      <img src={selectionDialogItem.imageUrl} alt="Current" className="w-full h-32 object-cover rounded-md border-2 border-slate-700" />
                    )}
                    <Badge className="absolute top-2 right-2 bg-slate-800">Current</Badge>
                  </div>
                )}
                {selectionDialogItem?.history.map((historyItemData, idx) => {
                  const url = typeof historyItemData === 'string' ? historyItemData : historyItemData.url;
                  const mediaType = typeof historyItemData === 'string' ? selectionDialogItem?.mediaType : historyItemData.mediaType;

                  return (
                    <div
                      key={idx}
                      className="relative group cursor-pointer"
                      onClick={() => {
                        if (!selectionDialogItem) return;

                        // Save current image to history
                        const currentImageData = { url: selectionDialogItem.imageUrl || '', mediaType: selectionDialogItem.mediaType };
                        const newHistory = [...selectionDialogItem.history];

                        // Remove clicked history item and add current to history
                        newHistory.splice(idx, 1);
                        if (selectionDialogItem.imageUrl) {
                          newHistory.unshift(currentImageData);
                        }

                        // Update item with clicked image as current
                        handleUpdateItem(selectionDialogItem.id, 'imageUrl', url as any);
                        handleUpdateItem(selectionDialogItem.id, 'history', newHistory as any);

                        toast.success('Switched to previous version');
                        setSelectionDialogItem(null);
                      }}
                    >
                      {(mediaType === 'video') ? (
                        <video src={url} className="w-full h-32 object-cover rounded-md border border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-400 transition-all" controls loop muted />
                      ) : (
                        <img src={url} alt={`History ${idx}`} className="w-full h-32 object-cover rounded-md border border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-400 transition-all" />
                      )}
                      <Badge variant="secondary" className="absolute top-2 right-2">v{(selectionDialogItem?.history.length || 0) - idx}</Badge>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-md">
                        <Badge className="bg-slate-800">Click to Use</Badge>
                      </div>
                    </div>
                  )
                })}
                {(!selectionDialogItem?.imageUrl && (!selectionDialogItem?.history || selectionDialogItem.history.length === 0)) && (
                  <div className="col-span-3 flex flex-col items-center justify-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <History className="h-8 w-8 mb-2 opacity-20" />
                    <p>No history available</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        open={isBulkEditDialogOpen}
        onOpenChange={setIsBulkEditDialogOpen}
        onSave={handleBulkUpdate}
        selectedCount={selectedIds.size}
      />

      {/* Project Dialogs */}
      <ProjectNameDialog
        open={showAddProjectDialog}
        onOpenChange={setShowAddProjectDialog}
        title="Create New Project"
        description="Enter a name for your new project."
        confirmText="Create"
        onConfirm={(name) => {
          addProject(name);
          setShowAddProjectDialog(false);
        }}
      />

      <ProjectNameDialog
        open={showRenameProjectDialog}
        onOpenChange={setShowRenameProjectDialog}
        title="Rename Project"
        description={`Enter the new name for project "${activeProject?.name}"`}
        initialName={activeProject?.name}
        confirmText="Rename"
        onConfirm={(name) => {
          if (activeProject) {
            renameProject(activeProject.id, name);
          }
          setShowRenameProjectDialog(false);
        }}
      />

      <ProjectNameDialog
        open={showDuplicateProjectDialog}
        onOpenChange={setShowDuplicateProjectDialog}
        title="Duplicate Project"
        description={`Enter a name for the duplicated project based on "${activeProject?.name}"`}
        initialName={activeProject ? `${activeProject.name} (Copy)` : ''}
        confirmText="Duplicate"
        onConfirm={(name) => {
          if (activeProject) {
            duplicateProject(activeProject.id, name);
          }
          setShowDuplicateProjectDialog(false);
        }}
      />

      <ConfirmDeleteProjectDialog
        open={showDeleteProjectDialog}
        onOpenChange={setShowDeleteProjectDialog}
        projectName={activeProject?.name || 'Selected Project'}
        onConfirm={async () => {
          if (activeProject) {
            await deleteProject(activeProject.id);
          }
          setShowDeleteProjectDialog(false);
        }}
      />

      {/* Share for Review Dialog */}
      <ShareForReviewDialog
        open={showShareForReviewDialog}
        onOpenChange={setShowShareForReviewDialog}
        reviewLink={currentReviewLink}
        onCreateSession={handleCreateReviewSession}
      />
    </>
  );
}

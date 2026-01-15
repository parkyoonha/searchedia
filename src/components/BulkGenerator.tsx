import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
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
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
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
  ChevronUp,
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
  Link2,
  Menu,
  Home,
  LogOut,
  Folder,
  FolderOpen,
  FolderPlus,
  File,
  EyeOff,
  RotateCcw,
  AlertTriangle
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
import { ReviewResultsDisplay } from './ReviewResultsDisplay';
import { optimizeKeywordsWithAI } from '../services/ai';
import { ProjectNameDialog } from './project/ProjectNameDialog';
import { ConfirmDeleteProjectDialog } from './project/ConfirmDeleteProjectDialog';
import { ConfirmCompleteDialog } from './review/ConfirmCompleteDialog';
import { submitReviewResults, createReviewSession, getMyReviewSessions } from '../lib/reviewDatabase';
import { logger } from '../lib/logger';

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
  reviewHidden?: boolean; // Review result hidden by creator
  reviewCompleted?: boolean; // Review result marked as completed (permanently removes review data)
  reviewCompletedAt?: number; // Timestamp when review was marked complete
  previousReviewStatus?: 'approved' | 'rejected'; // Previous review status for re-review tracking
  usedImageUrls?: string[]; // Track used image URLs to prevent duplicates
  currentPage?: number; // Current page number for API pagination (per source)
  projectId?: string; // Source project ID for folder-level reviews
  projectName?: string; // Source project name for folder-level reviews (UI display)
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

interface Folder {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt: number;
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
  projects: Array<{ id: string; name: string; items: BulkItem[]; folderId?: string | null }>;
  activeProjectId: string | null;
  addProject: (name: string, folderId?: string | null) => void;
  renameProject: (id: string, newName: string) => void;
  duplicateProject: (id: string, newName: string) => void;
  deleteProject: (id: string) => void;
  switchActiveProject: (id: string | null) => void;
  folders: Folder[];
  expandedFolders: Set<string>;
  addFolder: (name: string, parentId?: string | null) => void;
  renameFolder: (id: string, newName: string) => void;
  deleteFolder: (id: string) => void;
  moveProjectToFolder: (projectId: string, folderId: string | null) => void;
  toggleFolderExpanded: (folderId: string) => void;
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  user: {id: string, name: string, email: string, plan: 'free' | 'pro', avatar_url?: string} | null;
  onShowLogin: () => void;
  onLogout: () => void;
  reviewMode?: {
    isReviewMode: boolean;
    shareToken: string;
    creatorId: string;
    isReadOnly?: boolean;
    reviewType?: 'project' | 'folder';
  };
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
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const hours = parseInt(expirationHours) || 24;
    const views = parseInt(maxViews) || 10;
    await onCreateSession(hours, views);
    setLinkGenerated(true);
    setIsGenerating(false);
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
      setIsGenerating(false);
    }
  }, [open]);

  useEffect(() => {
    if (reviewLink) {
      setLinkGenerated(true);
    }
  }, [reviewLink]);

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
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isGenerating}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Generate Link
                  </>
                )}
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

// Folder Tree Item Component
function FolderTreeItem({ folder, allFolders, projects, expandedFolders, activeProjectId, level, currentFolderId, onToggleExpand, onRenameFolder, onDeleteFolder, onAddSubfolder, onShareFolder, onSwitchProject, onRenameProject, onDuplicateProject, onDeleteProject, onShareProject, onExportProject, onMoveProject, onSelectFolder, reviewSessions, onRequestFolderReReview, getReviewResultsForItem }: any) {
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = currentFolderId === folder.id;
  const childFolders = allFolders.filter((f: any) => f.parentId === folder.id);
  const childProjects = projects.filter((p: any) => p.folderId === folder.id);
  const FolderIcon = isExpanded ? FolderOpen : Folder;

  // Check if folder has any items with pending reviews (not completed)
  // Pass project.id to check review results for each specific project
  const hasAnyReviewResults = childProjects.some((project: any) =>
    project.items.some((item: any) => {
      if (item.reviewCompleted || item.reviewHidden) return false;
      const reviewResult = getReviewResultsForItem(item.id, project.id);
      return reviewResult !== null;
    })
  );

  // Count rejected items in folder
  // Pass project.id to check review results for each specific project
  const rejectedCount = childProjects.reduce((count: number, project: any) => {
    return count + project.items.filter((item: any) => {
      if (item.reviewCompleted || item.reviewHidden) return false;
      const reviewResult = getReviewResultsForItem(item.id, project.id);
      return reviewResult && reviewResult.status === 'rejected';
    }).length;
  }, 0);

  return (
    <>
      <div
        className={`flex items-center gap-1 h-8 px-2 rounded transition-all ${
          isSelected
            ? 'bg-blue-50 hover:bg-blue-100'
            : 'hover:bg-slate-50'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 hover:bg-slate-200 rounded"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(folder.id);
          }}
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </Button>

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
            <DropdownMenuItem onClick={() => onRenameFolder(folder.id)}>
              <Edit className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddSubfolder(folder.id)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Subfolder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onShareFolder(folder.id)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share for Review
            </DropdownMenuItem>
            {rejectedCount > 0 && onRequestFolderReReview && (
              <DropdownMenuItem onClick={() => onRequestFolderReReview(folder.id)} className="text-blue-600 focus:text-blue-600 focus:bg-blue-50">
                <RotateCcw className="mr-2 h-4 w-4" />
                거부 건 재요청 ({rejectedCount})
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDeleteFolder(folder.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div
          className="flex items-center gap-1.5 flex-1 cursor-pointer"
          onClick={() => {
            onSelectFolder(folder.id);
            if (!isExpanded) {
              onToggleExpand(folder.id);
            }
          }}
        >
          <FolderIcon className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs text-slate-700 font-medium">{folder.name}</span>
          {hasAnyReviewResults && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 border-blue-200 text-[9px] px-1.5 h-4 font-medium"
            >
              Review
            </Badge>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {childFolders.map((childFolder: any) => (
            <FolderTreeItem
              key={childFolder.id}
              folder={childFolder}
              allFolders={allFolders}
              projects={projects}
              expandedFolders={expandedFolders}
              activeProjectId={activeProjectId}
              level={level + 1}
              currentFolderId={currentFolderId}
              onToggleExpand={onToggleExpand}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onAddSubfolder={onAddSubfolder}
              onShareFolder={onShareFolder}
              onSwitchProject={onSwitchProject}
              onRenameProject={onRenameProject}
              onDuplicateProject={onDuplicateProject}
              onDeleteProject={onDeleteProject}
              onShareProject={onShareProject}
              onExportProject={onExportProject}
              onMoveProject={onMoveProject}
              onSelectFolder={onSelectFolder}
              reviewSessions={reviewSessions}
              onRequestFolderReReview={onRequestFolderReReview}
              getReviewResultsForItem={getReviewResultsForItem}
            />
          ))}

          {childProjects.map((project: any) => (
            <ProjectTreeItem
              key={project.id}
              project={project}
              isActive={project.id === activeProjectId}
              level={level + 1}
              onSwitch={onSwitchProject}
              onRename={onRenameProject}
              onDuplicate={onDuplicateProject}
              onDelete={onDeleteProject}
              onShare={onShareProject}
              onExport={onExportProject}
              onMove={onMoveProject}
              folders={allFolders}
              reviewSessions={reviewSessions}
              getReviewResultsForItem={getReviewResultsForItem}
            />
          ))}
        </>
      )}
    </>
  );
}

// Project Tree Item Component
function ProjectTreeItem({ project, isActive, level, onSwitch, onRename, onDuplicate, onDelete, onShare, onExport, onMove, folders, reviewSessions, getReviewResultsForItem }: any) {
  // Check if project has any items with pending reviews (not completed)
  // Pass project.id to check review results for this specific project (not just active project)
  const hasAnyReviewResults = project.items.some((item: any) => {
    if (item.reviewCompleted || item.reviewHidden) return false;
    const reviewResult = getReviewResultsForItem(item.id, project.id);
    return reviewResult !== null;
  });

  return (
    <div
      className={`flex items-center gap-1 h-8 px-2 rounded transition-all ${
        isActive
          ? 'bg-white border border-slate-300 shadow-sm'
          : 'hover:bg-slate-50'
      } ${hasAnyReviewResults ? 'border-indigo-200' : ''}`}
      style={{ paddingLeft: `${level * 12 + 28}px` }}
    >
      {/* Menu dropdown - now visible and clickable */}
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
          <DropdownMenuItem onClick={() => onRename(project.id)}>
            <Edit className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(project.id)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderOpen className="mr-2 h-4 w-4" />
              Move to
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onMove(project.id, null)}>
                <Home className="mr-2 h-4 w-4" />
                Root
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {folders.map((folder: any) => (
                <DropdownMenuItem key={folder.id} onClick={() => onMove(project.id, folder.id)}>
                  <Folder className="mr-2 h-4 w-4" />
                  {folder.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onShare(project.id)}>
                <Link2 className="mr-2 h-4 w-4" />
                Share for Review
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExport(project.id, 'excel')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel (Links only)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport(project.id, 'csv')}>
                <FileText className="mr-2 h-4 w-4" />
                CSV
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onDelete(project.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Only this area is clickable for project switching */}
      <div
        className="flex items-center gap-1.5 flex-1 cursor-pointer px-1 hover:opacity-80 transition-opacity"
        onClick={() => onSwitch(project.id)}
      >
        <File className="h-3 w-3 text-slate-400" />
        <span className={`text-xs ${isActive ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
          {project.name}
        </span>
        {hasAnyReviewResults && (
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-700 border-blue-200 text-[9px] px-1.5 h-4 font-medium"
          >
            Review
          </Badge>
        )}
      </div>
    </div>
  );
}

export function BulkGenerator({ items, setItems, onDelete, onGenerate, onCancel, userPlan, credits, onUpgrade, onConsumeCredits, initialBaseKeywords, projects, activeProjectId, addProject, renameProject, duplicateProject, deleteProject, switchActiveProject, folders, expandedFolders, addFolder, renameFolder, deleteFolder, moveProjectToFolder, toggleFolderExpanded, currentFolderId, setCurrentFolderId, user, onShowLogin, onLogout, reviewMode }: BulkGeneratorProps) {
  // Separate target counts for each media type
  const [targetCountByType, setTargetCountByType] = useState<{ image: number; video: number }>(() => {
    const imageItems = items.filter(i => !i.mediaType || i.mediaType === 'image');
    const videoItems = items.filter(i => i.mediaType === 'video');
    return {
      image: imageItems.length > 0 ? imageItems.length : 1,
      video: videoItems.length > 0 ? videoItems.length : 1
    };
  });
  const [focusNewRow, setFocusNewRow] = useState(false);
  const [columnMode, setColumnMode] = useState<'2col' | '3col'>('3col');
  // Set initial mediaType based on last item (most recently added from landing)
  // In review mode, always start with 'image' tab
  const [mediaType, setMediaType] = useState<'image' | 'video'>(() => {
    if (reviewMode?.isReviewMode) {
      return 'image';
    }
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      return lastItem.mediaType || 'image';
    }
    return 'image';
  });

  // Update mediaType when new items are added (e.g., from landing wizard)
  // OR when switching projects (to match the project's items)
  const prevItemsLengthRef = useRef(items.length);
  const prevProjectIdRef = useRef(activeProjectId);

  useEffect(() => {
    const currentLength = items.length;
    const prevLength = prevItemsLengthRef.current;
    const currentProjectId = activeProjectId;
    const prevProjectId = prevProjectIdRef.current;

    // Check if project was switched
    const projectSwitched = currentProjectId !== prevProjectId;

    if (projectSwitched && currentLength > 0 && !reviewMode?.isReviewMode) {
      // Project switched: set mediaType based on first available item type
      const firstItem = items.find(item => item.mediaType);
      if (firstItem) {
        setMediaType(firstItem.mediaType);
      } else {
        // If no items have mediaType, default to image
        setMediaType('image');
      }
    } else if (!projectSwitched && currentLength > prevLength && currentLength > 0) {
      // Items added (not switched): use the new item's mediaType
      const newItems = items.slice(prevLength);
      if (newItems.length > 0 && newItems[0]?.mediaType) {
        setMediaType(newItems[0].mediaType);
      }
    }

    prevItemsLengthRef.current = currentLength;
    prevProjectIdRef.current = currentProjectId;
  }, [items, activeProjectId, reviewMode?.isReviewMode]);

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


  // Update targetCount when switching tabs or items change
  useEffect(() => {
    // Skip in review mode
    if (reviewMode?.isReviewMode) return;

    const imageItems = items.filter(item => !item.mediaType || item.mediaType === 'image');
    const videoItems = items.filter(item => item.mediaType === 'video');

    setTargetCountByType(prev => {
      const newImageCount = imageItems.length || 1;
      const newVideoCount = videoItems.length || 1;

      // Only update if different to avoid unnecessary re-renders
      if (prev.image !== newImageCount || prev.video !== newVideoCount) {
        return { image: newImageCount, video: newVideoCount };
      }
      return prev;
    });
  }, [items, reviewMode?.isReviewMode]);

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

  // Review mode - project filter for folder reviews
  const [selectedReviewProjectId, setSelectedReviewProjectId] = useState<string>('');

  // Review sessions (for creators to see feedback)
  const [reviewSessions, setReviewSessions] = useState<any[]>([]);

  // Review submission state
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewCompleted, setReviewCompleted] = useState(false);

  // Review filtering
  const [reviewFilter, setReviewFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [hideAllReviews, setHideAllReviews] = useState(false);
  const [reviewMediaFilter, setReviewMediaFilter] = useState<'image' | 'video' | null>(null);

  // Reset review filter when switching projects
  useEffect(() => {
    setReviewFilter('all');
    setReviewMediaFilter(null);
  }, [activeProjectId]);

  // Confirm Complete Dialog
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [itemToComplete, setItemToComplete] = useState<string | null>(null);

  // Confirm Bulk Complete Dialog
  const [showConfirmBulkComplete, setShowConfirmBulkComplete] = useState(false);

  // Folder Dialogs
  const [showAddFolderDialog, setShowAddFolderDialog] = useState(false);
  const [showRenameFolderDialog, setShowRenameFolderDialog] = useState(false);
  const [showDeleteFolderDialog, setShowDeleteFolderDialog] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [parentFolderIdForNewFolder, setParentFolderIdForNewFolder] = useState<string | null>(null);

  // Review Session Dialogs
  const [showShareForReviewDialog, setShowShareForReviewDialog] = useState(false);
  const [currentReviewLink, setCurrentReviewLink] = useState<string>('');

  // Mobile Sidebar State
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Desktop Sidebar State
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  // Hide sidebar in review mode and set default media filter to 'image'
  useEffect(() => {
    if (reviewMode?.isReviewMode) {
      setDesktopSidebarOpen(false);
      // Set default filter to 'image' when entering review mode
      setReviewMediaFilter('image');
    }
  }, [reviewMode?.isReviewMode]);

  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleAddNewProject = () => {
    // Create project in current folder context (addProject will assign proper number)
    // Priority: 1) current selected folder, 2) active project's folder, 3) root
    const targetFolderId = currentFolderId || activeProject?.folderId || null;
    addProject('', targetFolderId); // Pass empty string, addProject will generate proper name
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

  // Collect items from folder
  const collectItemsFromFolder = (folderId: string): BulkItem[] => {
    const projectsInFolder = projects.filter(p => p.folderId === folderId);
    const allItems: BulkItem[] = [];

    projectsInFolder.forEach(project => {
      project.items.forEach(item => {
        // Only include completed items with actual content
        if (item.status === 'completed' && item.imageUrl) {
          allItems.push({
            ...item,
            projectId: project.id,
            projectName: project.name
          });
        }
      });
    });

    return allItems;
  };

  // Handle creating review session
  const handleCreateReviewSession = async (expirationHours: number, maxViews: number) => {
    const token = generateShareToken();

    let itemsToShare: BulkItem[];
    let projectIdForSession: string | undefined;
    let folderIdForSession: string | undefined;

    // Check if sharing folder or project
    if (currentFolderId) {
      // Sharing folder - collect all items from all projects in folder
      itemsToShare = collectItemsFromFolder(currentFolderId);
      folderIdForSession = currentFolderId;
      logger.log(`[Share] Sharing folder ${currentFolderId} with ${itemsToShare.length} items from ${projects.filter(p => p.folderId === currentFolderId).length} projects`);
    } else {
      // Sharing single project
      itemsToShare = items.map(item => ({
        ...item,
        reviewStatus: 'pending'
      }));
      projectIdForSession = activeProjectId || undefined;
      logger.log(`[Share] Sharing project with ${itemsToShare.length} items`);
    }

    if (itemsToShare.length === 0) {
      toast.error('No items to share for review');
      return;
    }

    // Create review session in Supabase
    const result = await createReviewSession(
      itemsToShare.map(item => ({
        ...item,
        reviewStatus: 'pending'
      })),
      token,
      expirationHours,
      maxViews,
      projectIdForSession,
      false, // isRereview
      folderIdForSession
    );

    if (!result.success) {
      toast.error(result.error || 'Failed to create review session');
      return;
    }

    // Reset reviewCompleted flag for all items in the session so new reviews can be displayed
    // This allows re-requesting reviews after bulk complete
    const itemIdsInSession = new Set(itemsToShare.map(item => item.id));
    setItems(prev => prev.map(item =>
      itemIdsInSession.has(item.id)
        ? { ...item, reviewCompleted: false, reviewCompletedAt: undefined }
        : item
    ));

    // Generate review link
    const reviewLink = `${window.location.origin}/review/${token}`;
    setCurrentReviewLink(reviewLink);

    toast.success('Review link created successfully!');
  };

  // Initialize items when targetCount changes for current media type
  useEffect(() => {
    // Skip in review mode
    if (reviewMode?.isReviewMode) return;

    const targetCount = targetCountByType[mediaType];

    setItems(prev => {
      const current = [...prev];
      // Only count items that match current mediaType
      const currentTabItems = current.filter(item => {
        if (!item.mediaType) return mediaType === 'image'; // Old items default to image
        return item.mediaType === mediaType;
      });

      // Only add items if current tab has fewer than targetCount
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
          mediaType: mediaType, // Assign current mediaType to new items
          isolated: true // Default to manual mode (no AI context)
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
  }, [targetCountByType, mediaType, reviewMode?.isReviewMode]); // Depend on targetCountByType and mediaType

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

    // Also update targetCount for current media type
    setTargetCountByType(prev => ({
      ...prev,
      [mediaType]: Math.max(1, prev[mediaType] - selectedIds.size)
    }));
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleImageLoad = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'completed' } : i));
  };

  // Direct editing - if item is selected, apply to all selected items
  const handleInputChange = (id: string, field: 'word' | 'description' | 'note' | 'reviewStatus' | 'reviewComment', value: string) => {
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

  // Handle review submission
  const handleSubmitReview = async () => {
    if (!reviewMode?.isReviewMode || !reviewMode.shareToken) {
      toast.error('Invalid review session');
      return;
    }

    if (isSubmittingReview) {
      return; // Prevent double submission
    }

    // Validate: Check if all items have been reviewed (for folder reviews)
    if (reviewMode.reviewType === 'folder') {
      // Filter out empty items
      const validItems = items.filter(item => item.word?.trim() || item.imageUrl);
      const unreviewed = validItems.filter(item => !item.reviewStatus);

      if (unreviewed.length > 0) {
        // Get unique project IDs from unreviewed items
        const unreviewedProjects = new Set(unreviewed.map(item => item.projectName).filter(Boolean));
        const projectList = Array.from(unreviewedProjects).join(', ');

        toast.error(
          `Please review all items before submitting. ${unreviewed.length} items not reviewed${projectList ? ` in: ${projectList}` : ''}`,
          { id: 'submit-review', duration: 5000 }
        );
        return;
      }
    }

    setIsSubmittingReview(true);
    toast.loading('Submitting review...', { id: 'submit-review' });

    try {
      const result = await submitReviewResults(reviewMode.shareToken, items);
      if (result.success) {
        toast.success('Review submitted successfully!', { id: 'submit-review' });
        // Set review as completed to show read-only mode
        setReviewCompleted(true);
        // Don't navigate away - stay to show results
        // if (onCancel) {
        //   setTimeout(() => onCancel(), 1500);
        // }
      } else {
        toast.error(result.error || 'Failed to submit review', { id: 'submit-review' });
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('An error occurred while submitting the review', { id: 'submit-review' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Helper function to get review results for a specific item
  // Optional projectId parameter allows checking review results for any project (for sidebar indicators)
  const getReviewResultsForItem = useCallback((itemId: string, projectId?: string): { status: 'approved' | 'rejected'; comment?: string; reviewedAt: string } | null => {
    // Determine which project to check - use provided projectId or fall back to activeProjectId
    const targetProjectId = projectId || activeProjectId;

    // Get target project from projects state (always use projects for latest state)
    const currentProject = projects.find(p => p.id === targetProjectId);
    const projectFolderId = currentProject?.folderId;

    // First, check if the item itself has review data (from folder reviews applied to projects)
    // Always use projects state to ensure we have the latest data
    const targetItems = currentProject?.items || [];
    const item = targetItems.find((i: any) => i.id === itemId);
    if (item?.reviewStatus && item.reviewStatus !== 'pending') {
      return {
        status: item.reviewStatus,
        comment: item.reviewComment,
        reviewedAt: new Date().toISOString() // Use current time as fallback
      };
    }

    // Filter completed review sessions for target project or folder
    const completedSessions = reviewSessions
      .filter((s: any) => {
        if (!s || s.status !== 'completed') return false;
        if (s.review_type === 'project') return s.project_id === targetProjectId;
        if (s.review_type === 'folder') {
          // Match if viewing the folder directly OR if target project belongs to the reviewed folder
          // Also check if folder_id is defined before comparing
          return (currentFolderId && s.folder_id === currentFolderId) ||
                 (projectFolderId && s.folder_id === projectFolderId);
        }
        return false;
      })
      .sort((a: any, b: any) => {
        // Sort by reviewed_at descending (most recent first)
        const dateA = new Date(a.reviewed_at || 0).getTime();
        const dateB = new Date(b.reviewed_at || 0).getTime();
        return dateB - dateA;
      });

    // Find the most recent review for this specific item
    for (const session of completedSessions) {
      if (!session.items || !Array.isArray(session.items)) {
        continue;
      }
      const reviewedItem = session.items.find((i: any) => i && i.id === itemId);
      if (reviewedItem?.reviewStatus && reviewedItem.reviewStatus !== 'pending') {
        return {
          status: reviewedItem.reviewStatus,
          comment: reviewedItem.reviewComment,
          reviewedAt: session.reviewed_at
        };
      }
    }

    return null;
  }, [reviewSessions, activeProjectId, currentFolderId, projects]);

  // Handler: Open confirm complete dialog
  const handleRequestComplete = (itemId: string) => {
    setItemToComplete(itemId);
    setShowConfirmComplete(true);
  };

  // Handler: Complete review (called after confirmation)
  const handleCompleteReview = () => {
    if (!itemToComplete) return;

    setItems(prev => prev.map(item =>
      item.id === itemToComplete
        ? {
            ...item,
            reviewCompleted: true,
            reviewCompletedAt: Date.now(),
            // Clear review data
            reviewStatus: undefined,
            reviewComment: undefined
          }
        : item
    ));
    toast.success('리뷰가 처리완료되었습니다');
    setItemToComplete(null);
  };

  // Handler: Re-request review for single rejected item
  const handleRequestReReview = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !item.reviewStatus || item.reviewStatus !== 'rejected') {
      toast.error('거부된 아이템만 재요청할 수 있습니다');
      return;
    }

    try {
      // Mark with previous status for tracking
      const itemWithPreviousStatus = {
        ...item,
        previousReviewStatus: item.reviewStatus,
        reviewStatus: 'pending' as const
      };

      // Create new review session with single item
      const token = generateShareToken();
      const result = await createReviewSession(
        [itemWithPreviousStatus],
        token,
        72, // 72 hours
        10, // 10 views
        activeProjectId || undefined,
        true, // isRereview = true
        undefined
      );

      if (result.success) {
        const reviewLink = `${window.location.origin}/review/${token}`;
        setCurrentReviewLink(reviewLink);
        setShowShareForReviewDialog(true);
        toast.success('재요청 리뷰 링크가 생성되었습니다');
      } else {
        toast.error(result.error || '재요청 생성 실패');
      }
    } catch (error) {
      console.error('Re-request error:', error);
      toast.error('재요청 생성 중 오류가 발생했습니다');
    }
  };

  // Handler: Re-request review for all rejected items in current project
  const handleRequestReReviewAll = async () => {
    // Use filteredItems to respect current mediaType filter
    const currentFilteredItems = (items || []).filter(item => {
      // Apply same mediaType filter as filteredItems
      if (!reviewMode?.isReviewMode) {
        if (!item.mediaType) {
          if (mediaType !== 'image') return false;
        } else if (item.mediaType !== mediaType) {
          return false;
        }
      }
      return true;
    });

    const rejectedItems = currentFilteredItems.filter(item => {
      if (item.reviewCompleted) return false;
      const reviewResult = getReviewResultsForItem(item.id);
      return reviewResult && reviewResult.status === 'rejected';
    });

    if (rejectedItems.length === 0) {
      toast.error('재요청할 거부 아이템이 없습니다');
      return;
    }

    try {
      const itemsWithPreviousStatus = rejectedItems.map(item => {
        const reviewResult = getReviewResultsForItem(item.id);
        return {
          ...item,
          previousReviewStatus: reviewResult!.status,
          reviewStatus: 'pending' as const
        };
      });

      // Create review session with all rejected items
      const token = generateShareToken();
      const result = await createReviewSession(
        itemsWithPreviousStatus,
        token,
        72,
        10,
        activeProjectId || undefined,
        true, // isRereview
        undefined
      );

      if (result.success) {
        const reviewLink = `${window.location.origin}/review/${token}`;
        setCurrentReviewLink(reviewLink);
        setShowShareForReviewDialog(true);
        toast.success(`${rejectedItems.length}개 아이템에 대한 재요청 링크가 생성되었습니다`);
      } else {
        toast.error(result.error || '재요청 생성 실패');
      }
    } catch (error) {
      console.error('Bulk re-request error:', error);
      toast.error('일괄 재요청 생성 중 오류가 발생했습니다');
    }
  };

  // Helper: Collect rejected items from folder
  const collectRejectedItemsFromFolder = (folderId: string): BulkItem[] => {
    const folderProjects = projects.filter(p => p.folderId === folderId);
    const allRejectedItems: BulkItem[] = [];

    for (const project of folderProjects) {
      const projectRejectedItems = project.items.filter(item =>
        item.reviewStatus === 'rejected' && !item.reviewCompleted
      );

      // Add projectId and projectName for folder review tracking
      const itemsWithProjectInfo = projectRejectedItems.map(item => ({
        ...item,
        projectId: project.id,
        projectName: project.name,
        previousReviewStatus: item.reviewStatus!,
        reviewStatus: 'pending' as const
      }));

      allRejectedItems.push(...itemsWithProjectInfo);
    }

    return allRejectedItems;
  };

  // Handler: Re-request review for all rejected items in folder
  const handleRequestFolderReReview = async (folderId: string) => {
    const rejectedItems = collectRejectedItemsFromFolder(folderId);

    if (rejectedItems.length === 0) {
      toast.error('폴더 내 재요청할 거부 아이템이 없습니다');
      return;
    }

    try {
      const token = generateShareToken();
      const result = await createReviewSession(
        rejectedItems,
        token,
        72,
        10,
        undefined, // no single projectId
        true, // isRereview
        folderId
      );

      if (result.success) {
        const reviewLink = `${window.location.origin}/review/${token}`;
        setCurrentReviewLink(reviewLink);
        setShowShareForReviewDialog(true);

        const projectCount = new Set(rejectedItems.map(i => i.projectId)).size;
        toast.success(`${projectCount}개 프로젝트의 ${rejectedItems.length}개 아이템 재요청 링크 생성`);
      } else {
        toast.error(result.error || '폴더 재요청 생성 실패');
      }
    } catch (error) {
      console.error('Folder re-request error:', error);
      toast.error('폴더 재요청 생성 중 오류가 발생했습니다');
    }
  };

  // Handler: Show confirm dialog for bulk complete
  const handleBulkCompleteApproved = () => {
    // Use filteredItems to respect current mediaType filter
    const currentFilteredItems = (items || []).filter(item => {
      // Apply same mediaType filter as filteredItems
      if (!reviewMode?.isReviewMode) {
        if (!item.mediaType) {
          if (mediaType !== 'image') return false;
        } else if (item.mediaType !== mediaType) {
          return false;
        }
      }
      return true;
    });

    const reviewedItems = currentFilteredItems.filter(item => {
      if (item.reviewCompleted) return false;
      const reviewResult = getReviewResultsForItem(item.id);
      return reviewResult && (reviewResult.status === 'approved' || reviewResult.status === 'rejected');
    });

    if (reviewedItems.length === 0) {
      toast.error('확인 완료할 리뷰 아이템이 없습니다');
      return;
    }

    // Show confirmation dialog
    setShowConfirmBulkComplete(true);
  };

  // Handler: Execute bulk complete after confirmation
  const executeBulkComplete = () => {
    // Use filteredItems to respect current mediaType filter
    const currentFilteredItems = (items || []).filter(item => {
      if (!reviewMode?.isReviewMode) {
        if (!item.mediaType) {
          if (mediaType !== 'image') return false;
        } else if (item.mediaType !== mediaType) {
          return false;
        }
      }
      return true;
    });

    const reviewedItems = currentFilteredItems.filter(item => {
      if (item.reviewCompleted) return false;
      const reviewResult = getReviewResultsForItem(item.id);
      return reviewResult && (reviewResult.status === 'approved' || reviewResult.status === 'rejected');
    });

    setItems(prev => {
      return prev.map(item => {
        const reviewResult = getReviewResultsForItem(item.id);
        // Only update items that are in reviewedItems
        if (reviewedItems.some(ri => ri.id === item.id) &&
            reviewResult &&
            (reviewResult.status === 'approved' || reviewResult.status === 'rejected') &&
            !item.reviewCompleted) {
          return {
            ...item,
            reviewCompleted: true,
            reviewCompletedAt: Date.now()
          };
        }
        return item;
      });
    });

    setShowConfirmBulkComplete(false);
    toast.success(`${reviewedItems.length}개의 아이템이 처리 완료되었습니다`);
  };

  // Auto-select first project in folder review mode
  useEffect(() => {
    if (reviewMode?.reviewType === 'folder' && items.length > 0 && !selectedReviewProjectId) {
      const firstItem = items.find(item => item.projectId);
      if (firstItem?.projectId) {
        setSelectedReviewProjectId(firstItem.projectId);
      }
    }
  }, [items, reviewMode?.reviewType, selectedReviewProjectId]);

  // Load review sessions for creator
  useEffect(() => {
    if (!user || reviewMode?.isReviewMode) return;

    const loadSessions = async () => {
      try {
        const result = await getMyReviewSessions();
        if (result.success && result.sessions) {
          logger.log('[Review] Loaded sessions:', result.sessions.length);
          setReviewSessions(result.sessions || []);
        }
      } catch (err) {
        console.error('Review load error:', err);
      }
    };

    loadSessions();
    const intervalId = setInterval(loadSessions, 5000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, reviewMode?.isReviewMode]);

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

      logger.log(`[BulkGenerator] 🔄 Applying changes to ${selectedIds.size} selected items:`, {
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

        // Auto-regenerate if keywords changed (only if image already exists)
        if (addedKeywords.length > 0 && item.word && item.imageUrl) {
          setTimeout(() => {
            handleRegenerateItem(selectedId, { keywords: updatedKeywords });
          }, 100);
        }
      });
    } else {
      const item = items.find(i => i.id === id);
      handleUpdateItem(id, 'keywords', newKeywords);

      // Auto-regenerate if keywords changed (only if image already exists)
      if (item && newKeywords && item.word && newKeywords !== item.keywords && item.imageUrl) {
        setTimeout(() => {
          handleRegenerateItem(id, { keywords: newKeywords });
        }, 100);
      }
    }
  };

  const handleAddKeywordToItem = (id: string, keyword: string) => {
    if (isSelectionMode && selectedIds.has(id) && selectedIds.size > 1) {
      // Apply to all selected items, each with their own description
      selectedIds.forEach(selectedId => {
        const item = items.find(i => i.id === selectedId);
        if (!item) return;

        const useEditMode = !!item.imageUrl || item.status === 'completed' || item.status === 'processing';
        const currentDesc = useEditMode ? (edits[selectedId]?.description ?? item.description) : item.description;
        const newDesc = currentDesc ? `${currentDesc} ${keyword}` : keyword;

        handleUpdateItem(selectedId, 'description', newDesc);
      });
    } else {
      const item = items.find(i => i.id === id);
      if (!item) return;

      const useEditMode = !!item.imageUrl || item.status === 'completed' || item.status === 'processing';
      const currentDesc = useEditMode ? (edits[id]?.description ?? item.description) : item.description;
      const newDesc = currentDesc ? `${currentDesc} ${keyword}` : keyword;

      handleUpdateItem(id, 'description', newDesc);
    }
  };

  const handleAddAllKeywordsToItem = (id: string, keywords: string[]) => {
    if (isSelectionMode && selectedIds.has(id) && selectedIds.size > 1) {
      // Apply to all selected items, each with their own description
      selectedIds.forEach(selectedId => {
        const item = items.find(i => i.id === selectedId);
        if (!item) return;

        const useEditMode = !!item.imageUrl || item.status === 'completed' || item.status === 'processing';
        const currentDesc = useEditMode ? (edits[selectedId]?.description ?? item.description) : item.description;
        const keywordsText = keywords.join(' ');
        const newDesc = currentDesc ? `${currentDesc} ${keywordsText}` : keywordsText;

        handleUpdateItem(selectedId, 'description', newDesc);
      });
    } else {
      const item = items.find(i => i.id === id);
      if (!item) return;

      const useEditMode = !!item.imageUrl || item.status === 'completed' || item.status === 'processing';
      const currentDesc = useEditMode ? (edits[id]?.description ?? item.description) : item.description;
      const keywordsText = keywords.join(' ');
      const newDesc = currentDesc ? `${currentDesc} ${keywordsText}` : keywordsText;

      handleUpdateItem(id, 'description', newDesc);
    }
  };


  // Mock Generation Logic
  const handleRegenerateItem = async (id: string, updatedData?: { word?: string, description?: string, keywords?: string, isolatedBackground?: boolean }) => {
    const currentItem = items.find(i => i.id === id);
    if (!currentItem) return;

    const itemMediaType = currentItem.mediaType || mediaType;
    logger.log(`[BulkGenerator] 🎬 handleRegenerateItem called for item ${id} - Item mediaType: ${itemMediaType}, Global mediaType: ${mediaType}`);

    // Free plan: unlimited access (no credit check)

    // Merge updatedData with currentItem, ensuring we use the latest keywords
    const item = updatedData ? { ...currentItem, ...updatedData } : currentItem;

    // Log the keywords being used for regeneration
    logger.log(`[BulkGenerator] 🔑 Regenerating with keywords:`, item.keywords || 'none');

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
        logger.log('[BulkGenerator] ✅ AI mode - Using item keywords:', searchTerms);
      } else {
        // Generate new keywords with AI
        logger.log('[BulkGenerator] 🤖 AI mode - Generating keywords with AI...');
        try {
          const aiResult = await optimizeKeywordsWithAI(item.description, item.word);
          if (aiResult && aiResult.searchQuery) {
            searchTerms = aiResult.searchQuery;
            logger.log('[BulkGenerator] ✅ AI Success:', searchTerms);
          } else {
            throw new Error('AI returned empty result');
          }
        } catch (error) {
          logger.log('[BulkGenerator] ⚠️ AI failed, using word fallback:', error);
          searchTerms = item.word || 'nature';
        }
      }
    } else if (item.isolatedBackground) {
      // Manual mode + Isolated background
      searchTerms = `${item.word} isolated background`;
      logger.log('[BulkGenerator] 🎯 Manual mode - Isolated background:', searchTerms);
    } else if (item.keywords && item.keywords.trim().length > 0) {
      // Manual mode + keywords
      searchTerms = item.keywords;
      logger.log('[BulkGenerator] ✅ Manual mode - Using keywords:', searchTerms);
    } else {
      // Manual mode without keywords - use word only
      searchTerms = item.word;
      logger.log('[BulkGenerator] 🎯 Manual mode - Word only:', searchTerms);
    }

    if (!searchTerms || searchTerms.trim().length === 0) {
      searchTerms = item.word || 'nature';
      logger.log('[BulkGenerator] ⚠️ Empty keywords, using fallback:', searchTerms);
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
      logger.log('[BulkGenerator] 🔍 Searching all sources in parallel:', {
        sources: selectedSources,
        searchTerms,
        mediaType: itemMediaType
      });

      // Get tracking data from current item
      const usedUrls = currentItem.usedImageUrls || [];
      let currentPage = currentItem.currentPage || 1;

      const searchPromises = selectedSources.map(async (source) => {
        try {
          logger.log(`[BulkGenerator] 🔍 Trying ${source}...`);

          switch (source) {
            case 'unsplash':
              let unsplashResult = await getRandomUnsplashPhoto(searchTerms, { excludeUrls: usedUrls, page: currentPage });
              // If page exhausted, try next page
              if (!unsplashResult) {
                logger.log(`[BulkGenerator] Unsplash page ${currentPage} exhausted, trying page ${currentPage + 1}`);
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
              logger.log(`[BulkGenerator] Pexels search - mediaType: ${itemMediaType}`);
              let pexelsResult = itemMediaType === 'video'
                ? await getRandomPexelsVideo(searchTerms, { excludeUrls: usedUrls, page: currentPage })
                : await getRandomPexelsPhoto(searchTerms, { excludeUrls: usedUrls, page: currentPage });
              // If page exhausted, try next page
              if (!pexelsResult) {
                logger.log(`[BulkGenerator] Pexels page ${currentPage} exhausted, trying page ${currentPage + 1}`);
                pexelsResult = itemMediaType === 'video'
                  ? await getRandomPexelsVideo(searchTerms, { excludeUrls: [], page: currentPage + 1 })
                  : await getRandomPexelsPhoto(searchTerms, { excludeUrls: [], page: currentPage + 1 });
                if (pexelsResult) {
                  currentPage++;
                }
              }
              if (pexelsResult) {
                const url = itemMediaType === 'video' ? pexelsResult.videoUrl : pexelsResult.imageUrl;
                logger.log(`[BulkGenerator] Pexels result - URL: ${url}, mediaType: ${itemMediaType}`);
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
                logger.log(`[BulkGenerator] Pixabay page ${currentPage} exhausted, trying page ${currentPage + 1}`);
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

          logger.log(`[BulkGenerator] ⚠️ ${source} returned no results`);
          return null;
        } catch (error) {
          console.error(`[BulkGenerator] ❌ Error fetching from ${source}:`, error);
          return null;
        }
      });

      const results = await Promise.all(searchPromises);
      const validResults = results.filter(r => r !== null);
      logger.log(`[BulkGenerator] ✅ Got ${validResults.length} results from ${selectedSources.length} sources`);
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
          logger.log(`[BulkGenerator] 🎯 Using preferred source: ${preferredSource}`);

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

    logger.log(`[BulkGenerator] Generating ${count} ${itemMediaType}(s)...`);

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

        logger.log(`[BulkGenerator] ✅ Selected best result from ${mainResultSource}`);
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

        logger.log(`[BulkGenerator] ✅ Generated ${count} images from different sources`);
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

    logger.log('🎨 [DEBUG] Saving artist data:', {
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

            logger.log('✅ [DEBUG] Updated item:', {
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

  const handleExportData = (format: 'json' | 'csv' | 'excel' | 'pdf' | 'ppt' | 'sheets') => {
    const timestamp = new Date().toISOString().slice(0,10);

    if (format === 'ppt') {
        toast.info("PowerPoint export requires server-side processing");
        return;
    }

    if (format === 'pdf') {
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        let yPos = margin;

        // Title
        pdf.setFontSize(16);
        pdf.text('Keyword Gallery Export', margin, yPos);
        yPos += 10;

        pdf.setFontSize(10);
        pdf.text(`Exported: ${timestamp}`, margin, yPos);
        yPos += 15;

        // Process each item
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const source = item.imageSource?.[0] || 'Unknown';
            const isFree = isFreeStock(source);

            // Check if we need a new page
            if (yPos > pageHeight - 60) {
                pdf.addPage();
                yPos = margin;
            }

            // Word
            pdf.setFontSize(14);
            pdf.setFont(undefined, 'bold');
            pdf.text(item.word || `Item ${i + 1}`, margin, yPos);
            yPos += 8;

            // Description
            if (item.description) {
                pdf.setFontSize(10);
                pdf.setFont(undefined, 'normal');
                const descLines = pdf.splitTextToSize(item.description, pageWidth - 2 * margin);
                pdf.text(descLines, margin, yPos);
                yPos += descLines.length * 5 + 3;
            }

            // Keywords
            if (item.keywords) {
                pdf.setFontSize(9);
                pdf.setTextColor(100, 100, 100);
                pdf.text(`Keywords: ${item.keywords}`, margin, yPos);
                pdf.setTextColor(0, 0, 0);
                yPos += 7;
            }

            // Image handling
            if (isFree && item.imageUrl) {
                // FREE: Embed image
                try {
                    pdf.setFontSize(8);
                    pdf.setTextColor(0, 100, 0);
                    pdf.text(`[FREE Stock Image from ${source}]`, margin, yPos);
                    pdf.setTextColor(0, 0, 0);
                    yPos += 5;

                    // Attribution
                    if (item.photographer) {
                        pdf.text(`Photo by ${item.photographer}`, margin, yPos);
                        yPos += 5;
                    }
                    if (item.imageSourceUrl) {
                        pdf.textWithLink('View source', margin, yPos, { url: item.imageSourceUrl });
                        yPos += 8;
                    }
                } catch (err) {
                    console.error('Error adding image info:', err);
                    yPos += 5;
                }
            } else if (item.imageSourceUrl) {
                // PAID: Show as link only
                pdf.setFontSize(8);
                pdf.setTextColor(200, 0, 0);
                pdf.text(`[PAID Stock - License Required]`, margin, yPos);
                yPos += 5;
                pdf.setTextColor(0, 0, 255);
                pdf.textWithLink(`View on ${source}`, margin, yPos, { url: item.imageSourceUrl });
                pdf.setTextColor(0, 0, 0);
                yPos += 8;
            }

            // Notes
            if (item.note) {
                pdf.setFontSize(9);
                pdf.setTextColor(80, 80, 80);
                const noteLines = pdf.splitTextToSize(`Note: ${item.note}`, pageWidth - 2 * margin);
                pdf.text(noteLines, margin, yPos);
                pdf.setTextColor(0, 0, 0);
                yPos += noteLines.length * 5 + 5;
            }

            // Separator
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 10;
        }

        // Save PDF
        pdf.save(`keyword-gallery-${timestamp}.pdf`);
        toast.success(`Exported ${items.length} items as PDF`);
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

  const handleExportProject = (projectId: string, format: 'json' | 'csv' | 'excel' | 'pdf' | 'ppt' | 'sheets') => {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      toast.error("Project not found");
      return;
    }

    const timestamp = new Date().toISOString().slice(0,10);
    const projectItems = project.items;

    if (projectItems.length === 0) {
      toast.info("Project has no items to export");
      return;
    }

    if (format === 'ppt') {
        toast.info("PowerPoint export requires server-side processing");
        return;
    }

    if (format === 'pdf') {
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        let yPos = margin;

        // Title
        pdf.setFontSize(16);
        pdf.text('Keyword Gallery Export', margin, yPos);
        yPos += 10;

        pdf.setFontSize(10);
        pdf.text(`Exported: ${timestamp}`, margin, yPos);
        yPos += 15;

        // Process each item
        for (let i = 0; i < projectItems.length; i++) {
            const item = projectItems[i];
            const source = item.imageSource?.[0] || 'Unknown';
            const isFree = isFreeStock(source);

            // Check if we need a new page
            if (yPos > pageHeight - 60) {
                pdf.addPage();
                yPos = margin;
            }

            // Word
            pdf.setFontSize(14);
            pdf.setFont(undefined, 'bold');
            pdf.text(item.word || `Item ${i + 1}`, margin, yPos);
            yPos += 8;

            // Description
            if (item.description) {
                pdf.setFontSize(10);
                pdf.setFont(undefined, 'normal');
                const descLines = pdf.splitTextToSize(item.description, pageWidth - 2 * margin);
                pdf.text(descLines, margin, yPos);
                yPos += descLines.length * 5 + 3;
            }

            // Keywords
            if (item.keywords) {
                pdf.setFontSize(9);
                pdf.setTextColor(100, 100, 100);
                pdf.text(`Keywords: ${item.keywords}`, margin, yPos);
                pdf.setTextColor(0, 0, 0);
                yPos += 7;
            }

            // Image handling
            if (isFree && item.imageUrl) {
                // FREE: Embed image
                try {
                    pdf.setFontSize(8);
                    pdf.setTextColor(0, 100, 0);
                    pdf.text(`[FREE Stock Image from ${source}]`, margin, yPos);
                    pdf.setTextColor(0, 0, 0);
                    yPos += 5;

                    // Attribution
                    if (item.photographer) {
                        pdf.text(`Photo by ${item.photographer}`, margin, yPos);
                        yPos += 5;
                    }
                    if (item.imageSourceUrl) {
                        pdf.textWithLink('View source', margin, yPos, { url: item.imageSourceUrl });
                        yPos += 8;
                    }
                } catch (err) {
                    console.error('Error adding image info:', err);
                    yPos += 5;
                }
            } else if (item.imageSourceUrl) {
                // PAID: Show as link only
                pdf.setFontSize(8);
                pdf.setTextColor(200, 0, 0);
                pdf.text(`[PAID Stock - License Required]`, margin, yPos);
                yPos += 5;
                pdf.setTextColor(0, 0, 255);
                pdf.textWithLink(`View on ${source}`, margin, yPos, { url: item.imageSourceUrl });
                pdf.setTextColor(0, 0, 0);
                yPos += 8;
            }

            // Notes
            if (item.note) {
                pdf.setFontSize(9);
                pdf.setTextColor(80, 80, 80);
                const noteLines = pdf.splitTextToSize(`Note: ${item.note}`, pageWidth - 2 * margin);
                pdf.text(noteLines, margin, yPos);
                pdf.setTextColor(0, 0, 0);
                yPos += noteLines.length * 5 + 5;
            }

            // Separator
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 10;
        }

        // Save PDF
        pdf.save(`keyword-gallery-${timestamp}.pdf`);
        toast.success(`Exported ${projectItems.length} items as PDF`);
        return;
    }

    if (format === 'sheets') {
        toast.info("Exporting CSV for Google Sheets import");
        format = 'csv';
    }

    if (format === 'json') {
        const dataStr = JSON.stringify(projectItems, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${project.name}-export-${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${project.name} as JSON`);
    } else {
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

        const rows = projectItems.map(item => {
            const source = item.imageSource?.[0] || 'Unknown';
            const isFree = isFreeStock(source);
            const isPaid = isPaidStock(source);

            let stockType = 'Unknown';
            let exportPermission = 'N/A';
            let licenseInfo = '';
            let imageUrlForExport = '';

            if (isFree) {
                stockType = 'FREE';
                exportPermission = 'Preview & export thumbnails allowed';
                licenseInfo = 'Free stock – Check license before use';
                imageUrlForExport = item.imageUrl || '';
            } else if (isPaid) {
                stockType = 'PAID';
                exportPermission = 'Preview only · export links only';
                licenseInfo = 'Paid stock – License required';
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

        const bom = "\uFEFF";
        const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${project.name}-export-${timestamp}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        const freeCount = projectItems.filter(item => isFreeStock(item.imageSource?.[0] || '')).length;
        const paidCount = projectItems.filter(item => isPaidStock(item.imageSource?.[0] || '')).length;

        toast.success(`Exported ${project.name}: ${projectItems.length} items (${freeCount} FREE, ${paidCount} PAID)`);
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
                logger.log('[BulkGenerator Extract] ✅ AI mode - Using existing keywords:', searchTerms);
            } else {
                // Generate new keywords with AI
                logger.log('[BulkGenerator Extract] 🤖 AI mode - Generating with AI...');
                try {
                    const aiResult = await optimizeKeywordsWithAI(item.description, item.word);
                    if (aiResult && aiResult.searchQuery) {
                        searchTerms = aiResult.searchQuery;
                        logger.log('[BulkGenerator Extract] ✅ AI Success:', searchTerms);
                    } else {
                        throw new Error('AI returned empty result');
                    }
                } catch (error) {
                    logger.log('[BulkGenerator Extract] ⚠️ AI failed, using word fallback:', error);
                    searchTerms = item.word || 'nature';
                }
            }
        } else if (item.isolatedBackground) {
            // Manual mode + Isolated background
            searchTerms = `${item.word} isolated background`;
            logger.log('[BulkGenerator Extract] 🎯 Manual mode - Isolated background:', searchTerms);
        } else if (item.keywords && item.keywords.trim().length > 0) {
            // Manual mode + keywords
            searchTerms = item.keywords;
            logger.log('[BulkGenerator Extract] ✅ Manual mode - Using keywords:', searchTerms);
        } else {
            // Manual mode without keywords - use word only
            searchTerms = item.word;
            logger.log('[BulkGenerator Extract] 🎯 Manual mode - Word only:', searchTerms);
        }

        // Ensure searchTerms is not empty
        if (!searchTerms || searchTerms.trim().length === 0) {
            searchTerms = item.word || 'nature';
            logger.log('[BulkGenerator Extract] ⚠️ Empty keywords, using fallback:', searchTerms);
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
        logger.log(`[BulkGenerator Extract] Generating ${count} ${mediaType}(s) for ${item.word}...`);
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

            toast.success(`Searched ${mediaType === 'video' ? 'videos' : 'images'} for ${itemsToProcess.length} items (${sourcesSummary})`);
        } catch (error) {
            console.error('[BulkGenerator Extract] Batch processing error:', error);
            toast.error('Some images failed to generate');
        }
    }, 2000);
  };

  // Sorting Logic - Filter items by media type
  const filteredItems = (items || []).filter(item => {
    // Skip mediaType tab filtering in review mode (use reviewMediaFilter instead)
    if (!reviewMode?.isReviewMode) {
      // Filter by media type (only for normal user sessions)
      if (!item.mediaType) {
        if (mediaType !== 'image') return false; // Old items default to image
      } else if (item.mediaType !== mediaType) {
        return false;
      }
    }

    // Filter by project in review mode
    if (reviewMode?.isReviewMode && reviewMode?.reviewType === 'folder' && selectedReviewProjectId) {
      if (item.projectId !== selectedReviewProjectId) return false;
    }

    return true;
  });


  const sortedItems = [...(filteredItems || [])].sort((a, b) => {
    if (sortBy === 'word-asc') return a.word.localeCompare(b.word);
    if (sortBy === 'word-desc') return b.word.localeCompare(a.word);
    if (sortBy === 'status') return a.status.localeCompare(b.status);
    if (sortBy === 'oldest') return a.createdAt - b.createdAt;
    return b.createdAt - a.createdAt; // newest
  });

  // Apply review filter for creator view
  const filteredItemsByReview = useMemo(() => {
    let filtered = sortedItems;

    // Filter out empty items in review mode
    if (reviewMode?.isReviewMode) {
      filtered = filtered.filter(item => {
        // Keep items that have word or imageUrl
        return item.word?.trim() || item.imageUrl;
      });
    }

    // Apply review status filter (only for creator view and only when reviews exist)
    if (!reviewMode?.isReviewMode) {
      // Check if there are any reviews to filter
      const hasAnyReviews = sortedItems.some(item => {
        const reviewResult = getReviewResultsForItem(item.id);
        return reviewResult !== null;
      });

      if (hasAnyReviews) {
        // Filter out only hidden reviews (keep completed ones visible)
        filtered = filtered.filter(item => !item.reviewHidden);

        // Apply specific filter if not 'all'
        if (reviewFilter !== 'all') {
          filtered = filtered.filter(item => {
            // Get review results for this item
            const reviewResult = getReviewResultsForItem(item.id);
            if (!reviewResult) return false;

            // Apply filter
            if (reviewFilter === 'approved') return reviewResult.status === 'approved';
            if (reviewFilter === 'rejected') return reviewResult.status === 'rejected';
            return true;
          });
        }
        // For 'all' filter, show all items (both with and without review results)
        // This allows adding new items while viewing reviews
      }
    }

    // Apply media type filter (for both review mode and creator view)
    if (reviewMediaFilter) {
      filtered = filtered.filter(item => item.mediaType === reviewMediaFilter);
    }

    return filtered;
  }, [sortedItems, reviewFilter, reviewMediaFilter, reviewMode?.isReviewMode, reviewSessions, activeProjectId, currentFolderId, getReviewResultsForItem]);

  // Count items by review status for filter UI
  const reviewCounts = useMemo(() => {
    const counts = { approved: 0, rejected: 0 };
    sortedItems.forEach(item => {
      if (item.reviewCompleted || item.reviewHidden) return;
      const reviewResult = getReviewResultsForItem(item.id);
      if (reviewResult) {
        if (reviewResult.status === 'approved') counts.approved++;
        if (reviewResult.status === 'rejected') counts.rejected++;
      }
    });
    return counts;
  }, [sortedItems, reviewSessions, activeProjectId, currentFolderId, getReviewResultsForItem]);

  // Count items by media type for filter UI
  const mediaTypeCounts = useMemo(() => {
    const counts = { image: 0, video: 0 };
    // Count from all items (not filtered by current mediaType tab)
    // But respect project filter in folder review mode
    const itemsToCount = (items || []).filter(item => {
      // Filter out empty items in review mode
      if (reviewMode?.isReviewMode) {
        if (!item.word?.trim() && !item.imageUrl) return false;
      }

      // Filter by project in review mode
      if (reviewMode?.isReviewMode && reviewMode?.reviewType === 'folder' && selectedReviewProjectId) {
        if (item.projectId !== selectedReviewProjectId) return false;
      }
      return true;
    });

    itemsToCount.forEach(item => {
      // Items without mediaType default to 'image'
      const type = item.mediaType || 'image';
      if (type === 'image') counts.image++;
      else if (type === 'video') counts.video++;
    });
    return counts;
  }, [items, reviewMode?.isReviewMode, reviewMode?.reviewType, selectedReviewProjectId]);

  // Check if both media types exist
  const hasMixedMedia = mediaTypeCounts.image > 0 && mediaTypeCounts.video > 0;

  const maxCreatedAt = (items || []).length > 0 ? Math.max(...(items || []).map(i => i.createdAt)) : 0;
  
  const showVisuals = (items || []).some(i => i.status === 'processing' || i.status === 'completed' || !!i.imageUrl);

  return (
    <>
    <div className="max-w-full mx-auto flex gap-0 p-0 h-screen relative">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Left: Settings Panel */}
      {!reviewMode?.isReviewMode && (
      <div className={`flex-shrink-0 h-full transition-all duration-300 ease-in-out
        ${mobileSidebarOpen ? 'fixed top-0 left-0 z-50 translate-x-0 w-[332px]' : 'fixed top-0 left-0 z-50 -translate-x-full w-[332px]'}
        ${desktopSidebarOpen ? 'md:relative md:translate-x-0 md:w-64' : 'md:relative md:translate-x-0 md:w-0 md:overflow-hidden'}`}>
        <div className="h-full overflow-y-auto flex flex-col w-[332px] md:w-full">
          <Card className="border-slate-200 shadow-none bg-white flex flex-col h-full rounded-none border-y-0 border-l-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex justify-end items-center">
          {/* Desktop: Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDesktopSidebarOpen(false)}
            className="hidden md:flex h-8 gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            접기
          </Button>
          {/* Mobile: Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden h-8 w-8"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <CardContent className="pt-4 flex-1 overflow-y-auto">
                {/* Media Type Toggle */}
                <div className="mb-6">
                  <Tabs value={mediaType} onValueChange={(v) => setMediaType(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-9">
                      <TabsTrigger value="image" className="text-xs">Image</TabsTrigger>
                      <TabsTrigger value="video" className="text-xs">Video</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Settings Section */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-400 uppercase">Settings</Label>

                  {/* Sources */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Sources</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between font-normal h-9 px-3 rounded bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300">
                          {imageSource.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {imageSource.slice(0, 2).map(s => (
                                <Badge key={s} variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-slate-50 text-slate-700 border border-slate-200">
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </Badge>
                              ))}
                              {imageSource.length > 2 && (
                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal text-slate-500">
                                  +{imageSource.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">Select sources...</span>
                          )}
                          <ChevronDown className="h-4 w-4 opacity-30 ml-2 shrink-0" />
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
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Per Item */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Per Item</Label>
                    <Select value={imageCount} onValueChange={setImageCount}>
                      <SelectTrigger className="w-full h-9 bg-slate-50 border-slate-200 focus:bg-white focus:border-slate-300 rounded">
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

                  {/* Grid Rows */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Grid Rows</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={targetCountByType[mediaType]}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setTargetCountByType(prev => ({ ...prev, [mediaType]: 1 }));
                          } else {
                            const num = parseInt(val);
                            if (!isNaN(num) && num >= 1) {
                              setTargetCountByType(prev => ({ ...prev, [mediaType]: num }));
                            }
                          }
                        }}
                        className="w-full h-9 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-300 transition-all rounded pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-0">
                        <button
                          type="button"
                          onClick={() => setTargetCountByType(prev => ({ ...prev, [mediaType]: Math.min(50, prev[mediaType] + 1) }))}
                          className="h-3.5 w-4 flex items-center justify-center hover:bg-slate-200 rounded-sm transition-colors"
                        >
                          <ChevronUp className="h-3 w-3 opacity-30" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetCountByType(prev => ({ ...prev, [mediaType]: Math.max(1, prev[mediaType] - 1) }))}
                          className="h-3.5 w-4 flex items-center justify-center hover:bg-slate-200 rounded-sm transition-colors"
                        >
                          <ChevronDown className="h-3 w-3 opacity-30" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Folder Section */}
                <div className="space-y-3 mt-10 pt-10 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-400 uppercase">Project Folder</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={handleAddNewProject}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setParentFolderIdForNewFolder(null);
                          setShowAddFolderDialog(true);
                        }}
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Project and Folder Tree */}
                  <div className="flex flex-col gap-0.5" onClick={(e) => {
                    // Clear folder selection when clicking on empty area
                    if (e.target === e.currentTarget) {
                      setCurrentFolderId(null);
                    }
                  }}>
                    {/* Render root folders */}
                    {folders.filter(f => !f.parentId).map(folder => (
                      <FolderTreeItem
                        key={folder.id}
                        folder={folder}
                        allFolders={folders}
                        projects={projects}
                        expandedFolders={expandedFolders}
                        activeProjectId={activeProjectId}
                        level={0}
                        currentFolderId={currentFolderId}
                        onToggleExpand={toggleFolderExpanded}
                        onRenameFolder={(id) => {
                          setSelectedFolderId(id);
                          setShowRenameFolderDialog(true);
                        }}
                        onDeleteFolder={(id) => {
                          setSelectedFolderId(id);
                          setShowDeleteFolderDialog(true);
                        }}
                        onAddSubfolder={(parentId) => {
                          setParentFolderIdForNewFolder(parentId);
                          setShowAddFolderDialog(true);
                        }}
                        onShareFolder={(id) => {
                          setCurrentFolderId(id);
                          setShowShareForReviewDialog(true);
                        }}
                        onSwitchProject={(id) => {
                          setCurrentFolderId(null);
                          switchActiveProject(id);
                        }}
                        onRenameProject={(id) => {
                          setCurrentFolderId(null);
                          switchActiveProject(id);
                          setShowRenameProjectDialog(true);
                        }}
                        onDuplicateProject={(id) => {
                          setCurrentFolderId(null);
                          switchActiveProject(id);
                          setShowDuplicateProjectDialog(true);
                        }}
                        onDeleteProject={(id) => {
                          setCurrentFolderId(null);
                          switchActiveProject(id);
                          setShowDeleteProjectDialog(true);
                        }}
                        onShareProject={(id) => {
                          setCurrentFolderId(null);
                          switchActiveProject(id);
                          setShowShareForReviewDialog(true);
                        }}
                        onExportProject={handleExportProject}
                        onMoveProject={moveProjectToFolder}
                        onSelectFolder={setCurrentFolderId}
                        reviewSessions={reviewSessions}
                        onRequestFolderReReview={handleRequestFolderReReview}
                        getReviewResultsForItem={getReviewResultsForItem}
                      />
                    ))}

                    {/* Render root-level projects (not in any folder) */}
                    {projects.filter(p => !p.folderId).map(project => (
                      <ProjectTreeItem
                        key={project.id}
                        project={project}
                        isActive={project.id === activeProjectId}
                        level={0}
                        onSwitch={(id) => {
                          setCurrentFolderId(null);
                          switchActiveProject(id);
                        }}
                        onRename={(id) => {
                          setCurrentFolderId(null);
                          switchActiveProject(id);
                          setShowRenameProjectDialog(true);
                        }}
                        onDuplicate={(id) => {
                          setCurrentFolderId(null);
                          switchActiveProject(id);
                          setShowDuplicateProjectDialog(true);
                        }}
                        onDelete={(id) => {
                          setCurrentFolderId(null);
                          switchActiveProject(id);
                          setShowDeleteProjectDialog(true);
                        }}
                        onShare={(id) => {
                          setCurrentFolderId(null);
                          switchActiveProject(id);
                          setShowShareForReviewDialog(true);
                        }}
                        onExport={handleExportProject}
                        onMove={moveProjectToFolder}
                        folders={folders}
                        reviewSessions={reviewSessions}
                        getReviewResultsForItem={getReviewResultsForItem}
                      />
                    ))}

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 rounded-lg p-2 transition-colors cursor-pointer">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar_url} alt={user.name} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-medium">
                      {user.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-medium text-slate-900 truncate">{user.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-slate-500">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  onClick={onLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </Card>
        </div>
      </div>
      )}

      {/* Right: List Section */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <Card className="border-slate-200 shadow-none bg-white overflow-hidden h-full flex flex-col rounded-none border-y-0 border-r-0">
        {/* Toolbar Header - Sticky */}
        <div className="sticky top-0 z-10 bg-slate-50/50 px-4 md:py-6 py-4 flex items-center justify-between gap-2">
              {/* Desktop Controls - Left Side */}
              <div className="hidden md:flex items-center gap-3 ml-[1px]">
              {/* Desktop Menu Button - Hidden when sidebar is open or in review mode */}
              {!desktopSidebarOpen && !reviewMode?.isReviewMode && (
                <button
                  className="flex items-center justify-center w-8 h-8 hover:bg-slate-100 rounded transition-colors"
                  onClick={() => setDesktopSidebarOpen(true)}
                >
                  <EllipsisVertical className="h-5 w-5 text-slate-500" />
                </button>
              )}

              {/* Searchedia Home Button */}
              <button
                className={`flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${!desktopSidebarOpen ? 'ml-0' : 'ml-[30px]'}`}
                onClick={onCancel}
              >
                <span className="font-bold text-2xl tracking-tight text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>Searchedia</span>
                {reviewMode?.isReviewMode && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                    Review Mode
                  </Badge>
                )}
              </button>

              </div>

              {/* Right Side - Toolbar Buttons (Desktop only) */}
              <div className="hidden md:flex items-center gap-2">
                {reviewMode?.isReviewMode ? (
                  /* Review Mode Toolbar */
                  <>
                    {/* Project Filter for Folder Reviews */}
                    {reviewMode?.reviewType === 'folder' && (() => {
                      // Get unique projects from items
                      const projectsInReview = items.reduce((acc: Array<{id: string, name: string, count: number}>, item) => {
                        if (!item.projectId || !item.projectName) return acc;
                        const existing = acc.find(p => p.id === item.projectId);
                        if (existing) {
                          existing.count++;
                        } else {
                          acc.push({ id: item.projectId, name: item.projectName, count: 1 });
                        }
                        return acc;
                      }, []);

                      return projectsInReview.length > 0 ? (
                        <Select value={selectedReviewProjectId} onValueChange={setSelectedReviewProjectId}>
                          <SelectTrigger className="h-8 text-xs w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {projectsInReview.map(project => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name} ({project.count})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null;
                    })()}

                    {/* Media Type Filter (only show if both types exist) */}
                    {hasMixedMedia && (
                      <div className="flex gap-1">
                        <Button
                          variant={reviewMediaFilter === 'image' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setReviewMediaFilter(reviewMediaFilter === 'image' ? null : 'image')}
                          className="h-8 text-xs"
                        >
                          <ImageIcon className="h-3.5 w-3.5 mr-1" />
                          이미지 ({mediaTypeCounts.image})
                        </Button>
                        <Button
                          variant={reviewMediaFilter === 'video' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setReviewMediaFilter(reviewMediaFilter === 'video' ? null : 'video')}
                          className="h-8 text-xs"
                        >
                          <Video className="h-3.5 w-3.5 mr-1" />
                          비디오 ({mediaTypeCounts.video})
                        </Button>
                      </div>
                    )}

                    <Button
                      onClick={handleSubmitReview}
                      disabled={isSubmittingReview}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingReview ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5 mr-2" />
                          Submit Review
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  /* Normal Mode Toolbar */
                  <>
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
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Delete ({selectedIds.size})
                                </Button>
                              </>
                          )}
                        </>
                    ) : (
                        <Button variant="outline" size="sm" onClick={handleToggleSelectionMode} className="h-8 text-xs">
                            <CheckSquare className="mr-2 h-3.5 w-3.5 text-slate-500" /> Select
                        </Button>
                    )}

                    {/* Add Row Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTargetCountByType(prev => ({ ...prev, [mediaType]: prev[mediaType] + 1 }));
                        setFocusNewRow(true);
                      }}
                      className="h-8 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-2 text-slate-500" />
                      Add
                    </Button>

                    {/* Search items button */}
                    <Button
                       onClick={handleExtractImages}
                       className="bg-slate-800 hover:bg-slate-900 text-white h-8 text-xs"
                       disabled={items.filter(i => i.word.trim() && !i.imageUrl).length === 0}
                    >
                       {(() => {
                         const count = items.filter(i => i.word.trim() && !i.imageUrl).length;
                         return count > 0 ? `Search ${count} items` : 'Search items';
                       })()}
                    </Button>
                  </>
                )}
              </div>

              {/* Mobile Toolbar Buttons - Left */}
              <div className="md:hidden flex items-center gap-2 flex-wrap">
                {reviewMode?.isReviewMode ? (
                  /* Review Mode Mobile Toolbar */
                  <>
                    {/* Project Filter for Folder Reviews */}
                    {reviewMode?.reviewType === 'folder' && (() => {
                      // Get unique projects from items
                      const projectsInReview = items.reduce((acc: Array<{id: string, name: string, count: number}>, item) => {
                        if (!item.projectId || !item.projectName) return acc;
                        const existing = acc.find(p => p.id === item.projectId);
                        if (existing) {
                          existing.count++;
                        } else {
                          acc.push({ id: item.projectId, name: item.projectName, count: 1 });
                        }
                        return acc;
                      }, []);

                      return projectsInReview.length > 0 ? (
                        <Select value={selectedReviewProjectId} onValueChange={setSelectedReviewProjectId}>
                          <SelectTrigger className="h-8 text-xs w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {projectsInReview.map(project => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name} ({project.count})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null;
                    })()}

                    {/* Media Type Filter (only show if both types exist) */}
                    {hasMixedMedia && (
                      <div className="flex gap-1">
                        <Button
                          variant={reviewMediaFilter === 'image' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setReviewMediaFilter(reviewMediaFilter === 'image' ? null : 'image')}
                          className="h-8 text-xs"
                        >
                          <ImageIcon className="h-3.5 w-3.5 mr-1" />
                          이미지 ({mediaTypeCounts.image})
                        </Button>
                        <Button
                          variant={reviewMediaFilter === 'video' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setReviewMediaFilter(reviewMediaFilter === 'video' ? null : 'video')}
                          className="h-8 text-xs"
                        >
                          <Video className="h-3.5 w-3.5 mr-1" />
                          비디오 ({mediaTypeCounts.video})
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  /* Normal Mode Mobile Toolbar */
                  <>
                    {/* Sort Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs min-w-[80px]"
                        onClick={() => setSortBy(prev => prev === 'newest' ? 'oldest' : 'newest')}
                    >
                        <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-slate-500" />
                        {sortBy === 'newest' ? 'Newest' : 'Oldest'}
                    </Button>

                    {/* Selection Button */}
                    {isSelectionMode ? (
                        <Button variant="ghost" size="sm" onClick={handleToggleSelectionMode} className="h-8 text-xs">
                            Cancel
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" onClick={handleToggleSelectionMode} className="h-8 text-xs">
                            <CheckSquare className="mr-1 h-3.5 w-3.5 text-slate-500" /> Select
                        </Button>
                    )}

                    {/* Add Row Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTargetCountByType(prev => ({ ...prev, [mediaType]: prev[mediaType] + 1 }));
                        setFocusNewRow(true);
                      }}
                      className="h-8 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1 text-slate-500" />
                      Add
                    </Button>
                  </>
                )}
              </div>

              {/* Mobile Hamburger Menu - Right */}
              {!reviewMode?.isReviewMode && (
                <button
                  className="md:hidden flex items-center justify-center w-8 h-8 hover:bg-slate-100 rounded transition-colors ml-auto"
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                >
                  <Menu className="h-6 w-6 text-slate-500" />
                </button>
              )}
        </div>

        {/* Mobile Card View */}
        <div className={`flex-1 overflow-y-auto md:hidden p-3 space-y-3 ${reviewMode?.isReviewMode ? 'pb-28' : 'pb-20'}`}>
          {filteredItemsByReview.map((item, idx) => (
            <Card key={item.id} className={`border-slate-300 shadow-sm ${isSelectionMode && selectedIds.has(item.id) ? 'ring-2 ring-slate-400' : ''}`}>
              <CardContent className="p-0 space-y-0">
                {/* # Column */}
                <div className="px-6 pt-5 pb-4 flex items-center justify-between">
                  <span className="text-base font-medium text-slate-400">#{item.number}</span>
                  <div className="flex gap-1">
                    {item.imageSourceUrl && (
                      <a
                        href={item.imageSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-full transition-colors shadow-sm"
                        title="View original"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {item.imageUrl && (
                      <button
                        onClick={() => {
                          if (item.artistUrl && item.artistUrl.trim() !== '') {
                            window.open(item.artistUrl, '_blank', 'noopener,noreferrer');
                          } else if (item.artistName) {
                            toast.info(`Artist: ${item.artistName}`);
                          } else {
                            toast.info('Artist information not available');
                          }
                        }}
                        className="flex items-center justify-center w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-full transition-colors shadow-sm"
                        title={item.artistName ? `Artist: ${item.artistName}` : 'Artist information not available'}
                      >
                        <User className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Visual Section */}
                {showVisuals && item.imageUrl && (
                  <div className="relative px-6 pt-1 pb-3">
                    {/* Image */}
                    <div className="aspect-[16/10] w-full max-w-sm mx-auto overflow-hidden relative bg-slate-100 flex items-center justify-center shadow-sm group/img">
                      {item.mediaType === 'video' ? (
                        <video src={item.imageUrl} className="w-full h-full object-cover" controls loop muted />
                      ) : (
                        <img src={item.imageUrl} alt={item.word} className="w-full h-full object-cover" />
                      )}

                      {/* Top Overlay - Status & Selection */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                        <div className="flex items-center gap-2">
                          {isSelectionMode && (
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={(checked) => handleSelectRow(item.id, checked as boolean)}
                              className="bg-white/90 backdrop-blur-sm"
                            />
                          )}
                          {item.imageSource?.[0] && (
                            isFreeStock(item.imageSource[0]) ? (
                              <Badge variant="secondary" className="bg-slate-800/90 text-white border-0 text-[9px] px-2 h-5 backdrop-blur-sm shadow-sm font-medium">
                                FREE
                              </Badge>
                            ) : isPaidStock(item.imageSource[0]) ? (
                              <Badge variant="secondary" className="bg-slate-900/90 text-white border-0 text-[9px] px-2 h-5 backdrop-blur-sm shadow-sm font-medium">
                                PAID
                              </Badge>
                            ) : null
                          )}
                        </div>
                        {item.status === 'processing' && (
                          <Badge variant="outline" className="bg-white/90 text-slate-700 border-slate-300 gap-1 pl-1.5 pr-2 backdrop-blur-sm">
                            <Loader2 className="h-3 w-3 animate-spin" /> Working
                          </Badge>
                        )}
                      </div>

                      {/* Bottom Overlay - Source */}
                      <div className="absolute bottom-2 right-2 z-10">
                        <Badge variant="secondary" className="bg-black/70 text-white border-0 text-[11px] px-2.5 h-6 backdrop-blur-sm shadow-sm font-normal">
                          {item.imageSource || 'AI Generated'}
                        </Badge>
                      </div>

                      {/* Carousel Navigation */}
                      {item.generatedImages && item.generatedImages.length > 1 && !reviewMode?.isReviewMode && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-white/80 hover:bg-white shadow-md backdrop-blur-sm transition-opacity"
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
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-white/80 hover:bg-white shadow-md backdrop-blur-sm transition-opacity"
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
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
                            <Badge variant="secondary" className="bg-black/60 text-white border-0 text-sm px-3 h-7 backdrop-blur-sm shadow-sm font-medium">
                              {(item.selectedImageIndex || 0) + 1}/{item.generatedImages.length}
                            </Badge>
                          </div>
                          {/* Select/Confirm button */}
                          <Button
                            size="sm"
                            className="absolute bottom-2 left-1/2 -translate-x-1/2 h-11 px-16 min-w-[160px] text-base bg-slate-800 hover:bg-slate-900 text-white shadow-lg z-20"
                            onClick={() => {
                              handleUpdateItem(item.id, 'generatedImages', undefined as any);
                            }}
                          >
                            <Check className="h-5 w-5 mr-1" />
                            Select
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Action Buttons Below Image */}
                    {!reviewMode?.isReviewMode && (
                      <div className="flex gap-2 px-0 py-2 mt-1">
                        <button
                          onClick={() => {
                            setSelectionDialogItem(item);
                            setCandidateUrls([]);
                            setSelectedCandidateIndex(null);
                            setNewCandidateUrl('');
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-xs font-medium"
                        >
                          <Search className="h-4 w-4" />
                          <span>Select</span>
                        </button>
                        <button
                          onClick={() => handleRegenerateItem(item.id, { keywords: item.keywords })}
                          disabled={item.status === 'processing' || !item.word}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                        >
                          <RefreshCw className={`h-4 w-4 ${item.status === 'processing' ? 'animate-spin' : ''}`} />
                          <span>Search</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Input Section */}
                <div className="px-6 pb-1 space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-600 ml-1">Word</Label>
                    <Input
                      placeholder="Enter subject..."
                      autoFocus={(focusNewRow && item.createdAt === maxCreatedAt) || (items.length === 1 && !item.word && idx === 0)}
                      value={item.word}
                      onChange={(e) => handleInputChange(item.id, 'word', e.target.value)}
                      className="bg-slate-50 border-0 focus:bg-slate-100 focus:border-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-all placeholder:text-slate-400 text-sm"
                    />
                  </div>

                  {/* Description */}
                  {columnMode === '3col' && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600 ml-1">Description</Label>
                      <Textarea
                        placeholder="Add details for better results..."
                        value={item.description}
                        onChange={(e) => handleInputChange(item.id, 'description', e.target.value)}
                        className="bg-slate-50 border-0 focus:bg-slate-100 focus:border-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-all resize-none placeholder:text-slate-400 overflow-hidden text-sm"
                        rows={1}
                        style={{ height: 'auto', minHeight: '2.5rem' }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                      />
                      <KeywordPreview
                        text={item.description}
                        word={item.word}
                        existingKeywords={item.keywords}
                        enableAI={item.isolated === false}
                        isolatedBackground={item.isolatedBackground}
                        onAddKeyword={reviewMode?.isReviewMode ? undefined : (keyword) => handleAddKeywordToItem(item.id, keyword)}
                        onAddAllKeywords={reviewMode?.isReviewMode ? undefined : (keywords) => handleAddAllKeywordsToItem(item.id, keywords)}
                        onKeywordsGenerated={reviewMode?.isReviewMode ? undefined : (keywords) => handleKeywordsChange(item.id, keywords)}
                        onRegenerateImage={reviewMode?.isReviewMode ? undefined : (item.imageUrl ? () => handleRegenerateItem(item.id, { keywords: item.keywords }) : undefined)}
                        onIsolatedBackgroundChange={reviewMode?.isReviewMode ? undefined : (value) => handleIsolatedBgChange(item.id, value)}
                        onModeChange={reviewMode?.isReviewMode ? undefined : (enabled) => handleModeChange(item.id, enabled)}
                      />
                      {/* Review Results Display */}
                      {!reviewMode?.isReviewMode && !hideAllReviews && (() => {
                        const reviewResults = getReviewResultsForItem(item.id);
                        return reviewResults ? (
                          <ReviewResultsDisplay
                            reviewStatus={reviewResults.status}
                            reviewComment={reviewResults.comment}
                            reviewedAt={reviewResults.reviewedAt}
                            reviewCompleted={item.reviewCompleted}
                            onComplete={() => handleRequestComplete(item.id)}
                            onRequestReReview={() => handleRequestReReview(item.id)}
                          />
                        ) : null;
                      })()}
                    </div>
                  )}

                  {/* Note */}
                  <div className="pt-6">
                    <Input
                      placeholder="Memo..."
                      value={item.note}
                      onChange={(e) => handleInputChange(item.id, 'note', e.target.value)}
                      className="bg-slate-50 border-0 focus:bg-slate-100 focus:border-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-all placeholder:text-slate-400 text-sm"
                    />
                  </div>

                  {/* Review Controls (Mobile) */}
                  {reviewMode?.isReviewMode && (
                    <div className="pt-4 space-y-3 border-t border-slate-200 mt-4">
                      {(reviewMode.isReadOnly || reviewCompleted) ? (
                        // Read-only mode: Show review results
                        <ReviewResultsDisplay
                          reviewStatus={item.reviewStatus}
                          reviewComment={item.reviewComment}
                        />
                      ) : (
                        // Active review mode: Show approve/reject buttons
                        <>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={item.reviewStatus === 'approved' ? 'default' : 'outline'}
                              className={`h-9 text-xs flex-1 ${
                                item.reviewStatus === 'approved'
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'hover:bg-green-50 hover:border-green-600 hover:text-green-700'
                              }`}
                              onClick={() => handleInputChange(item.id, 'reviewStatus', 'approved')}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant={item.reviewStatus === 'rejected' ? 'default' : 'outline'}
                              className={`h-9 text-xs flex-1 ${
                                item.reviewStatus === 'rejected'
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'hover:bg-red-50 hover:border-red-600 hover:text-red-700'
                              }`}
                              onClick={() => handleInputChange(item.id, 'reviewStatus', 'rejected')}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                          <Textarea
                            placeholder="Add review comment..."
                            value={item.reviewComment || ''}
                            onChange={(e) => handleInputChange(item.id, 'reviewComment', e.target.value)}
                            className="text-xs min-h-[60px] resize-none"
                            rows={2}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mobile Bottom - Search Items Button OR Review Filter (only in normal mode) */}
        {!reviewMode?.isReviewMode && (
          <>
            {/* Show Search button when no reviews exist */}
            {!(reviewCounts.approved > 0 || reviewCounts.rejected > 0) && (
              <div className="md:hidden sticky bottom-0 z-10 p-4 bg-white border-t border-slate-200">
                <Button
                   onClick={handleExtractImages}
                   className="bg-slate-800 hover:bg-slate-900 text-white w-full h-11"
                   disabled={items.filter(i => i.word.trim() && !i.imageUrl).length === 0}
                >
                   {(() => {
                     const count = items.filter(i => i.word.trim() && !i.imageUrl).length;
                     return count > 0 ? `Search ${count} items` : 'Search items';
                   })()}
                </Button>
                {isSelectionMode && selectedIds.size > 0 && (
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="flex-1 justify-center bg-slate-100 text-slate-700 border-slate-200 h-9 px-3">
                      {selectedIds.size} selected
                    </Badge>
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="h-9">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete ({selectedIds.size})
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Show Review Filter Bar when reviews exist */}
            {(reviewCounts.approved > 0 || reviewCounts.rejected > 0) && (
              <div className="md:hidden sticky bottom-0 z-10 bg-white border-t border-slate-200">
                {/* Filter Tabs */}
                <div className="px-4 pt-3 pb-2 flex gap-2">
                  <Button
                    variant={reviewFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReviewFilter('all')}
                    className="flex-1"
                  >
                    전체 ({reviewCounts.approved + reviewCounts.rejected})
                  </Button>
                  {reviewCounts.rejected > 0 && (
                    <Button
                      variant={reviewFilter === 'rejected' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReviewFilter('rejected')}
                      className={`flex-1 ${reviewFilter === 'rejected' ? '' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                    >
                      <X className="h-4 w-4 mr-1" />
                      거부됨 ({reviewCounts.rejected})
                    </Button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="px-4 pb-3 flex gap-2">
                  {reviewFilter !== 'rejected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkCompleteApproved}
                      className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50 h-10"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      일괄 확인 완료 ({reviewCounts.approved + reviewCounts.rejected})
                    </Button>
                  )}
                  {reviewCounts.rejected > 0 && reviewFilter === 'rejected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRequestReReviewAll}
                      className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-10"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      거부 건 재요청 ({reviewCounts.rejected})
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Scrollable Table Container - Desktop */}
        <div className="flex-1 overflow-y-auto -mt-6 hidden md:block pb-20">
        <Table className="m-0">
           <TableHeader className="sticky top-0 z-10 !border-t-0 !border-b-0">
              <TableRow className="!border-t-0 !border-b-0 hover:bg-transparent">
                 <TableHead className="w-[20px] p-0"></TableHead>
                 {isSelectionMode && (
                   <TableHead className="w-[40px] px-2 text-center">
                     <Checkbox
                         checked={items.length > 0 && selectedIds.size === items.length}
                         onCheckedChange={handleSelectAll}
                     />
                   </TableHead>
                 )}
                 <TableHead className="w-[50px] text-center font-bold text-slate-500">#</TableHead>
                 {showVisuals && (
                   <>
                     <TableHead className="w-[10px] p-0"></TableHead>
                     <TableHead className="w-[200px] font-bold text-slate-500">Visual & Source</TableHead>
                   </>
                 )}
                 <TableHead className={`font-bold text-slate-500 ${desktopSidebarOpen ? 'w-[120px] translate-x-8' : 'w-[180px]'}`}>Word</TableHead>
                 {columnMode === '3col' && <TableHead className={`w-[580px] font-bold text-slate-500 ${desktopSidebarOpen ? 'translate-x-8' : 'translate-x-5'}`}>Description</TableHead>}
                 <TableHead className="w-[40px] p-0"></TableHead>
                 <TableHead className={`font-bold text-slate-500 ${desktopSidebarOpen ? 'w-[120px]' : 'w-[150px]'}`}>Note</TableHead>
                 {reviewMode?.isReviewMode && (
                   <TableHead className="font-bold text-slate-500 w-[280px]">Review</TableHead>
                 )}
              </TableRow>
           </TableHeader>
           <TableBody>
              {filteredItemsByReview.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={20} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-slate-400 text-sm">
                        {items.length === 0 ? (
                          'No items in this project'
                        ) : (
                          <>No items match the current filter ({mediaType})</>
                        )}
                      </div>
                      {items.length > 0 && filteredItems.length === 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMediaType(mediaType === 'image' ? 'video' : 'image')}
                        >
                          Switch to {mediaType === 'image' ? 'Video' : 'Image'} tab
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
              {filteredItemsByReview.map((item, idx) => (
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
                           <div className="flex gap-1 md:gap-2">
                             <div className="flex flex-col gap-1.5 w-32 md:w-44 relative">
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

                                  {/* Source Name Badge - Bottom Right */}
                                  <div className="absolute bottom-1 right-1">
                                    <Badge variant="secondary" className="bg-black/60 text-white border-0 text-[9px] px-1.5 h-4 backdrop-blur-sm shadow-sm font-normal">
                                      {item.imageSource || 'AI Generated'}
                                    </Badge>
                                  </div>

                                  {/* Carousel Navigation */}
                                  {item.generatedImages && item.generatedImages.length > 1 && !reviewMode?.isReviewMode && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 bg-white/80 hover:bg-white shadow-md backdrop-blur-sm md:opacity-0 md:group-hover/img:opacity-100 transition-opacity"
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
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 bg-white/80 hover:bg-white shadow-md backdrop-blur-sm md:opacity-0 md:group-hover/img:opacity-100 transition-opacity"
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
                                        className="absolute bottom-1 left-1/2 -translate-x-1/2 h-6 px-2 text-xs bg-slate-800 hover:bg-slate-900 text-white shadow-lg"
                                        onClick={() => {
                                          // Keep only selected image and remove carousel
                                          handleUpdateItem(item.id, 'generatedImages', undefined as any);
                                        }}
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        Select
                                      </Button>
                                    </>
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

                           {/* 이미지 우측 세로 아이콘 버튼 */}
                           {item.imageUrl && !reviewMode?.isReviewMode && (
                             <div className="flex flex-col justify-between items-center self-stretch">
                               {/* 상단 그룹 */}
                               <div className="flex flex-col gap-1 items-center">
                                 <button
                                   onClick={() => {
                                     setSelectionDialogItem(item);
                                     setCandidateUrls([]);
                                     setSelectedCandidateIndex(null);
                                     setNewCandidateUrl('');
                                   }}
                                   className="flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-1 md:py-1.5 w-16 md:w-20 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors text-[10px] md:text-xs"
                                   title="Search more options"
                                 >
                                   <Search className="h-3 md:h-3.5 w-3 md:w-3.5" />
                                   <span className="text-[10px] md:text-xs font-medium">Select</span>
                                 </button>
                                 <button
                                   onClick={() => {
                                     handleRegenerateItem(item.id, { keywords: item.keywords });
                                   }}
                                   disabled={item.status === 'processing' || !item.word}
                                   className="flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-1 md:py-1.5 w-16 md:w-20 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[10px] md:text-xs"
                                   title={item.status === 'processing' ? 'Generating...' : 'Researching'}
                                 >
                                   <RefreshCw className={`h-3 md:h-3.5 w-3 md:w-3.5 ${item.status === 'processing' ? 'animate-spin' : ''}`} />
                                   <span className="text-[10px] md:text-xs font-medium">Search</span>
                                 </button>
                                 {/* 로딩 상태 */}
                                 <div className="flex items-center justify-center p-1">
                                   {item.status === 'processing' && (
                                     <div className="bg-white border border-slate-200 rounded-full p-0.5 shadow-sm">
                                       <Loader2 className="h-3 md:h-3.5 w-3 md:w-3.5 text-blue-600 animate-spin" />
                                     </div>
                                   )}
                                 </div>
                               </div>
                               {/* 하단 그룹 - 원본 링크 & Artist */}
                               <div className="flex flex-row gap-1 items-center pb-2">
                                 {item.imageSourceUrl && (
                                   <a
                                     href={item.imageSourceUrl}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="flex items-center justify-center p-1 md:p-1.5 -ml-[12px] md:-ml-[20px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                                     title="View original on stock site"
                                   >
                                     <ExternalLink className="h-3 md:h-3.5 w-3 md:w-3.5" />
                                   </a>
                                 )}
                                 <button
                                   onClick={() => {
                                     if (item.artistUrl && item.artistUrl.trim() !== '') {
                                       window.open(item.artistUrl, '_blank', 'noopener,noreferrer');
                                     } else if (item.artistName) {
                                       toast.info(`Artist: ${item.artistName}`);
                                     } else {
                                       toast.info('Artist information not available');
                                     }
                                   }}
                                   className="flex items-center justify-center p-1 md:p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                                   title={item.artistName ? `Artist: ${item.artistName}` : 'Artist information not available'}
                                 >
                                   <User className="h-3 md:h-3.5 w-3 md:w-3.5" />
                                 </button>
                               </div>
                             </div>
                           )}
                           </div>
                       ) : null}
                    </TableCell>
                    </>
                    )}
                    <TableCell className={`font-semibold text-slate-900 align-top pt-4 ${desktopSidebarOpen ? 'w-[120px] translate-x-8' : 'w-[180px]'}`}>
                       {reviewMode?.isReviewMode ? (
                         <div className="px-2 py-2 text-sm font-semibold text-slate-900">
                           {item.word || <span className="text-slate-400 font-normal">No subject</span>}
                         </div>
                       ) : (
                         <Input
                           placeholder="Enter subject..."
                           autoFocus={(focusNewRow && item.createdAt === maxCreatedAt) || (items.length === 1 && !item.word && idx === 0)}
                           value={item.word}
                           onChange={(e) => handleInputChange(item.id, 'word', e.target.value)}
                           className="bg-slate-50 md:bg-white border border-slate-400 md:border-white focus:bg-slate-50 md:focus:bg-white focus:border-slate-400 md:focus:border-slate-400 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-all px-2 h-8 font-semibold -ml-2 w-full placeholder:font-normal placeholder:text-slate-300"
                         />
                       )}
                    </TableCell>
                    {columnMode === '3col' && (
                       <TableCell className={`text-slate-600 align-top pt-4 w-[580px] max-w-[580px] ${desktopSidebarOpen ? 'translate-x-8' : 'translate-x-5'}`}>
                          {reviewMode?.isReviewMode ? (
                            <div className="px-2 py-2">
                              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                {item.description || <span className="text-slate-400">No description</span>}
                              </p>
                              {item.keywords && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {item.keywords.split(' ').filter(k => k.trim()).map((keyword, kidx) => (
                                    <Badge key={kidx} variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                                      {keyword}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2 -ml-2">
                              <div className="relative">
                                <Textarea
                                  placeholder="Add details for better results..."
                                  value={item.description}
                                  onChange={(e) => handleInputChange(item.id, 'description', e.target.value)}
                                  className="bg-slate-50 md:bg-white border border-slate-400 md:border-white focus:bg-slate-50 md:focus:bg-white focus:border-slate-400 md:focus:border-slate-400 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-all px-2 py-1.5 min-h-[32px] h-auto leading-tight text-slate-500 w-full resize-none overflow-hidden placeholder:text-slate-300"
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
                                onAddKeyword={reviewMode?.isReviewMode ? undefined : (keyword) => handleAddKeywordToItem(item.id, keyword)}
                                onAddAllKeywords={reviewMode?.isReviewMode ? undefined : (keywords) => handleAddAllKeywordsToItem(item.id, keywords)}
                                onKeywordsGenerated={reviewMode?.isReviewMode ? undefined : (keywords) => handleKeywordsChange(item.id, keywords)}
                                onRegenerateImage={reviewMode?.isReviewMode ? undefined : (item.imageUrl ? () => {
                                  // Use the current item's keywords directly from render
                                  handleRegenerateItem(item.id, { keywords: item.keywords });
                                } : undefined)}
                                onIsolatedBackgroundChange={reviewMode?.isReviewMode ? undefined : (value) => handleIsolatedBgChange(item.id, value)}
                                onModeChange={reviewMode?.isReviewMode ? undefined : (enabled) => handleModeChange(item.id, enabled)}
                              />
                              {/* Review Results Display */}
                              {!reviewMode?.isReviewMode && !hideAllReviews && (() => {
                                const reviewResults = getReviewResultsForItem(item.id);
                                return reviewResults ? (
                                  <ReviewResultsDisplay
                                    reviewStatus={reviewResults.status}
                                    reviewComment={reviewResults.comment}
                                    reviewedAt={reviewResults.reviewedAt}
                                    reviewCompleted={item.reviewCompleted}
                                    onComplete={() => handleRequestComplete(item.id)}
                                    onRequestReReview={() => handleRequestReReview(item.id)}
                                  />
                                ) : null;
                              })()}
                              </div>
                            </div>
                          )}
                       </TableCell>
                    )}
                    <TableCell className="w-[40px] p-0"></TableCell>
                    <TableCell className={`text-slate-600 align-top pt-4 ${desktopSidebarOpen ? 'w-[120px]' : 'w-[150px]'}`}>
                        {reviewMode?.isReviewMode ? (
                          <div className="px-2 py-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md">
                            {item.note || <span className="text-slate-400">No memo</span>}
                          </div>
                        ) : (
                          <Input
                              placeholder="Memo..."
                              value={item.note}
                              onChange={(e) => handleInputChange(item.id, 'note', e.target.value)}
                              className="bg-slate-50 md:bg-white border border-slate-400 md:border-white focus:bg-slate-50 md:focus:bg-white focus:border-slate-400 md:focus:border-slate-400 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-all px-2 h-8 text-slate-500 text-sm -ml-2 w-full placeholder:text-slate-300"
                          />
                        )}
                    </TableCell>
                    {reviewMode?.isReviewMode && (
                      <TableCell className="align-top pt-4 w-[280px]">
                        {(reviewMode.isReadOnly || reviewCompleted) ? (
                          // Read-only mode: Show review results
                          <ReviewResultsDisplay
                            reviewStatus={item.reviewStatus}
                            reviewComment={item.reviewComment}
                            compact={true}
                          />
                        ) : (
                          // Active review mode: Show approve/reject buttons
                          <div className="space-y-2">
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant={item.reviewStatus === 'approved' ? 'default' : 'outline'}
                                className={`h-7 text-xs flex-1 ${
                                  item.reviewStatus === 'approved'
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'hover:bg-green-50 hover:border-green-600 hover:text-green-700'
                                }`}
                                onClick={() => handleInputChange(item.id, 'reviewStatus', 'approved')}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant={item.reviewStatus === 'rejected' ? 'default' : 'outline'}
                                className={`h-7 text-xs flex-1 ${
                                  item.reviewStatus === 'rejected'
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'hover:bg-red-50 hover:border-red-600 hover:text-red-700'
                                }`}
                                onClick={() => handleInputChange(item.id, 'reviewStatus', 'rejected')}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                            <Textarea
                              placeholder="Add review comment..."
                              value={item.reviewComment || ''}
                              onChange={(e) => handleInputChange(item.id, 'reviewComment', e.target.value)}
                              className="text-xs min-h-[60px] resize-none"
                              rows={2}
                            />
                          </div>
                        )}
                      </TableCell>
                    )}
                 </TableRow>
              ))}
           </TableBody>
        </Table>

        {/* Review Filter Bar */}
        {!reviewMode?.isReviewMode && (reviewCounts.approved > 0 || reviewCounts.rejected > 0) && (
          <div className={`fixed bottom-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg transition-all duration-300 ${desktopSidebarOpen ? 'left-64' : 'left-0'}`} style={{ height: '64px' }}>
            <div className="h-full px-4 flex items-center justify-between gap-4">
              {/* Left Side: Filter Tabs */}
              <div className="flex gap-2 items-center flex-wrap">
                <Button
                  variant={reviewFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReviewFilter('all')}
                >
                  전체 ({reviewCounts.approved + reviewCounts.rejected})
                </Button>
                {reviewCounts.rejected > 0 && (
                  <Button
                    variant={reviewFilter === 'rejected' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReviewFilter('rejected')}
                    className={reviewFilter === 'rejected' ? '' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}
                  >
                    <X className="h-4 w-4 mr-1" />
                    거부됨 ({reviewCounts.rejected})
                  </Button>
                )}
              </div>

              {/* Right Side: Bulk Actions */}
              <div className="flex gap-2">
                {(reviewCounts.approved > 0 || reviewCounts.rejected > 0) && reviewFilter !== 'rejected' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkCompleteApproved}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    일괄 확인 완료 ({reviewCounts.approved + reviewCounts.rejected})
                  </Button>
                )}
                {reviewCounts.rejected > 0 && reviewFilter === 'rejected' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRequestReReviewAll}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    거부 건 재요청 ({reviewCounts.rejected})
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Fixed Bottom Submit Button (Mobile Review Mode Only) */}
        {reviewMode?.isReviewMode && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-20">
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmittingReview}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingReview ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
          </div>
        )}

      </Card>
      </div>
    </div>

      {/* Manual Selection Dialog */}
      <Dialog open={!!selectionDialogItem} onOpenChange={(open) => !open && setSelectionDialogItem(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manual Selection</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="candidates" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="candidates">Candidates</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Candidates Tab */}
            <TabsContent value="candidates" className="flex-1 overflow-y-auto mt-4">
              {/* Instruction Text */}
              <p className="text-[13px] text-slate-500 mb-5">
                Click keywordlink &gt; <span className="text-blue-600 font-semibold">Right click image &gt; Click(copy) image address</span> &gt; Paste
              </p>

              {/* Keyword Link Button and URL Input - Horizontal Layout */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 shrink-0"
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
                <Button onClick={handleAddCandidateUrl} disabled={!newCandidateUrl.trim()} className="px-3 shrink-0">
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">

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
        initialName={(() => {
          // Calculate default name based on current folder context
          const targetFolderId = currentFolderId || activeProject?.folderId || null;
          const projectsInSameFolder = projects.filter(p => p.folderId === targetFolderId);
          const defaultNameProjects = projectsInSameFolder.filter(p => /^Project #\d+$/.test(p.name));
          const existingNumbers = defaultNameProjects.map(p => {
            const match = p.name.match(/^Project #(\d+)$/);
            return match ? parseInt(match[1]) : 0;
          });
          const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
          return `Project #${nextNumber}`;
        })()}
        confirmText="Create"
        onConfirm={(name) => {
          // Create project in current folder context
          // Priority: 1) current selected folder, 2) active project's folder, 3) root
          const targetFolderId = currentFolderId || activeProject?.folderId || null;
          addProject(name, targetFolderId);
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

      {/* Folder Dialogs */}
      <ProjectNameDialog
        open={showAddFolderDialog}
        onOpenChange={setShowAddFolderDialog}
        title="Create New Folder"
        description="Enter a name for your new folder."
        confirmText="Create"
        onConfirm={(name) => {
          addFolder(name, parentFolderIdForNewFolder);
          setShowAddFolderDialog(false);
          setParentFolderIdForNewFolder(null);
        }}
      />

      <ProjectNameDialog
        open={showRenameFolderDialog}
        onOpenChange={setShowRenameFolderDialog}
        title="Rename Folder"
        description={`Enter the new name for folder "${folders.find(f => f.id === selectedFolderId)?.name}"`}
        initialName={folders.find(f => f.id === selectedFolderId)?.name}
        confirmText="Rename"
        onConfirm={(name) => {
          if (selectedFolderId) {
            renameFolder(selectedFolderId, name);
          }
          setShowRenameFolderDialog(false);
          setSelectedFolderId(null);
        }}
      />

      <ConfirmDeleteProjectDialog
        open={showDeleteFolderDialog}
        onOpenChange={setShowDeleteFolderDialog}
        projectName={folders.find(f => f.id === selectedFolderId)?.name || 'Selected Folder'}
        onConfirm={async () => {
          if (selectedFolderId) {
            deleteFolder(selectedFolderId);
          }
          setShowDeleteFolderDialog(false);
          setSelectedFolderId(null);
        }}
      />

      {/* Confirm Complete Dialog */}
      <ConfirmCompleteDialog
        open={showConfirmComplete}
        onOpenChange={setShowConfirmComplete}
        itemWord={items.find(i => i.id === itemToComplete)?.word || 'Selected Item'}
        onConfirm={handleCompleteReview}
      />

      {/* Confirm Bulk Complete Dialog */}
      <Dialog open={showConfirmBulkComplete} onOpenChange={setShowConfirmBulkComplete}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              일괄 확인 완료
            </DialogTitle>
            <DialogDescription className="text-left pt-2">
              확인 완료 처리하면 모든 리뷰 결과가 화면에서 사라집니다. 계속하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmBulkComplete(false)}>
              취소
            </Button>
            <Button onClick={executeBulkComplete} className="bg-green-600 hover:bg-green-700">
              확인 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

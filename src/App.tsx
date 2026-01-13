import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Trash2,
  Rows,
  Columns,
  LogOut,
  User,
  CreditCard,
  Users,
  Grid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";
import { Readme } from './components/Readme';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { Badge } from './components/ui/badge';
import { BulkGenerator, BulkItem } from './components/BulkGenerator';
import { LandingWizard } from './components/LandingWizard';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Label } from './components/ui/label';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './components/ui/dropdown-menu';
import { toast, Toaster } from "sonner";
import { PricingDialog, PaymentDialog, LoginDialog } from './components/subscription/SubscriptionModals';
import { supabase } from './lib/supabase';
import { loadProjectsFromDB, saveProjectToDB, deleteProjectFromDB, syncProjectsToDB, loadFoldersFromDB, syncFoldersToDB, deleteFolderFromDB } from './lib/database';
import { getMyReviewSessions } from './lib/reviewDatabase';

export interface Folder {
  id: string;
  name: string;
  parentId?: string | null; // null for root folders, string for nested folders
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  items: BulkItem[];
  folderId?: string | null; // null for root-level projects
}

// Helper function to generate random IDs
const getRandomId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Helper function to create an empty BulkItem
const createEmptyBulkItem = (number: number = 1): any => {
  return {
    id: getRandomId(),
    number: number,
    word: '',
    description: '',
    keywords: '',
    note: '',
    status: 'pending' as const,
    history: [],
    createdAt: Date.now(),
    isolated: true, // Default to manual mode (no AI context)
    isolatedBackground: false,
    usedImageUrls: [],
    currentPage: 1
  };
};

export default function App() {
  const [viewMode, setViewMode] = useState<'bulk' | 'landing'>(() => {
    // Restore viewMode from localStorage on initial load
    const saved = localStorage.getItem('geminiViewMode');
    return (saved as 'bulk' | 'landing') || 'landing';
  });
  const [currentDialog, setCurrentDialog] = useState<string | null>(null);

  // Project State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // Folder State
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('geminiExpandedFolders');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null); // For adding projects inside folders

  // Subscription State
  const [user, setUser] = useState<{id: string, name: string, email: string, plan: 'free' | 'pro', avatar_url?: string} | null>(null);
  const [credits, setCredits] = useState(50); // Free credits
  const [showPricing, setShowPricing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showLogin, setShowLogin] = useState(false);


  // Clear localStorage on initial load if not logged in (will load from DB if logged in)
  useEffect(() => {
    // Don't load from localStorage on initial load
    // Projects will be loaded from DB after auth check if user is logged in
  }, []);

  // Save projects to DB when logged in (don't use localStorage when logged out)
  useEffect(() => {
    // Skip saving during initial load to prevent overwriting DB with empty array
    if (!isInitialLoadComplete) {
      console.log('[App] Skipping save - initial load not complete');
      return;
    }

    // Only save if user is logged in
    if (user && projects.length > 0) {
      console.log('[App] Saving projects to DB:', projects.length, 'projects');
      // Save to localStorage for backup
      localStorage.setItem('geminiProjects', JSON.stringify(projects));
      // Save to DB
      syncProjectsToDB(projects, user.id)
        .then(() => console.log('[App] Successfully synced projects to DB'))
        .catch(err => console.error('[App] Failed to sync projects to DB:', err));
    } else if (!user) {
      console.log('[App] User logged out, clearing localStorage');
      // Clear localStorage when logged out
      localStorage.removeItem('geminiProjects');
      localStorage.removeItem('geminiActiveProjectId');
      localStorage.removeItem('geminiFolders');
      localStorage.removeItem('geminiExpandedFolders');
    }
  }, [projects, user, isInitialLoadComplete]);

  // Save folders to localStorage and DB
  useEffect(() => {
    if (!isInitialLoadComplete) {
      return;
    }

    if (user) {
      // Always save folders to localStorage, even if empty (to clear old data)
      localStorage.setItem('geminiFolders', JSON.stringify(folders));
      console.log('[App] Saved folders to localStorage:', folders.length);
      // Save to DB
      syncFoldersToDB(folders, user.id)
        .then(() => console.log('[App] Successfully synced folders to DB'))
        .catch(err => console.error('[App] Failed to sync folders to DB:', err));
    } else if (!user) {
      localStorage.removeItem('geminiFolders');
    }
  }, [folders, user, isInitialLoadComplete]);

  // Load folders from localStorage on mount
  useEffect(() => {
    const savedFolders = localStorage.getItem('geminiFolders');
    if (savedFolders) {
      try {
        const parsed = JSON.parse(savedFolders);
        setFolders(parsed);
        console.log('[App] Loaded folders from localStorage:', parsed.length);
      } catch (error) {
        console.error('[App] Failed to parse folders from localStorage:', error);
      }
    }
  }, []);

  // Save expanded folders to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('geminiExpandedFolders', JSON.stringify(Array.from(expandedFolders)));
    } else {
      localStorage.removeItem('geminiExpandedFolders');
    }
  }, [expandedFolders, user]);

  // Save active project ID to localStorage (only when logged in)
  useEffect(() => {
    if (user && activeProjectId) {
      localStorage.setItem('geminiActiveProjectId', activeProjectId);
    } else if (!user) {
      localStorage.removeItem('geminiActiveProjectId');
    }
  }, [activeProjectId, user]);

  // Save viewMode to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('geminiViewMode', viewMode);
    } else {
      localStorage.removeItem('geminiViewMode');
    }
  }, [viewMode, user]);

  // Supabase auth state listener
  useEffect(() => {
    let hasLoadedData = false;

    const loadUserData = async (session: any) => {
      if (hasLoadedData) {
        console.log('[App] Data already loaded, skipping');
        return;
      }

      console.log('[App] Loading user data...');
      hasLoadedData = true;

      try {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          plan: 'pro',
          avatar_url: session.user.user_metadata?.picture
        });

        // Load from localStorage first (instant)
        const localProjects = localStorage.getItem('geminiProjects');
        const localFolders = localStorage.getItem('geminiFolders');

        if (localProjects) {
          const parsed = JSON.parse(localProjects);
          if (parsed.length > 0) {
            console.log('[App] Loading from localStorage:', parsed.length, 'projects');
            // Ensure all projects have items array
            const validatedProjects = parsed.map((p: Project) => ({
              ...p,
              items: Array.isArray(p.items) ? p.items : []
            }));
            setProjects(validatedProjects);
            setActiveProjectId(validatedProjects[0].id);
            const savedViewMode = localStorage.getItem('geminiViewMode');
            if (savedViewMode === 'bulk') {
              setViewMode('bulk');
            }
          }
        }

        if (localFolders) {
          const parsed = JSON.parse(localFolders);
          if (parsed.length > 0) {
            console.log('[App] Loading from localStorage:', parsed.length, 'folders');
            setFolders(parsed);
          }
        }

        // Then try to load from DB in background (with short timeout)
        console.log('[App] Loading from DB in background...');
        Promise.race([
          loadProjectsFromDB(),
          new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2000))
        ]).then(dbProjects => {
          if (dbProjects.length > 0) {
            console.log('[App] Loaded from DB:', dbProjects.length, 'projects');
            // Ensure all projects have items array
            const validatedProjects = dbProjects.map((p: Project) => ({
              ...p,
              items: Array.isArray(p.items) ? p.items : []
            }));
            setProjects(validatedProjects);
            setActiveProjectId(validatedProjects[0].id);
          } else if (localProjects) {
            // Sync localStorage to DB
            const parsed = JSON.parse(localProjects);
            if (parsed.length > 0) {
              syncProjectsToDB(parsed, session.user.id).catch(err =>
                console.error('[App] Failed to sync projects:', err)
              );
            }
          }
        }).catch(err => console.error('[App] Error loading projects from DB:', err));

        Promise.race([
          loadFoldersFromDB(),
          new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2000))
        ]).then(dbFolders => {
          if (dbFolders.length > 0) {
            console.log('[App] Loaded from DB:', dbFolders.length, 'folders');
            setFolders(dbFolders);
          } else if (localFolders) {
            // Sync localStorage to DB
            const parsed = JSON.parse(localFolders);
            if (parsed.length > 0) {
              syncFoldersToDB(parsed, session.user.id).catch(err =>
                console.error('[App] Failed to sync folders:', err)
              );
            }
          }
        }).catch(err => console.error('[App] Error loading folders from DB:', err));
      } catch (error) {
        console.error('[App] Error loading user data:', error);
        toast.error('Failed to load data from cloud. Using local data.');
      } finally {
        // Always complete initial load, even if there was an error
        setIsInitialLoadComplete(true);
        setShowLogin(false);
      }
    };

    // Listen for auth changes (this handles both initial session and new logins)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[App] onAuthStateChange event:', _event);

      if (session?.user) {
        console.log('[App] User authenticated');
        await loadUserData(session);
      } else {
        // User logged out
        console.log('[App] User signed out');
        setUser(null);
        setProjects([]);
        setActiveProjectId(null);
        setFolders([]);
        setExpandedFolders(new Set());
        setCurrentFolderId(null);
        setViewMode('landing');
        hasLoadedData = false;
        setIsInitialLoadComplete(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Empty dependency array - only run once on mount

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeItems = activeProject?.items || [];

  // Ensure activeItems is always an array
  if (!Array.isArray(activeItems)) {
    console.error('[App] activeItems is not an array:', activeItems);
  }

  const updateActiveProjectItems = (newItems: BulkItem[] | ((prev: BulkItem[]) => BulkItem[])) => {
    if (!activeProjectId) return;
    setProjects(prevProjects =>
      prevProjects.map(p => {
        if (p.id === activeProjectId) {
          const updatedItems = typeof newItems === 'function' ? newItems(p.items) : newItems;
          return { ...p, items: updatedItems };
        }
        return p;
      })
    );
  };

  const handleConsumeCredits = (amount: number) => {
      setCredits(prev => Math.max(0, prev - amount));
  };

  const handlePaymentSuccess = () => {
      setShowPayment(false);
      // Determine if we need to login or just upgrade
      if (!user) {
          // If guest paying, we assume they become Pro user
          setUser({ id: 'demo-id', name: "Pro User", email: "user@example.com", plan: 'pro' });
          toast.success("Welcome to Pro!");
      } else {
          // Upgrade existing user
          setUser({ ...user, plan: 'pro' });
          toast.success("Upgraded to Pro!");
      }
  };

  const handleDeleteItems = (ids: Set<string>) => {
    const currentItems = activeItems;
    const itemsToDelete = currentItems.filter(item => ids.has(item.id));
    const remainingItems = currentItems.filter(item => !ids.has(item.id));
    const updatedItems = remainingItems.map((item, index) => ({ ...item, number: index + 1 }));
    updateActiveProjectItems(updatedItems);
    toast.success(`Deleted ${itemsToDelete.length} items from active project`);
  };

  const handleBulkGenerate = (newItems: Array<{word: string, description: string, keywords?: string, imageUrl?: string, imageSource?: string, imageSourceUrl?: string, photographer?: string, photographerUrl?: string, mediaType?: 'image' | 'video', generatedImages?: Array<{ url: string; source: string; sourceUrl: string }>, selectedImageIndex?: number, isolated?: boolean, isolatedBackground?: boolean}>, settings: { sources: string[], count: string, mediaType: 'image' | 'video', baseKeywords?: string }) => {
    setViewMode('bulk');

    // If logged in and projects exist, add items to existing project instead of creating new one
    if (user && projects.length > 0) {
      const targetProject = activeProject || projects[0];
      const existingItemCount = targetProject.items.length;

      const generatedItems: BulkItem[] = newItems.map((item, idx) => ({
        id: getRandomId(),
        number: existingItemCount + idx + 1,
        word: item.word,
        description: item.description,
        note: '',
        status: item.imageUrl ? 'completed' : 'pending',
        history: item.imageUrl ? [{ url: item.imageUrl, mediaType: item.mediaType || settings.mediaType }] : [],
        createdAt: Date.now(),
        imageUrl: item.imageUrl || '',
        imageSource: item.imageSource || 'AI Generated',
        imageSourceUrl: item.imageSourceUrl || '',
        artistName: item.photographer || '',
        artistUrl: item.photographerUrl || '',
        keywords: item.keywords || settings.baseKeywords || '',
        mediaType: item.mediaType || settings.mediaType,
        generatedImages: item.generatedImages,
        selectedImageIndex: item.selectedImageIndex,
        isolated: item.isolated,
        isolatedBackground: item.isolatedBackground
      }));

      setProjects(prev => prev.map(p =>
        p.id === targetProject.id
          ? { ...p, items: [...p.items, ...generatedItems] }
          : p
      ));
      setActiveProjectId(targetProject.id);
      toast.success(`Added ${generatedItems.length} items to "${targetProject.name}"`);
      return;
    }

    // Create a new project when not logged in or no projects exist
    // Use root level (folderId = null) for landing-created projects
    const targetFolderId = currentFolderId || null;
    const projectsInSameFolder = projects.filter(p => p.folderId === targetFolderId);
    const defaultNameProjects = projectsInSameFolder.filter(p => /^Project #\d+$/.test(p.name));
    const existingNumbers = defaultNameProjects.map(p => {
      const match = p.name.match(/^Project #(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    });
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    const projectName = `Project #${nextNumber}`;

    const newProject: Project = {
        id: getRandomId(),
        name: projectName,
        items: [],
        folderId: targetFolderId,
    };

    const generatedItems: BulkItem[] = newItems.map((item, idx) => ({
        id: getRandomId(),
        number: idx + 1,
        word: item.word,
        description: item.description,
        note: '',
        status: item.imageUrl ? 'completed' : 'pending',
        history: item.imageUrl ? [{ url: item.imageUrl, mediaType: item.mediaType || settings.mediaType }] : [],
        createdAt: Date.now(),
        imageUrl: item.imageUrl || '',
        imageSource: item.imageSource || 'AI Generated',
        imageSourceUrl: item.imageSourceUrl || '',
        artistName: item.photographer || '',
        artistUrl: item.photographerUrl || '',
        keywords: item.keywords || settings.baseKeywords || '',
        mediaType: item.mediaType || settings.mediaType,
        generatedImages: item.generatedImages,
        selectedImageIndex: item.selectedImageIndex,
        isolated: item.isolated,
        isolatedBackground: item.isolatedBackground
    }));

    newProject.items = generatedItems;
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    toast.success(`Project "${projectName}" created.`);
};

  // Project Management Functions
  const addProject = (name: string, folderId?: string | null) => {
    const targetFolderId = folderId || currentFolderId || null;

    // Find the next available number for projects in the same folder
    const projectsInSameFolder = projects.filter(p => p.folderId === targetFolderId);
    const defaultNameProjects = projectsInSameFolder.filter(p => /^Project #\d+$/.test(p.name));
    const existingNumbers = defaultNameProjects.map(p => {
      const match = p.name.match(/^Project #(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    });
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

    const newProject: Project = {
      id: getRandomId(),
      name: name || `Project #${nextNumber}`,
      items: [createEmptyBulkItem(1)], // Add first empty item
      folderId: targetFolderId,
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setViewMode('bulk'); // Switch to bulk mode when a new project is added

    const folderName = folderId || currentFolderId
      ? folders.find(f => f.id === (folderId || currentFolderId))?.name
      : null;
    const location = folderName ? ` in folder "${folderName}"` : '';
    toast.success(`Project "${newProject.name}" created${location}.`);

    // Reset current folder ID
    setCurrentFolderId(null);
  };

  const renameProject = (id: string, newName: string) => {
    setProjects(prev =>
      prev.map(p => (p.id === id ? { ...p, name: newName } : p))
    );
    toast.success(`Project renamed to "${newName}".`);
  };

  const duplicateProject = (id: string, newName: string) => {
    const projectToDuplicate = projects.find(p => p.id === id);
    if (projectToDuplicate) {
      const duplicatedProject: Project = {
        id: getRandomId(),
        name: newName,
        items: projectToDuplicate.items.map(item => ({ ...item, id: getRandomId(), createdAt: Date.now() })), // Deep copy items with new IDs
        folderId: projectToDuplicate.folderId, // Preserve folder location
      };
      setProjects(prev => [...prev, duplicatedProject]);
      setActiveProjectId(duplicatedProject.id);
      setViewMode('bulk');
      toast.success(`Project "${projectToDuplicate.name}" duplicated as "${newName}".`);
    } else {
      toast.error('Project not found for duplication.');
    }
  };

  const deleteProject = async (id: string) => {
    const projectToDelete = projects.find(p => p.id === id);
    if (!projectToDelete) return;

    try {
      // Delete from database if user is logged in
      if (user) {
        const success = await deleteProjectFromDB(id, user.id);
        if (!success) {
          toast.error("Failed to delete project from database");
          return;
        }
      }

      setProjects(prev => {
        const deletedProject = prev.find(p => p.id === id);
        const updatedProjects = prev.filter(p => p.id !== id);

        if (updatedProjects.length === 0) {
          setActiveProjectId(null);
          setViewMode('landing');
          return [];
        }

        // Renumber default-named projects in the same folder
        if (deletedProject) {
          const sameFolderProjects = updatedProjects
            .filter(p => p.folderId === deletedProject.folderId && /^Project #\d+$/.test(p.name))
            .sort((a, b) => {
              const numA = parseInt(a.name.match(/^Project #(\d+)$/)?.[1] || '0');
              const numB = parseInt(b.name.match(/^Project #(\d+)$/)?.[1] || '0');
              return numA - numB;
            });

          // Reassign numbers sequentially
          sameFolderProjects.forEach((project, index) => {
            project.name = `Project #${index + 1}`;
          });
        }

        if (activeProjectId === id) {
          setActiveProjectId(updatedProjects[0].id);
        }

        return updatedProjects;
      });
      toast.success(`Project "${projectToDelete.name}" deleted.`);
    } catch (error: any) {
      console.error('Delete project error:', error);
      toast.error(error.message || "Failed to delete project");
    }
  };

  const switchActiveProject = (id: string | null) => {
    if (id) {
      const project = projects.find(p => p.id === id);
      if (!project) {
        console.error('[App] Project not found:', id);
        toast.error('프로젝트를 찾을 수 없습니다.');
        return;
      }
      toast.info(`Switched to project "${project.name}".`);
    }
    setActiveProjectId(id);
  };

  // Folder Management Functions
  const addFolder = (name: string, parentId?: string | null) => {
    const newFolder: Folder = {
      id: getRandomId(),
      name: name,
      parentId: parentId || null,
      createdAt: Date.now()
    };
    setFolders(prev => [...prev, newFolder]);
    // Auto-expand the new folder
    setExpandedFolders(prev => new Set([...prev, newFolder.id]));
    toast.success(`Folder "${name}" created.`);
  };

  const renameFolder = (id: string, newName: string) => {
    setFolders(prev =>
      prev.map(f => (f.id === id ? { ...f, name: newName } : f))
    );
    toast.success(`Folder renamed to "${newName}".`);
  };

  const deleteFolder = async (id: string) => {
    const folderToDelete = folders.find(f => f.id === id);
    if (!folderToDelete) return;

    // Check if folder has child folders
    const hasChildFolders = folders.some(f => f.parentId === id);
    if (hasChildFolders) {
      toast.error("Cannot delete folder with subfolders. Delete subfolders first.");
      return;
    }

    // Delete all projects inside folder
    const projectsInFolder = projects.filter(p => p.folderId === id);
    if (projectsInFolder.length > 0) {
      // Delete projects from DB if user is logged in
      if (user) {
        await Promise.all(
          projectsInFolder.map(p => deleteProjectFromDB(p.id, user.id))
        );
      }

      // Remove projects from state
      setProjects(prev => prev.filter(p => p.folderId !== id));

      // If active project was in this folder, clear selection
      if (activeProjectId && projectsInFolder.some(p => p.id === activeProjectId)) {
        setActiveProjectId(null);
      }
    }

    // Delete folder from DB if user is logged in
    if (user) {
      await deleteFolderFromDB(id, user.id);
    }

    setFolders(prev => prev.filter(f => f.id !== id));
    toast.success(`Folder "${folderToDelete.name}" and ${projectsInFolder.length} project(s) deleted.`);
  };

  const moveProjectToFolder = (projectId: string, folderId: string | null) => {
    setProjects(prev =>
      prev.map(p => (p.id === projectId ? { ...p, folderId: folderId } : p))
    );
    const project = projects.find(p => p.id === projectId);
    const folder = folderId ? folders.find(f => f.id === folderId) : null;
    const locationText = folder ? `"${folder.name}"` : "root";
    toast.success(`Moved "${project?.name}" to ${locationText}`);
  };

  const toggleFolderExpanded = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Apply folder review results to projects
  useEffect(() => {
    if (!user || !isInitialLoadComplete) return;

    const applyFolderReviewsToProjects = async () => {
      try {
        const result = await getMyReviewSessions();
        if (!result.success || !result.sessions) return;

        // Find completed folder reviews
        const completedFolderReviews = result.sessions.filter(
          (s: any) => s.status === 'completed' && s.review_type === 'folder' && s.folder_id
        );

        if (completedFolderReviews.length === 0) return;

        console.log('[App] Found completed folder reviews:', completedFolderReviews.length);

        // Group review items by projectId
        const reviewItemsByProject = new Map<string, Map<string, any>>();

        completedFolderReviews.forEach((session: any) => {
          session.items?.forEach((reviewItem: any) => {
            if (reviewItem.projectId && reviewItem.id) {
              if (!reviewItemsByProject.has(reviewItem.projectId)) {
                reviewItemsByProject.set(reviewItem.projectId, new Map());
              }
              // Store by item.id for quick lookup
              reviewItemsByProject.get(reviewItem.projectId)!.set(reviewItem.id, {
                reviewStatus: reviewItem.reviewStatus,
                reviewComment: reviewItem.reviewComment
              });
            }
          });
        });

        if (reviewItemsByProject.size === 0) return;

        console.log('[App] Applying review results to', reviewItemsByProject.size, 'projects');

        // Update projects with review results (only if changes are needed)
        setProjects(prev => {
          let hasChanges = false;
          const updated = prev.map(project => {
            const reviewItems = reviewItemsByProject.get(project.id);
            if (!reviewItems || reviewItems.size === 0) return project;

            // Apply review results to matching items
            const updatedItems = project.items.map(item => {
              const reviewData = reviewItems.get(item.id);
              // Only update if the review status is different
              if (reviewData && item.reviewStatus !== reviewData.reviewStatus) {
                hasChanges = true;
                return {
                  ...item,
                  reviewStatus: reviewData.reviewStatus,
                  reviewComment: reviewData.reviewComment
                };
              }
              return item;
            });

            if (hasChanges) {
              return {
                ...project,
                items: updatedItems
              };
            }
            return project;
          });

          if (hasChanges) {
            console.log('[App] Review results applied successfully');
            return updated;
          }
          return prev; // Return previous state if no changes
        });
      } catch (error) {
        console.error('[App] Error applying folder reviews:', error);
      }
    };

    // Run immediately and then every 10 seconds
    applyFolderReviewsToProjects();
    const intervalId = setInterval(applyFolderReviewsToProjects, 10000);

    return () => clearInterval(intervalId);
  }, [user, isInitialLoadComplete]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
        {/* Workspace */}
        <div className={`flex-1 overflow-auto ${viewMode === 'landing' ? 'p-0' : 'p-0'}`}>
           <>
             {viewMode === 'landing' ? (
               <div className="relative h-full">
                 {/* Top bar for landing page */}
                 <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-8 z-10">
                   <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setViewMode('landing')}>
                     <span className="font-bold text-2xl tracking-tight text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>Searchedia</span>
                   </div>
                   <div>
                     {!user ? (
                       <Button variant="ghost" size="sm" onClick={() => setShowLogin(true)}>Login</Button>
                     ) : (
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <button className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors cursor-pointer">
                             <Avatar className="h-9 w-9">
                               <AvatarImage src={user.avatar_url} alt={user.name} />
                               <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-medium">
                                 {user.name?.[0]?.toUpperCase()}
                               </AvatarFallback>
                             </Avatar>
                             <div className="flex-1 text-left min-w-0 hidden md:block">
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
                             onClick={() => setCurrentDialog('logout')}
                           >
                             <LogOut className="mr-2 h-4 w-4" />
                             Log out
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                     )}
                   </div>
                 </div>
                 <LandingWizard onComplete={(data) => handleBulkGenerate(data.items, data)} />
               </div>
             ) : (
               <BulkGenerator
                 items={activeItems} // Use activeItems
                 setItems={updateActiveProjectItems} // Use updateActiveProjectItems
                 onDelete={handleDeleteItems}
                 onGenerate={handleBulkGenerate}
                 onCancel={() => setViewMode('landing')} // Set viewMode to landing on cancel
                 userPlan={user?.plan || 'free'}
                 credits={credits}
                 onUpgrade={() => setShowPricing(true)}
                 onConsumeCredits={handleConsumeCredits}
                 projects={projects}
                 activeProjectId={activeProjectId}
                 addProject={addProject}
                 renameProject={renameProject}
                 duplicateProject={duplicateProject}
                 deleteProject={deleteProject}
                 switchActiveProject={switchActiveProject}
                 folders={folders}
                 expandedFolders={expandedFolders}
                 addFolder={addFolder}
                 renameFolder={renameFolder}
                 deleteFolder={deleteFolder}
                 moveProjectToFolder={moveProjectToFolder}
                 toggleFolderExpanded={toggleFolderExpanded}
                 currentFolderId={currentFolderId}
                 setCurrentFolderId={setCurrentFolderId}
                 user={user}
                 onShowLogin={() => setShowLogin(true)}
                 onLogout={() => setCurrentDialog('logout')}
               />
             )}
           </>
        </div>
      </main>

      <Dialog open={!!currentDialog} onOpenChange={(open) => !open && setCurrentDialog(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {currentDialog === 'profile' && 'Profile Settings'}
              {currentDialog === 'billing' && 'Billing & Invoices'}
              {currentDialog === 'team' && 'Team Members'}
              {currentDialog === 'logout' && 'Confirm Logout'}
            </DialogTitle>
            <DialogDescription>
              {currentDialog === 'profile' && 'Manage your account settings and preferences.'}
              {currentDialog === 'billing' && 'View your invoices and manage your subscription.'}
              {currentDialog === 'team' && 'Invite team members and manage permissions.'}
              {currentDialog === 'logout' && 'Are you sure you want to log out of your account?'}
            </DialogDescription>
          </DialogHeader>
          
          {currentDialog === 'profile' && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" defaultValue="John Doe" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" defaultValue="john@example.com" className="col-span-3" />
              </div>
            </div>
          )}

          <DialogFooter>
            {currentDialog === 'logout' ? (
              <>
                <Button variant="outline" onClick={() => setCurrentDialog(null)}>Cancel</Button>
                <Button variant="destructive" onClick={async () => {
                  try {
                    console.log('Starting logout process...');

                    // Sign out from Supabase with timeout
                    const signOutPromise = supabase.auth.signOut();
                    const timeoutPromise = new Promise((_, reject) =>
                      setTimeout(() => reject(new Error('Logout timeout')), 5000)
                    );

                    try {
                      await Promise.race([signOutPromise, timeoutPromise]);
                      console.log('Supabase signOut successful');
                    } catch (error) {
                      console.warn('Supabase signOut failed or timed out, forcing local logout:', error);
                    }

                    // Always clear auth data from localStorage
                    localStorage.clear();

                    // Clear projects and reset state
                    setProjects([]);
                    setActiveProjectId(null);
                    setUser(null);
                    setCurrentDialog(null);
                    setViewMode('landing');

                    console.log('Logout completed successfully');
                    toast.success("Logged out successfully");
                  } catch (error) {
                    console.error('Logout error:', error);

                    // Force logout even on error
                    localStorage.clear();
                    setProjects([]);
                    setActiveProjectId(null);
                    setUser(null);
                    setCurrentDialog(null);
                    setViewMode('landing');

                    toast.success("Logged out successfully");
                  }
                }}>Log out</Button>
              </>
            ) : (
              <Button type="submit" onClick={() => setCurrentDialog(null)}>Save changes</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing and Payment dialogs hidden */}
      {/* <PricingDialog open={showPricing} onOpenChange={setShowPricing} onSelectPro={() => { setShowPricing(false); setShowPayment(true); }} />
      <PaymentDialog open={showPayment} onOpenChange={setShowPayment} onSuccess={handlePaymentSuccess} /> */}
      <LoginDialog open={showLogin} onOpenChange={setShowLogin} onLogin={() => {
        setShowLogin(false);
      }} />

      <Toaster />
    </div>
  );
}
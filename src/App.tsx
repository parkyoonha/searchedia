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
import { loadProjectsFromDB, saveProjectToDB, deleteProjectFromDB, syncProjectsToDB } from './lib/database';

export interface Project {
  id: string;
  name: string;
  items: BulkItem[];
}

// Helper function to generate random IDs
const getRandomId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export default function App() {
  const [viewMode, setViewMode] = useState<'bulk' | 'landing'>('landing');
  const [currentDialog, setCurrentDialog] = useState<string | null>(null);

  // Project State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  // Subscription State
  const [user, setUser] = useState<{id: string, name: string, email: string, plan: 'free' | 'pro'} | null>(null);
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
    // Only save if user is logged in
    if (user && projects.length > 0) {
      // Save to localStorage for backup
      localStorage.setItem('geminiProjects', JSON.stringify(projects));
      // Save to DB
      syncProjectsToDB(projects, user.id).catch(err =>
        console.error('Failed to sync projects to DB:', err)
      );
    } else if (!user) {
      // Clear localStorage when logged out
      localStorage.removeItem('geminiProjects');
      localStorage.removeItem('geminiActiveProjectId');
    }
  }, [projects, user]);

  // Save active project ID to localStorage (only when logged in)
  useEffect(() => {
    if (user && activeProjectId) {
      localStorage.setItem('geminiActiveProjectId', activeProjectId);
    } else if (!user) {
      localStorage.removeItem('geminiActiveProjectId');
    }
  }, [activeProjectId, user]);

  // Supabase auth state listener
  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          plan: 'pro' // Default to pro for logged in users
        });

        // Load projects from DB when logged in
        const dbProjects = await loadProjectsFromDB();
        if (dbProjects.length > 0) {
          setProjects(dbProjects);
          setActiveProjectId(dbProjects[0].id);
          toast.success(`Loaded ${dbProjects.length} projects from cloud`);
        } else {
          // If no DB projects, sync localStorage projects to DB
          const localProjects = localStorage.getItem('geminiProjects');
          if (localProjects) {
            const parsed = JSON.parse(localProjects);
            if (parsed.length > 0) {
              await syncProjectsToDB(parsed, session.user.id);
              toast.success('Synced local projects to cloud');
            }
          }
        }
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          plan: 'pro'
        });
        setShowLogin(false);

        // Load projects from DB
        const dbProjects = await loadProjectsFromDB();
        if (dbProjects.length > 0) {
          setProjects(dbProjects);
          setActiveProjectId(dbProjects[0].id);
        }
      } else {
        setUser(null);
        // On logout, keep localStorage projects
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeItems = activeProject ? activeProject.items : [];

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

  const handleLogin = (email: string) => {
      setUser({ id: 'demo-id', name: "Demo User", email, plan: 'pro' });
      setShowLogin(false);
      toast.success("Logged in successfully");
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

  const handleBulkGenerate = (newItems: Array<{word: string, description: string, imageUrl?: string, imageSource?: string, imageSourceUrl?: string, mediaType?: 'image' | 'video', generatedImages?: Array<{ url: string; source: string; sourceUrl: string }>, selectedImageIndex?: number}>, settings: { sources: string[], count: string, mediaType: 'image' | 'video', baseKeywords?: string }) => {
    setViewMode('bulk');

    // Always create a new project when generating from landing
    const projectNumber = projects.length + 1;
    const projectName = `Project ${projectNumber}`;

    const newProject: Project = {
        id: getRandomId(),
        name: projectName,
        items: [],
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
        keywords: settings.baseKeywords || '',
        mediaType: item.mediaType || settings.mediaType,
        generatedImages: item.generatedImages,
        selectedImageIndex: item.selectedImageIndex
    }));

    newProject.items = generatedItems;
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    toast.success(`Project "${projectName}" created.`);
};

  // Project Management Functions
  const addProject = (name: string) => {
    const newProject: Project = {
      id: getRandomId(),
      name: name,
      items: [],
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setViewMode('bulk'); // Switch to bulk mode when a new project is added
    toast.success(`Project "${name}" created.`);
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
        const updatedProjects = prev.filter(p => p.id !== id);
        if (updatedProjects.length === 0) {
          setActiveProjectId(null);
          setViewMode('landing');
          return [];
        }

        if (activeProjectId === id) {
          setActiveProjectId(updatedProjects[0].id);
        }

        // Renumber remaining projects
        return updatedProjects.map((p, index) => ({
          ...p,
          name: `Project ${index + 1}`
        }));
      });
      toast.success(`Project "${projectToDelete.name}" deleted.`);
    } catch (error: any) {
      console.error('Delete project error:', error);
      toast.error(error.message || "Failed to delete project");
    }
  };

  const switchActiveProject = (id: string) => {
    setActiveProjectId(id);
    toast.info(`Switched to project "${projects.find(p => p.id === id)?.name}".`);
  };

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
                       <div className="flex items-center gap-2">
                         <span className="text-sm text-slate-600">{user.name}</span>
                         <Badge variant="secondary" className="text-xs">
                           {user.plan === 'pro' ? 'Pro' : 'Free'}
                         </Badge>
                       </div>
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
                 // initialBaseKeywords={baseKeywords} // No longer needed
                 projects={projects}
                 activeProjectId={activeProjectId}
                 addProject={addProject}
                 renameProject={renameProject}
                 duplicateProject={duplicateProject}
                 deleteProject={deleteProject}
                 switchActiveProject={switchActiveProject}
                 user={user}
                 onShowLogin={() => setShowLogin(true)}
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

          {/* Billing dialog hidden */}
          {/* {currentDialog === 'billing' && (
            <div className="py-4 space-y-4">
              <div className="rounded-lg border p-4">
                 <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Pro Plan</span>
                    <Badge>Active</Badge>
                 </div>
                 <p className="text-sm text-slate-500 mb-4">$29/month, billed monthly</p>
                 <Button variant="outline" size="sm" className="w-full">Manage Subscription</Button>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recent Invoices</h4>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded">
                    <span>Dec {i}, 2024</span>
                    <span className="font-mono">$29.00</span>
                  </div>
                ))}
              </div>
            </div>
          )} */}

          {/* Team dialog hidden */}
          {/* {currentDialog === 'team' && (
            <div className="py-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Team Members (3/5)</h4>
                <Button size="sm">Invite</Button>
              </div>
              <div className="space-y-3">
                {['John Doe (You)', 'Sarah Smith', 'Mike Johnson'].map((member, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                        {member.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm">{member}</span>
                    </div>
                    <span className="text-xs text-slate-500">{i === 0 ? 'Owner' : 'Member'}</span>
                  </div>
                ))}
              </div>
            </div>
          )} */}

          <DialogFooter>
            {currentDialog === 'logout' ? (
              <>
                <Button variant="outline" onClick={() => setCurrentDialog(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => {
                  // Clear auth data from localStorage
                  localStorage.removeItem('sb-uvrzqnatomfqapysejdf-auth-token');
                  localStorage.removeItem('geminiProjects');
                  localStorage.removeItem('geminiActiveProjectId');

                  // Clear projects and reset state
                  setProjects([]);
                  setActiveProjectId(null);
                  setUser(null);
                  setCurrentDialog(null);
                  setViewMode('landing');
                  toast.success("Logged out successfully");
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
      <LoginDialog open={showLogin} onOpenChange={setShowLogin} onLogin={handleLogin} />
      <Toaster />
    </div>
  );
}
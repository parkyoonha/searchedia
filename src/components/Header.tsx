import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Trash2,
  Rows,
  Columns,
  LogOut,
  User,
  CreditCard,
  Users,
  Grid,
  EllipsisVertical,
  Plus,
  Folder,
  FolderPlus,
  Copy,
  Edit
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Readme } from './Readme';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Label } from './ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './ui/dropdown-menu';
import { toast } from "sonner";
import { Project } from '../App';
import { ProjectNameDialog } from './project/ProjectNameDialog';
import { ConfirmDeleteProjectDialog } from './project/ConfirmDeleteProjectDialog';

interface HeaderProps {
  user: {id: string, name: string, email: string, plan: 'free' | 'pro'} | null;
  viewMode: 'bulk' | 'landing';
  setViewMode: React.Dispatch<React.SetStateAction<'bulk' | 'landing'>>;
  setShowPricing: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPayment: React.Dispatch<React.SetStateAction<boolean>>;
  setShowLogin: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentDialog: React.Dispatch<React.SetStateAction<string | null>>;
  credits: number;
  projects: Project[];
  activeProjectId: string | null;
  setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  addProject: (name: string) => void;
  renameProject: (id: string, newName: string) => void;
  duplicateProject: (id: string, newName: string) => void;
  deleteProject: (id: string) => void;
  switchActiveProject: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  viewMode,
  setViewMode,
  setShowPricing,
  setShowPayment,
  setShowLogin,
  setCurrentDialog,
  credits,
  projects,
  activeProjectId,
  setActiveProjectId,
  addProject,
  renameProject,
  duplicateProject,
  deleteProject,
  switchActiveProject,
}) => {
  const activeProject = projects.find(p => p.id === activeProjectId);

  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [showRenameProjectDialog, setShowRenameProjectDialog] = useState(false);
  const [showDuplicateProjectDialog, setShowDuplicateProjectDialog] = useState(false);
  const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false);

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
    // Create project in current folder context
    // Priority: 1) current selected folder, 2) active project's folder, 3) root
    const activeProject = projects.find(p => p.id === activeProjectId);
    const targetFolderId = currentFolderId || activeProject?.folderId || null;
    addProject(newProjectName, targetFolderId);
  };

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-8 shadow-sm z-10">
      <div className="flex items-center gap-8 text-slate-500 text-sm">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setViewMode('landing')}
        >
            <span className="font-bold text-2xl tracking-tight text-slate-900" style={{ fontFamily: "'Architects Daughter', cursive" }}>Searchedia</span>
        </div>

        {/* Project Tabs - Browser Style (Hidden in Bulk view) */}
        {viewMode === 'landing' && (
        <div className="flex items-center gap-1">
            {projects.map(project => (
              <div
                key={project.id}
                className={`flex items-center gap-1 h-8 px-2 border rounded transition-all ${
                  project.id === activeProjectId
                    ? 'bg-white border-indigo-200 shadow-sm'
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
                      setActiveProjectId(project.id);
                      setShowRenameProjectDialog(true);
                    }}>
                      <Edit className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setActiveProjectId(project.id);
                      setShowDuplicateProjectDialog(true);
                    }}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      setActiveProjectId(project.id);
                      setShowDeleteProjectDialog(true);
                    }} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  className="flex items-center text-xs font-normal px-1 hover:opacity-80 transition-opacity"
                  onClick={() => {
                    switchActiveProject(project.id);
                    setViewMode('bulk');
                  }}
                >
                  <span className={project.id === activeProjectId ? 'text-slate-900 font-medium' : 'text-slate-600'}>
                    {project.name}
                  </span>
                </button>
              </div>
            ))}

            {/* New Project Button - only show when there are projects */}
            {projects.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-slate-100"
                onClick={handleAddNewProject}
              >
                <Plus className="h-4 w-4 text-slate-500" />
              </Button>
            )}
        </div>
        )}
      </div>
      <div className="flex items-center gap-3">
         {/* Existing User/Auth related UI */}
         {!user ? (
             <>
                <Button variant="ghost" size="sm" className="h-11 md:h-auto" onClick={() => setShowLogin(true)}>Login</Button>
                {/* Plan button hidden */}
                {/* <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setShowPricing(true)}>
                    Plan
                </Button> */}
             </>
         ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-2">
                  <Avatar className="h-8 w-8 border border-slate-200">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Plan and Credits info hidden */}
                {/* <div className="px-2 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-900">{user.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}</span>
                    <Badge variant="secondary" className={`text-[10px] h-5 px-2 ${user.plan === 'pro' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                        {user.plan === 'pro' ? 'Active' : 'Free'}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{user.plan === 'pro' ? 'Monthly Credits' : 'Free Credits'}</span>
                      <span>{user.plan === 'pro' ? 'Unlimited' : `${credits} / 50`}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${user.plan === 'pro' ? 'bg-indigo-500 w-full' : 'bg-slate-400'}`} style={{ width: user.plan === 'pro' ? '100%' : `${(credits / 50) * 100}%` }} />
                    </div>
                    {user.plan === 'pro' && <p className="text-[10px] text-slate-400 text-right">Resets in 12 days</p>}
                  </div>
                </div>
                <DropdownMenuSeparator /> */}
                <DropdownMenuItem onClick={() => setCurrentDialog('profile')}>
                  <User className="mr-2 h-4 w-4" /> Profile Settings
                </DropdownMenuItem>
                {/* Billing and Team hidden */}
                {/* <DropdownMenuItem onClick={() => setCurrentDialog('billing')}>
                  <CreditCard className="mr-2 h-4 w-4" /> Billing & Invoices
                </DropdownMenuItem>
                {user.plan === 'pro' && (
                    <DropdownMenuItem onClick={() => setCurrentDialog('team')}>
                      <Users className="mr-2 h-4 w-4" /> Team Members
                    </DropdownMenuItem>
                )} */}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setCurrentDialog('logout')}>
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
         )}
      </div>

      {/* Project Dialogs */}
      <ProjectNameDialog
        open={showAddProjectDialog}
        onOpenChange={setShowAddProjectDialog}
        title="Create New Project"
        description="Enter a name for your new project."
        confirmText="Create"
        onConfirm={(name) => {
          // Create project in current folder context
          // Priority: 1) current selected folder, 2) active project's folder, 3) root
          const activeProject = projects.find(p => p.id === activeProjectId);
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
    </header>
  );
};
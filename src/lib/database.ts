import { Project, Folder } from '../App';
import { supabase } from './supabase';

/**
 * Load all projects for the current user from Supabase
 */
export async function loadProjectsFromDB(): Promise<Project[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('[DB] No active session for loading projects');
      return [];
    }

    console.log('[DB] Loading projects for user:', session.user.id);

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[DB] Error loading projects:', error);
      return [];
    }

    console.log('[DB] Loaded projects from DB:', data?.length || 0, 'projects');

    return data || [];
  } catch (error) {
    console.error('[DB] Error loading projects:', error);
    return [];
  }
}

/**
 * Save a project to Supabase
 */
export async function saveProjectToDB(project: Project, userId?: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = userId || session?.user?.id;

    if (!currentUserId) {
      console.error("[DB] No user ID available for saveProjectToDB");
      return false;
    }

    const projectData = {
      id: project.id,
      user_id: currentUserId,
      name: project.name,
      items: project.items,
      folder_id: project.folderId || null,
      updated_at: new Date().toISOString()
    };

    console.log('[DB] Attempting to save project:', project.id, 'with', project.items.length, 'items');

    const { data, error } = await supabase
      .from('projects')
      .upsert(projectData, {
        onConflict: 'id'
      })
      .select();

    if (error) {
      console.error(`[DB] Failed to save project ${project.id}:`, error);
      console.error('[DB] Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to save project ${project.id}: ${error.message}`);
    }

    console.log(`[DB] Project ${project.id} saved successfully with`, project.items.length, 'items');
    return true;
  } catch (error) {
    console.error('[DB] Error in saveProjectToDB:', error);
    throw error;
  }
}

/**
 * Delete a project from Supabase
 */
export async function deleteProjectFromDB(projectId: string, userId?: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = userId || session?.user?.id;

    if (!currentUserId) {
      console.error('No user ID available for delete operation');
      return false;
    }

    console.log('Deleting project:', { projectId, userId: currentUserId });

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', currentUserId);

    if (error) {
      console.error('Delete failed:', error);
      return false;
    }

    console.log('Project deleted successfully:', projectId);
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
}

/**
 * Sync all projects to Supabase
 */
export async function syncProjectsToDB(projects: Project[], userId?: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = userId || session?.user?.id;

    if (!currentUserId) {
      console.error('[DB] No user ID available for syncing projects');
      return false;
    }

    console.log(`[DB] Syncing ${projects.length} projects for user ${currentUserId}`);

    const promises = projects.map(project => saveProjectToDB(project, currentUserId));
    const results = await Promise.all(promises);

    const successCount = results.filter(r => r).length;
    console.log(`[DB] Successfully synced ${successCount}/${projects.length} projects`);
    return true;
  } catch (error) {
    console.error('[DB] Error syncing projects:', error);
    throw error;
  }
}

/**
 * Load all folders for the current user from Supabase
 */
export async function loadFoldersFromDB(): Promise<Folder[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('[DB] No active session for loading folders');
      return [];
    }

    console.log('[DB] Loading folders for user:', session.user.id);

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true});

    if (error) {
      console.error('[DB] Error loading folders:', error);
      return [];
    }

    console.log('[DB] Loaded folders from DB:', data?.length || 0, 'folders');

    // Map DB structure to Folder interface
    const folders: Folder[] = (data || []).map(f => ({
      id: f.id,
      name: f.name,
      parentId: f.parent_id,
      createdAt: f.created_at ? new Date(f.created_at).getTime() : Date.now()
    }));

    return folders;
  } catch (error) {
    console.error('[DB] Error loading folders:', error);
    return [];
  }
}

/**
 * Save a folder to Supabase
 */
export async function saveFolderToDB(folder: Folder, userId?: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = userId || session?.user?.id;

    if (!currentUserId) {
      console.error("[DB] No user ID available for saveFolderToDB");
      return false;
    }

    const folderData = {
      id: folder.id,
      user_id: currentUserId,
      name: folder.name,
      parent_id: folder.parentId || null,
      created_at: new Date(folder.createdAt).toISOString()
    };

    console.log('[DB] Attempting to save folder:', folder.id);

    const { data, error } = await supabase
      .from('folders')
      .upsert(folderData, {
        onConflict: 'id'
      })
      .select();

    if (error) {
      console.error(`[DB] Failed to save folder ${folder.id}:`, error);
      return false;
    }

    console.log(`[DB] Folder ${folder.id} saved successfully`);
    return true;
  } catch (error) {
    console.error('[DB] Error in saveFolderToDB:', error);
    return false;
  }
}

/**
 * Sync all folders to Supabase
 */
export async function syncFoldersToDB(folders: Folder[], userId?: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = userId || session?.user?.id;

    if (!currentUserId) {
      console.error('[DB] No user ID available for syncing folders');
      return false;
    }

    console.log(`[DB] Syncing ${folders.length} folders for user ${currentUserId}`);

    const promises = folders.map(folder => saveFolderToDB(folder, currentUserId));
    const results = await Promise.all(promises);

    const successCount = results.filter(r => r).length;
    console.log(`[DB] Successfully synced ${successCount}/${folders.length} folders`);
    return true;
  } catch (error) {
    console.error('[DB] Error syncing folders:', error);
    return false;
  }
}

/**
 * Delete a folder from Supabase
 */
export async function deleteFolderFromDB(folderId: string, userId?: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = userId || session?.user?.id;

    if (!currentUserId) {
      console.error('[DB] No user ID available for delete folder operation');
      return false;
    }

    console.log('[DB] Deleting folder:', folderId);

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', currentUserId);

    if (error) {
      console.error('[DB] Delete folder failed:', error);
      return false;
    }

    console.log('[DB] Folder deleted successfully:', folderId);
    return true;
  } catch (error) {
    console.error('[DB] Error deleting folder:', error);
    return false;
  }
}

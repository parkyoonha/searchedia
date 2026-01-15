import { Project, Folder } from '../App';
import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Load all projects for the current user from Supabase
 */
export async function loadProjectsFromDB(): Promise<Project[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      logger.log('[DB] No active session for loading projects');
      return [];
    }

    logger.log('[DB] Loading projects for user:', session.user.id);

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[DB] Error loading projects:', error);
      return [];
    }

    logger.log('[DB] Loaded projects from DB:', data?.length || 0, 'projects');

    // Map DB structure to Project interface (folder_id -> folderId)
    const projects: Project[] = (data || []).map(p => ({
      id: p.id,
      name: p.name,
      items: p.items || [],
      folderId: p.folder_id
    }));

    return projects;
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

    logger.log('[DB] Attempting to save project:', project.id, 'with', project.items.length, 'items');

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

    logger.log(`[DB] Project ${project.id} saved successfully with`, project.items.length, 'items');
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

    logger.log('Deleting project:', { projectId, userId: currentUserId });

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', currentUserId);

    if (error) {
      console.error('Delete failed:', error);
      return false;
    }

    logger.log('Project deleted successfully:', projectId);
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

    logger.log(`[DB] Syncing ${projects.length} projects for user ${currentUserId}`);

    // Get current projects from DB
    const { data: dbProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', currentUserId);

    // Delete projects that are no longer in local state
    if (dbProjects && dbProjects.length > 0) {
      const localProjectIds = new Set(projects.map(p => p.id));
      const projectsToDelete = dbProjects.filter(p => !localProjectIds.has(p.id));

      if (projectsToDelete.length > 0) {
        logger.log(`[DB] Deleting ${projectsToDelete.length} projects that are no longer in local state`);
        await Promise.all(
          projectsToDelete.map(p => deleteProjectFromDB(p.id, currentUserId))
        );
      }
    }

    // Upsert all current projects
    const promises = projects.map(project => saveProjectToDB(project, currentUserId));
    const results = await Promise.all(promises);

    const successCount = results.filter(r => r).length;
    logger.log(`[DB] Successfully synced ${successCount}/${projects.length} projects`);
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
      logger.log('[DB] No active session for loading folders');
      return [];
    }

    logger.log('[DB] Loading folders for user:', session.user.id);

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true});

    if (error) {
      console.error('[DB] Error loading folders:', error);
      return [];
    }

    logger.log('[DB] Loaded folders from DB:', data?.length || 0, 'folders');

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

    logger.log('[DB] Attempting to save folder:', folder.id);

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

    logger.log(`[DB] Folder ${folder.id} saved successfully`);
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

    logger.log(`[DB] Syncing ${folders.length} folders for user ${currentUserId}`);

    // Get current folders from DB
    const { data: dbFolders } = await supabase
      .from('folders')
      .select('id')
      .eq('user_id', currentUserId);

    // Delete folders that are no longer in local state
    if (dbFolders && dbFolders.length > 0) {
      const localFolderIds = new Set(folders.map(f => f.id));
      const foldersToDelete = dbFolders.filter(f => !localFolderIds.has(f.id));

      if (foldersToDelete.length > 0) {
        logger.log(`[DB] Deleting ${foldersToDelete.length} folders that are no longer in local state`);
        await Promise.all(
          foldersToDelete.map(f => deleteFolderFromDB(f.id, currentUserId))
        );
      }
    }

    // Upsert all current folders
    const promises = folders.map(folder => saveFolderToDB(folder, currentUserId));
    const results = await Promise.all(promises);

    const successCount = results.filter(r => r).length;
    logger.log(`[DB] Successfully synced ${successCount}/${folders.length} folders`);
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

    logger.log('[DB] Deleting folder:', folderId);

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', currentUserId);

    if (error) {
      console.error('[DB] Delete folder failed:', error);
      return false;
    }

    logger.log('[DB] Folder deleted successfully:', folderId);
    return true;
  } catch (error) {
    console.error('[DB] Error deleting folder:', error);
    return false;
  }
}

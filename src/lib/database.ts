import { Project } from '../App';
import { supabase } from './supabase';

/**
 * Load all projects for the current user from Supabase
 */
export async function loadProjectsFromDB(): Promise<Project[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('No active session for loading projects');
      return [];
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading projects:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error loading projects:', error);
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
      console.error("No user ID available for saveProjectToDB");
      return false;
    }

    const projectData = {
      id: project.id,
      user_id: currentUserId,
      name: project.name,
      items: project.items,
      updated_at: new Date().toISOString()
    };

    console.log('Attempting to save project:', projectData);

    const { data, error } = await supabase
      .from('projects')
      .upsert(projectData, {
        onConflict: 'id'
      })
      .select();

    if (error) {
      console.error(`Failed to save project ${project.id}:`, error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to save project ${project.id}: ${error.message}`);
    }

    console.log(`Project ${project.id} saved successfully. Response:`, data);
    return true;
  } catch (error) {
    console.error('Error in saveProjectToDB:', error);
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
      console.error('No user ID available for syncing projects');
      return false;
    }

    console.log(`Syncing ${projects.length} projects for user ${currentUserId}`);

    const promises = projects.map(project => saveProjectToDB(project, currentUserId));
    await Promise.all(promises);

    console.log(`Successfully synced ${projects.length} projects`);
    return true;
  } catch (error) {
    console.error('Error syncing projects:', error);
    throw error;
  }
}

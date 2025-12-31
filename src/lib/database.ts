import { Project } from '../App';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Get user ID from localStorage
function getUserId(): string | null {
  try {
    const authData = localStorage.getItem('sb-uvrzqnatomfqapysejdf-auth-token');
    if (!authData) return null;
    const parsed = JSON.parse(authData);
    return parsed?.user?.id || null;
  } catch {
    return null;
  }
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  try {
    const authData = localStorage.getItem('sb-uvrzqnatomfqapysejdf-auth-token');
    if (!authData) return null;
    const parsed = JSON.parse(authData);
    return parsed?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Load all projects for the current user from Supabase
 */
export async function loadProjectsFromDB(): Promise<Project[]> {
  try {
    const token = getAuthToken();
    const userId = getUserId();

    if (!token || !userId) return [];

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?user_id=eq.${userId}&order=created_at.asc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
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
    const token = getAuthToken();
    const currentUserId = userId || getUserId();

    if (!token || !currentUserId) return false;

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/projects`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: project.id,
          user_id: currentUserId,
          name: project.name,
          items: project.items
        })
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error saving project:', error);
    return false;
  }
}

/**
 * Delete a project from Supabase
 */
export async function deleteProjectFromDB(projectId: string, userId?: string): Promise<boolean> {
  try {
    const token = getAuthToken();
    if (!token) return false;

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}${userId ? `&user_id=eq.${userId}` : ''}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      }
    );

    return response.ok;
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
    const currentUserId = userId || getUserId();
    if (!currentUserId) return false;

    const promises = projects.map(project => saveProjectToDB(project, currentUserId));
    await Promise.all(promises);

    return true;
  } catch (error) {
    console.error('Error syncing projects:', error);
    return false;
  }
}

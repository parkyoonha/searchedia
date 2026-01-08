import { supabase } from './supabase';
import { BulkItem } from '../components/BulkGenerator';

export interface ReviewSession {
  id: string;
  share_token: string;
  creator_user_id: string;
  project_id?: string;
  created_at: string;
  expires_at: string;
  status: 'pending' | 'in-review' | 'completed';
  items: BulkItem[];
  view_count: number;
  max_views: number;
}

export interface ReviewResult {
  session_id: string;
  reviewed_at: string;
  items: Array<{
    id: string;
    reviewStatus?: 'approved' | 'rejected' | 'pending';
    reviewComment?: string;
  }>;
}

/**
 * Create a new review session in the database
 */
export async function createReviewSession(
  items: BulkItem[],
  shareToken: string,
  expirationHours: number,
  maxViews: number,
  projectId?: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'User not authenticated' };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationHours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('review_sessions')
      .insert({
        share_token: shareToken,
        creator_user_id: session.user.id,
        project_id: projectId,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        items: items,
        view_count: 0,
        max_views: maxViews
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating review session:', error);
      return { success: false, error: error.message };
    }

    console.log('Review session created:', data);
    return { success: true, sessionId: data.id };
  } catch (error) {
    console.error('Error in createReviewSession:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Load a review session by share token
 */
export async function loadReviewSession(shareToken: string): Promise<{
  success: boolean;
  session?: ReviewSession;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('review_sessions')
      .select('*')
      .eq('share_token', shareToken)
      .single();

    if (error) {
      console.error('Error loading review session:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Review session not found' };
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    if (now > expiresAt) {
      return { success: false, error: 'This review link has expired' };
    }

    // Check view count
    if (data.view_count >= data.max_views) {
      return { success: false, error: 'This review link has reached its maximum view limit' };
    }

    // Increment view count
    await supabase
      .from('review_sessions')
      .update({
        view_count: data.view_count + 1,
        status: 'in-review'
      })
      .eq('id', data.id);

    return { success: true, session: data };
  } catch (error) {
    console.error('Error in loadReviewSession:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update review session with reviewer's feedback
 */
export async function submitReviewResults(
  shareToken: string,
  items: BulkItem[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('review_sessions')
      .update({
        items: items,
        status: 'completed',
        reviewed_at: new Date().toISOString()
      })
      .eq('share_token', shareToken)
      .select()
      .single();

    if (error) {
      console.error('Error submitting review:', error);
      return { success: false, error: error.message };
    }

    console.log('Review submitted successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('Error in submitReviewResults:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get review sessions created by the current user
 */
export async function getMyReviewSessions(): Promise<{
  success: boolean;
  sessions?: ReviewSession[];
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('review_sessions')
      .select('*')
      .eq('creator_user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading review sessions:', error);
      return { success: false, error: error.message };
    }

    return { success: true, sessions: data || [] };
  } catch (error) {
    console.error('Error in getMyReviewSessions:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update items in a review session
 */
export async function updateReviewSessionItems(
  shareToken: string,
  items: BulkItem[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('review_sessions')
      .update({ items })
      .eq('share_token', shareToken);

    if (error) {
      console.error('Error updating review session items:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateReviewSessionItems:', error);
    return { success: false, error: String(error) };
  }
}

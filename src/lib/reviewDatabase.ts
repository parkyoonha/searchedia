import { supabase } from './supabase';
import { BulkItem } from '../components/BulkGenerator';

export interface ReviewSession {
  id: string;
  share_token: string;
  creator_user_id: string;
  project_id?: string;
  folder_id?: string;
  review_type?: 'project' | 'folder';
  created_at: string;
  expires_at: string;
  status: 'pending' | 'in-review' | 'completed';
  items: BulkItem[];
  view_count: number;
  max_views: number;
  is_rereview?: boolean;
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
  projectId?: string,
  isRereview?: boolean,
  folderId?: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error('Auth timeout')), 2000)
    );

    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

    if (!session?.user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Validate: exactly one of projectId or folderId must be provided (unless re-review)
    if (!isRereview && !projectId && !folderId) {
      return { success: false, error: 'Must provide either projectId or folderId' };
    }
    if (projectId && folderId) {
      return { success: false, error: 'Cannot provide both projectId and folderId' };
    }

    const reviewType = folderId ? 'folder' : 'project';

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationHours * 60 * 60 * 1000);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const url = `${supabaseUrl}/rest/v1/review_sessions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        share_token: shareToken,
        creator_user_id: session.user.id,
        project_id: projectId,
        folder_id: folderId,
        review_type: reviewType,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        items: items,
        view_count: 0,
        max_views: maxViews,
        is_rereview: isRereview || false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const dataArray = await response.json();
    const data = dataArray[0];
    return { success: true, sessionId: data.id };
  } catch (error) {
    console.error('[Review] Create error:', error);
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
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const url = `${supabaseUrl}/rest/v1/review_sessions?select=*&share_token=eq.${shareToken}`;

    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const dataArray = await response.json();
    const data = dataArray[0];

    if (!data) {
      return { success: false, error: 'Review session not found' };
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    if (now > expiresAt) {
      return { success: false, error: 'This review link has expired' };
    }

    // If session is already completed, just return it without modifying anything
    // This preserves the submitted review results
    if (data.status === 'completed') {
      return { success: true, session: data };
    }

    // For non-completed sessions, check view count limit
    if (data.view_count >= data.max_views) {
      return { success: false, error: 'This review link has reached its maximum view limit' };
    }

    // Increment view count and set status to 'in-review' (only for pending sessions)
    const updateUrl = `${supabaseUrl}/rest/v1/review_sessions?id=eq.${data.id}`;
    await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        view_count: data.view_count + 1,
        status: 'in-review'
      })
    });

    return { success: true, session: data };
  } catch (error) {
    console.error('[Review] Load error:', error);
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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const url = `${supabaseUrl}/rest/v1/review_sessions?share_token=eq.${shareToken}`;

  console.log('✉️ Submitting review...');
  const itemsWithReview = items.filter(i => i.reviewStatus || i.reviewComment);
  console.log('📝 Review data:', {
    shareToken,
    items_count: items.length,
    items_with_review: itemsWithReview.length,
    review_details: itemsWithReview.map(i => ({
      id: i.id,
      word: i.word,
      reviewStatus: i.reviewStatus,
      reviewComment: i.reviewComment
    }))
  });

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          items: items,
          status: 'completed',
          reviewed_at: new Date().toISOString()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Submit error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Review submitted!', {
        status: data[0]?.status,
        project_id: data[0]?.project_id,
        id: data[0]?.id,
        items_count: data[0]?.items?.length || 0
      });

      return { success: true };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error('❌ Submit timeout');
        throw new Error('Request timeout - please check your connection and try again');
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('❌ Submit failed:', error);
    return {
      success: false,
      error: error.message || String(error)
    };
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
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error('Auth timeout')), 10000)
    );

    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

    if (!session?.user) {
      console.warn('[Review] User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    console.log('[Review] Loading sessions for user:', session.user.id);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const url = `${supabaseUrl}/rest/v1/review_sessions?creator_user_id=eq.${session.user.id}&order=created_at.desc&select=*`;

    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Log completed sessions with details
    const completed = data.filter((s: any) => s.status === 'completed');
    const completedDetails = completed.map((s: any) => ({
      id: s.id,
      project_id: s.project_id,
      status: s.status,
      items_with_review: s.items?.filter((i: any) => i.reviewStatus || i.reviewComment).length || 0,
      reviewed_at: s.reviewed_at,
      created_at: s.created_at
    }));

    console.log('📥 [Review] Loaded sessions:', {
      total: data.length,
      completed: completed.length,
      completed_session_ids: completed.map((s: any) => s.id.substring(0, 8))
    });

    // Log ALL sessions status
    console.table(data.map((s: any) => ({
      id: s.id.substring(0, 8),
      status: s.status,
      project_id: s.project_id,
      items_with_review: s.items?.filter((i: any) => i.reviewStatus || i.reviewComment).length || 0,
      created_at: new Date(s.created_at).toLocaleTimeString()
    })));

    console.log('✅ [Review] COMPLETED sessions detail:', completedDetails);

    // Track ALL completed sessions in detail
    completed.forEach((s: any) => {
      const itemsWithReview = s.items?.filter((i: any) => i.reviewStatus || i.reviewComment).length || 0;
      console.log(`🔍 [TRACK ${s.id.substring(0, 8)}]`, {
        status: s.status,
        items_count: s.items?.length || 0,
        items_with_review: itemsWithReview,
        reviewed_at: s.reviewed_at
      });

      if (itemsWithReview === 0) {
        console.warn(`⚠️ [WARNING] Completed session ${s.id.substring(0, 8)} has NO review data!`);
      }
    });

    return { success: true, sessions: data || [] };
  } catch (error) {
    console.error('[Review] Load error:', error);
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
    const itemsWithReview = items.filter(i => i.reviewStatus || i.reviewComment);
    console.log('💾 [Auto-save] Updating items:', {
      shareToken,
      total_items: items.length,
      items_with_review: itemsWithReview.length
    });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // First, check if the session is already completed
    const checkUrl = `${supabaseUrl}/rest/v1/review_sessions?select=status&share_token=eq.${shareToken}`;
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      if (checkData[0]?.status === 'completed') {
        console.log('🚫 [Auto-save] Session already completed, skipping update');
        return { success: false, error: 'Session already completed' };
      }
    }

    const url = `${supabaseUrl}/rest/v1/review_sessions?share_token=eq.${shareToken}&status=neq.completed`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ items })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('✅ [Auto-save] Items updated successfully');

    // Log ALL auto-save updates
    console.log('⚠️ [AUTO-SAVE UPDATE]', {
      shareToken: shareToken.substring(0, 8),
      items_count: items.length,
      items_with_review: items.filter(i => i.reviewStatus || i.reviewComment).length
    });

    return { success: true };
  } catch (error) {
    console.error('❌ [Auto-save] Update failed:', error);
    return { success: false, error: String(error) };
  }
}

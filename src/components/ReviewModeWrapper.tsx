import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BulkGenerator, BulkItem } from './BulkGenerator';
import { LoginDialog } from './subscription/SubscriptionModals';
import { loadReviewSession } from '../lib/reviewDatabase';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function ReviewModeWrapper() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<{id: string, name: string, email: string, plan: 'free' | 'pro', avatar_url?: string} | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewSession, setReviewSession] = useState<{
    id: string;
    creator_user_id: string;
    items: BulkItem[];
    share_token: string;
    review_type?: 'project' | 'folder';
    is_rereview?: boolean;
    status?: 'pending' | 'in-review' | 'completed';
  } | null>(null);
  const [items, setItems] = useState<BulkItem[]>([]);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    checkAuthAndLoadSession();
  }, [token]);

  const checkAuthAndLoadSession = async () => {
    try {
      // Load review session first (no login required for public review links)
      if (!token) {
        console.error('[ReviewMode] No token provided');
        toast.error('Invalid review link');
        navigate('/');
        return;
      }

      console.log('[ReviewMode] Loading review session for token:', token);

      const reviewPromise = loadReviewSession(token);
      const reviewTimeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Review session load timeout')), 5000)
      );

      const result = await Promise.race([reviewPromise, reviewTimeoutPromise]);

      console.log('[ReviewMode] Load result:', result);

      if (!result.success || !result.session) {
        console.error('[ReviewMode] Failed to load session:', result.error);
        toast.error(result.error || 'Failed to load review session');
        navigate('/');
        return;
      }

      console.log('[ReviewMode] Session loaded successfully:', result.session.id);
      setReviewSession(result.session);
      setItems(result.session.items);

      // Check if user is logged in (optional, for additional features)
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<any>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 2000)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            plan: 'pro',
            avatar_url: session.user.user_metadata?.picture
          });
        }
      } catch (authError) {
        console.log('Auth check skipped:', authError);
      }

      setLoading(false);
      setShowLogin(false);

    } catch (error) {
      console.error('Error loading review session:', error);
      toast.error('Failed to load review session: ' + (error as Error).message);
      navigate('/');
    }
  };

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          plan: 'pro',
          avatar_url: session.user.user_metadata?.picture
        });
        setShowLogin(false);

        // Reload session after login with timeout
        if (token) {
          try {
            const reviewPromise = loadReviewSession(token);
            const timeoutPromise = new Promise<any>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 5000)
            );
            const result = await Promise.race([reviewPromise, timeoutPromise]);

            if (result.success && result.session) {
              setReviewSession(result.session);
              setItems(result.session.items);
              setLoading(false);
            }
          } catch (error) {
            console.error('Error loading review session after login:', error);
            setLoading(false);
          }
        }
      } else {
        setUser(null);
        setShowLogin(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [token]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setShowLogin(true);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-slate-600">Loading review session...</p>
        </div>
      </div>
    );
  }

  if (!reviewSession) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <p className="text-sm text-slate-600">Review session not found</p>
        </div>
      </div>
    );
  }

  // Show thank you page after submission
  if (reviewSubmitted) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-4">Thank You!</h1>
          <p className="text-slate-600 mb-8">
            Your review has been successfully submitted to the creator. They will receive your feedback shortly.
          </p>
          <p className="text-sm text-slate-500">
            You can now close this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BulkGenerator
      items={items}
      setItems={setItems}
      onDelete={() => {}} // Disabled in review mode
      onGenerate={() => {}} // Disabled in review mode
      onCancel={() => setReviewSubmitted(true)}
      userPlan={user?.plan || 'free'}
      credits={0}
      onUpgrade={() => {}}
      onConsumeCredits={() => {}}
      projects={[]}
      activeProjectId={null}
      addProject={() => {}}
      renameProject={() => {}}
      duplicateProject={() => {}}
      deleteProject={() => {}}
      switchActiveProject={() => {}}
      folders={[]}
      expandedFolders={new Set()}
      addFolder={() => {}}
      renameFolder={() => {}}
      deleteFolder={() => {}}
      moveProjectToFolder={() => {}}
      toggleFolderExpanded={() => {}}
      currentFolderId={null}
      setCurrentFolderId={() => {}}
      user={user}
      onShowLogin={() => setShowLogin(true)}
      onLogout={handleLogout}
      reviewMode={{
        isReviewMode: true,
        shareToken: reviewSession.share_token,
        creatorId: reviewSession.creator_user_id,
        isReadOnly: reviewSession.status === 'completed',
        isRereview: reviewSession.is_rereview ||
                    (reviewSession.items && reviewSession.items.length > 0 &&
                     reviewSession.items.some((item: any) => item.previousReviewStatus)) || false,
        reviewType: reviewSession.review_type || 'project'
      }}
    />
  );
}

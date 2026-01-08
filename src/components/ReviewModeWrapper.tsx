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
  } | null>(null);
  const [items, setItems] = useState<BulkItem[]>([]);

  // Check authentication on mount
  useEffect(() => {
    checkAuthAndLoadSession();
  }, [token]);

  const checkAuthAndLoadSession = async () => {
    try {
      // Load review session first (no login required for public review links)
      if (!token) {
        toast.error('Invalid review link');
        navigate('/');
        return;
      }

      const reviewPromise = loadReviewSession(token);
      const reviewTimeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Review session load timeout')), 5000)
      );

      const result = await Promise.race([reviewPromise, reviewTimeoutPromise]);

      if (!result.success || !result.session) {
        toast.error(result.error || 'Failed to load review session');
        navigate('/');
        return;
      }

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

  return (
    <BulkGenerator
      items={items}
      setItems={setItems}
      onDelete={() => {}} // Disabled in review mode
      onGenerate={() => {}} // Disabled in review mode
      onCancel={() => navigate('/')}
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
      user={user}
      onShowLogin={() => setShowLogin(true)}
      onLogout={handleLogout}
      reviewMode={{
        isReviewMode: true,
        shareToken: reviewSession.share_token,
        creatorId: reviewSession.creator_user_id
      }}
    />
  );
}

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
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        // Not logged in, show login dialog
        setShowLogin(true);
        setLoading(false);
        return;
      }

      // User is logged in, set user state
      setUser({
        id: session.user.id,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || '',
        plan: 'pro',
        avatar_url: session.user.user_metadata?.picture
      });

      // Load review session
      if (!token) {
        toast.error('Invalid review link');
        navigate('/');
        return;
      }

      const result = await loadReviewSession(token);

      if (!result.success || !result.session) {
        toast.error(result.error || 'Failed to load review session');
        navigate('/');
        return;
      }

      setReviewSession(result.session);
      setItems(result.session.items);
      setLoading(false);

    } catch (error) {
      console.error('Error loading review session:', error);
      toast.error('Failed to load review session');
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

        // Reload session after login
        if (token) {
          const result = await loadReviewSession(token);
          if (result.success && result.session) {
            setReviewSession(result.session);
            setItems(result.session.items);
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

  if (showLogin || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Login Required</h1>
            <p className="text-sm text-slate-600">
              You need to be logged in to review this session.
            </p>
          </div>
          <LoginDialog
            open={true}
            onOpenChange={() => {}}
            onLogin={() => setShowLogin(false)}
          />
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
      userPlan={user.plan}
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

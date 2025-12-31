import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Check, X, MessageSquare, ExternalLink, AlertCircle, ShieldAlert } from 'lucide-react';
import { BulkItem } from './BulkGenerator';

export interface ReviewSession {
  id: string;
  shareToken: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'in-review' | 'approved' | 'completed';
  items: BulkItem[];
  viewCount: number;
  maxViews: number;
}

export function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<ReviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemComments, setItemComments] = useState<Record<string, string>>({});

  useEffect(() => {
    // Add SEO blocking meta tags
    const metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    metaRobots.content = 'noindex, nofollow';
    document.head.appendChild(metaRobots);

    return () => {
      document.head.removeChild(metaRobots);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setError('Invalid review link');
      setLoading(false);
      return;
    }

    // Load review session from localStorage
    const sessions = JSON.parse(localStorage.getItem('reviewSessions') || '[]');
    const foundSession = sessions.find((s: ReviewSession) => s.shareToken === token);

    if (!foundSession) {
      setError('Review session not found');
      setLoading(false);
      return;
    }

    // Check expiration
    const now = Date.now();
    if (now > foundSession.expiresAt) {
      setError('This review link has expired');
      setLoading(false);
      return;
    }

    // Check view count
    if (foundSession.viewCount >= foundSession.maxViews) {
      setError('This review link has reached its maximum view limit');
      setLoading(false);
      return;
    }

    // Increment view count
    foundSession.viewCount += 1;
    foundSession.status = 'in-review';

    // Save updated session
    const updatedSessions = sessions.map((s: ReviewSession) =>
      s.shareToken === token ? foundSession : s
    );
    localStorage.setItem('reviewSessions', JSON.stringify(updatedSessions));

    setSession(foundSession);
    setLoading(false);
  }, [token]);

  const handleUpdateReviewStatus = (itemId: string, status: 'approved' | 'rejected') => {
    if (!session) return;

    const updatedItems = session.items.map(item =>
      item.id === itemId ? { ...item, reviewStatus: status } : item
    );

    const updatedSession = { ...session, items: updatedItems };
    setSession(updatedSession);

    // Update in localStorage
    const sessions = JSON.parse(localStorage.getItem('reviewSessions') || '[]');
    const updatedSessions = sessions.map((s: ReviewSession) =>
      s.shareToken === token ? updatedSession : s
    );
    localStorage.setItem('reviewSessions', JSON.stringify(updatedSessions));

    toast.success(`Item ${status}`);
  };

  const handleUpdateComment = (itemId: string, comment: string) => {
    if (!session) return;

    const updatedItems = session.items.map(item =>
      item.id === itemId ? { ...item, reviewComment: comment } : item
    );

    const updatedSession = { ...session, items: updatedItems };
    setSession(updatedSession);

    // Update in localStorage
    const sessions = JSON.parse(localStorage.getItem('reviewSessions') || '[]');
    const updatedSessions = sessions.map((s: ReviewSession) =>
      s.shareToken === token ? updatedSession : s
    );
    localStorage.setItem('reviewSessions', JSON.stringify(updatedSessions));

    setItemComments(prev => ({ ...prev, [itemId]: comment }));
  };

  const handleSubmitReview = () => {
    if (!session) return;

    // Check if all items have been reviewed
    const allReviewed = session.items.every(item => item.reviewStatus);

    if (!allReviewed) {
      toast.error('Please review all items before submitting');
      return;
    }

    const updatedSession = { ...session, status: 'completed' as const };

    // Update in localStorage
    const sessions = JSON.parse(localStorage.getItem('reviewSessions') || '[]');
    const updatedSessions = sessions.map((s: ReviewSession) =>
      s.shareToken === token ? updatedSession : s
    );
    localStorage.setItem('reviewSessions', JSON.stringify(updatedSessions));

    toast.success('Review submitted successfully!');
    setSession(updatedSession);
  };

  const getTimeRemaining = () => {
    if (!session) return '';
    const now = Date.now();
    const remaining = session.expiresAt - now;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const isPaidStock = (source: string) => {
    const paidSources = ['shutterstock', 'freepik'];
    return paidSources.includes(source.toLowerCase());
  };

  const isFreeStock = (source: string) => {
    const freeSources = ['unsplash', 'pexels', 'pixabay'];
    return freeSources.includes(source.toLowerCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading review session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const approvedCount = session.items.filter(item => item.reviewStatus === 'approved').length;
  const rejectedCount = session.items.filter(item => item.reviewStatus === 'rejected').length;
  const pendingCount = session.items.filter(item => !item.reviewStatus || item.reviewStatus === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* SEO Blocking Watermark */}
      <div className="fixed top-0 left-0 right-0 bg-slate-900 text-white px-4 py-2 text-center text-xs z-50">
        <ShieldAlert className="h-3 w-3 inline mr-1" />
        FOR REVIEW ONLY - This page is not indexed by search engines
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 mt-10">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">Review Session</CardTitle>
                <p className="text-sm text-slate-600">
                  Review each item and provide your feedback
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="mb-2">
                  Expires in {getTimeRemaining()}
                </Badge>
                <p className="text-xs text-slate-500">
                  Views: {session.viewCount} / {session.maxViews}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-slate-600">Approved: {approvedCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-slate-600">Rejected: {rejectedCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-300 rounded-full"></div>
                <span className="text-slate-600">Pending: {pendingCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Items */}
        <div className="space-y-6">
          {session.items.map((item, index) => (
            <Card key={item.id} className={`overflow-hidden ${
              item.reviewStatus === 'approved' ? 'border-green-200 bg-green-50/50' :
              item.reviewStatus === 'rejected' ? 'border-red-200 bg-red-50/50' :
              'border-slate-200'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {index + 1}. {item.word || 'Untitled'}
                    </CardTitle>
                    {item.description && (
                      <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={item.reviewStatus === 'approved' ? 'default' : 'outline'}
                      className={item.reviewStatus === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                      onClick={() => handleUpdateReviewStatus(item.id, 'approved')}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant={item.reviewStatus === 'rejected' ? 'default' : 'outline'}
                      className={item.reviewStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
                      onClick={() => handleUpdateReviewStatus(item.id, 'rejected')}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image/Video Preview */}
                {item.imageUrl && (
                  <div className="space-y-2">
                    <div className="relative bg-slate-100 rounded-md overflow-hidden">
                      {item.mediaType === 'video' ? (
                        <video
                          src={item.imageUrl}
                          controls
                          className="w-full max-h-96 object-contain"
                        />
                      ) : (
                        <img
                          src={item.imageUrl}
                          alt={item.word}
                          className="w-full max-h-96 object-contain"
                          style={isPaidStock(item.imageSource?.[0] || '') ? { maxWidth: '150px' } : {}}
                        />
                      )}

                      {/* Stock Type Badge */}
                      <div className="absolute top-2 left-2">
                        {isFreeStock(item.imageSource?.[0] || '') && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                            FREE - Preview & export allowed
                          </Badge>
                        )}
                        {isPaidStock(item.imageSource?.[0] || '') && (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-xs">
                            PAID - Preview only · export links only
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Attribution */}
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span>Source: {item.imageSource?.[0] || 'Unknown'}</span>
                      {item.photographer && (
                        <>
                          <span>•</span>
                          <span>By: {item.photographer}</span>
                        </>
                      )}
                      {item.imageSourceUrl && (
                        <a
                          href={item.imageSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-slate-500 hover:text-slate-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Original
                        </a>
                      )}
                    </div>

                    {isFreeStock(item.imageSource?.[0] || '') && (
                      <p className="text-xs text-slate-500 italic">
                        Free stock – Check license before use
                      </p>
                    )}
                  </div>
                )}

                {/* Keywords */}
                {item.keywords && (
                  <div className="text-sm">
                    <Label className="text-xs text-slate-600">Keywords</Label>
                    <p className="text-slate-700 mt-1">{item.keywords}</p>
                  </div>
                )}

                {/* Comment Section */}
                <div className="space-y-2">
                  <Label htmlFor={`comment-${item.id}`} className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4" />
                    Comments (optional)
                  </Label>
                  <Textarea
                    id={`comment-${item.id}`}
                    placeholder="Add your feedback or suggestions..."
                    value={itemComments[item.id] || item.reviewComment || ''}
                    onChange={(e) => handleUpdateComment(item.id, e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit Button */}
        {session.status !== 'completed' && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Ready to submit your review?
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {pendingCount > 0 ?
                      `Please review ${pendingCount} remaining item${pendingCount > 1 ? 's' : ''}` :
                      'All items have been reviewed'
                    }
                  </p>
                </div>
                <Button
                  onClick={handleSubmitReview}
                  disabled={pendingCount > 0}
                  size="lg"
                >
                  Submit Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {session.status === 'completed' && (
          <Card className="mt-6 bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <Check className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Review submitted successfully!
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    The creator has been notified of your feedback.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

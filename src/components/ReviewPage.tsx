import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { Check, X, MessageSquare, ExternalLink, AlertCircle, ShieldAlert, CheckSquare } from 'lucide-react';
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkCommentDialog, setShowBulkCommentDialog] = useState(false);
  const [bulkComment, setBulkComment] = useState('');

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

  const handleSelectRow = (itemId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (!session) return;
    if (checked) {
      setSelectedIds(new Set(session.items.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkStatusChange = (status: 'approved' | 'rejected' | 'pending') => {
    if (!session || selectedIds.size === 0) return;

    const updatedItems = session.items.map(item =>
      selectedIds.has(item.id) ? { ...item, reviewStatus: status } : item
    );

    const updatedSession = { ...session, items: updatedItems };
    setSession(updatedSession);

    // Update in localStorage
    const sessions = JSON.parse(localStorage.getItem('reviewSessions') || '[]');
    const updatedSessions = sessions.map((s: ReviewSession) =>
      s.shareToken === token ? updatedSession : s
    );
    localStorage.setItem('reviewSessions', JSON.stringify(updatedSessions));

    const statusText = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'set to pending';
    toast.success(`${selectedIds.size} items ${statusText}`);
    setSelectedIds(new Set());
  };

  const handleBulkCommentSubmit = () => {
    if (!session || selectedIds.size === 0 || !bulkComment.trim()) return;

    const updatedItems = session.items.map(item =>
      selectedIds.has(item.id) ? { ...item, reviewComment: bulkComment } : item
    );

    const updatedSession = { ...session, items: updatedItems };
    setSession(updatedSession);

    // Update in localStorage
    const sessions = JSON.parse(localStorage.getItem('reviewSessions') || '[]');
    const updatedSessions = sessions.map((s: ReviewSession) =>
      s.shareToken === token ? updatedSession : s
    );
    localStorage.setItem('reviewSessions', JSON.stringify(updatedSessions));

    // Update itemComments state
    const newComments = { ...itemComments };
    selectedIds.forEach(id => {
      newComments[id] = bulkComment;
    });
    setItemComments(newComments);

    toast.success(`Comment added to ${selectedIds.size} items`);
    setShowBulkCommentDialog(false);
    setBulkComment('');
    setSelectedIds(new Set());
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
            <div className="flex items-center justify-between mb-4">
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

              {/* Bulk Selection Controls */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={session.items.length > 0 && selectedIds.size === session.items.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-slate-600">Select All</span>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg">
                <Badge variant="secondary" className="bg-slate-200 text-slate-700">
                  {selectedIds.size} selected
                </Badge>
                <div className="flex gap-2 ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-200 hover:bg-green-50"
                    onClick={() => handleBulkStatusChange('approved')}
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Approve All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 hover:bg-red-50"
                    onClick={() => handleBulkStatusChange('rejected')}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Reject All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-200 hover:bg-slate-50"
                    onClick={() => handleBulkStatusChange('pending')}
                  >
                    <AlertCircle className="h-4 w-4 mr-1.5" />
                    Set Pending
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowBulkCommentDialog(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1.5" />
                    Add Comment
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Items - List Style with All Columns */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-200">
              {session.items.map((item, index) => (
                <div key={item.id} className={`p-6 transition-colors ${
                  selectedIds.has(item.id) ? 'bg-slate-100/50 border-l-4 border-l-slate-500' :
                  item.reviewStatus === 'approved' ? 'bg-green-50/30' :
                  item.reviewStatus === 'rejected' ? 'bg-red-50/30' :
                  'hover:bg-slate-50/50'
                }`}>
                  {/* Main Content Row */}
                  <div className="grid grid-cols-12 gap-4 mb-4">
                    {/* Checkbox + # Column */}
                    <div className="col-span-1 flex items-start gap-3 pt-1">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={(checked) => handleSelectRow(item.id, checked as boolean)}
                      />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        item.reviewStatus === 'approved' ? 'bg-green-100 text-green-700' :
                        item.reviewStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {index + 1}
                      </div>
                    </div>

                    {/* Visual & Source Column */}
                    <div className="col-span-3">
                      {item.imageUrl ? (
                        <div className="flex flex-col gap-2">
                          <div className="relative aspect-[3/2] bg-slate-100 rounded-md overflow-hidden">
                            {item.mediaType === 'video' ? (
                              <video
                                src={item.imageUrl}
                                className="w-full h-full object-cover"
                                controls
                                loop
                                muted
                                preload="none"
                              />
                            ) : (
                              <img
                                src={item.imageUrl}
                                alt={item.word}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            )}

                            {/* Stock Type Badge - Top Left */}
                            {item.imageSource?.[0] && (
                              <div className="absolute top-1 left-1">
                                {isFreeStock(item.imageSource[0]) ? (
                                  <Badge variant="secondary" className="bg-slate-600 text-white border-0 text-[8px] px-1.5 h-4">
                                    FREE
                                  </Badge>
                                ) : isPaidStock(item.imageSource[0]) ? (
                                  <Badge variant="secondary" className="bg-slate-700 text-white border-0 text-[8px] px-1.5 h-4">
                                    PAID
                                  </Badge>
                                ) : null}
                              </div>
                            )}

                            {/* Source Name Badge - Bottom Right */}
                            <div className="absolute bottom-1 right-1">
                              <Badge variant="secondary" className="bg-black/60 text-white border-0 text-[9px] px-1.5 h-4">
                                {item.imageSource?.[0] || 'AI Generated'}
                              </Badge>
                            </div>
                          </div>

                          {/* Attribution */}
                          {item.imageSourceUrl && (
                            <a
                              href={item.imageSourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Original
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-[3/2] bg-slate-100 rounded-md flex items-center justify-center text-xs text-slate-400">
                          No visual
                        </div>
                      )}
                    </div>

                    {/* Word Column */}
                    <div className="col-span-2 flex items-start pt-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {item.word || 'Untitled'}
                      </div>
                    </div>

                    {/* Description Column */}
                    <div className="col-span-4 flex items-start pt-1">
                      <div className="space-y-2 w-full">
                        {item.description && (
                          <p className="text-sm text-slate-600">{item.description}</p>
                        )}

                        {/* Keywords */}
                        {item.keywords && (
                          <div className="flex flex-wrap gap-1">
                            {item.keywords.split(' ').map((keyword, i) => (
                              <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Note Column */}
                    <div className="col-span-2 flex items-start pt-1">
                      {item.note && (
                        <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md">
                          <p className="text-sm text-slate-700">{item.note}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Actions - Bottom Section */}
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    {/* Comment */}
                    <div>
                      <Label htmlFor={`comment-${item.id}`} className="text-xs text-slate-600 mb-1.5 block">
                        Review Comment
                      </Label>
                      <Textarea
                        id={`comment-${item.id}`}
                        placeholder="Add your feedback or suggestions..."
                        value={itemComments[item.id] || item.reviewComment || ''}
                        onChange={(e) => handleUpdateComment(item.id, e.target.value)}
                        className="min-h-[70px] text-sm"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={item.reviewStatus === 'approved' ? 'default' : 'outline'}
                        className={item.reviewStatus === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'border-green-200 hover:bg-green-50 hover:border-green-300'}
                        onClick={() => handleUpdateReviewStatus(item.id, 'approved')}
                      >
                        <Check className="h-4 w-4 mr-1.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant={item.reviewStatus === 'rejected' ? 'default' : 'outline'}
                        className={item.reviewStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'border-red-200 hover:bg-red-50 hover:border-red-300'}
                        onClick={() => handleUpdateReviewStatus(item.id, 'rejected')}
                      >
                        <X className="h-4 w-4 mr-1.5" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant={item.reviewStatus === 'pending' ? 'default' : 'outline'}
                        className={item.reviewStatus === 'pending' ? 'bg-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'}
                        onClick={() => handleUpdateReviewStatus(item.id, 'pending')}
                      >
                        <AlertCircle className="h-4 w-4 mr-1.5" />
                        Pending
                      </Button>
                      {item.reviewStatus && (
                        <span className="text-xs text-slate-500 ml-2">
                          {item.reviewStatus === 'approved' ? '✓ Approved' :
                           item.reviewStatus === 'rejected' ? '✗ Rejected' :
                           '⏸ Pending'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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

      {/* Bulk Comment Dialog */}
      <Dialog open={showBulkCommentDialog} onOpenChange={setShowBulkCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment to Selected Items</DialogTitle>
            <DialogDescription>
              Add a comment to {selectedIds.size} selected item{selectedIds.size > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter your comment..."
              value={bulkComment}
              onChange={(e) => setBulkComment(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBulkCommentDialog(false);
              setBulkComment('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleBulkCommentSubmit} disabled={!bulkComment.trim()}>
              Add Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

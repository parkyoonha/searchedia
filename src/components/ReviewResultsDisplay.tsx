import React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Check, X, CheckCircle, RotateCcw } from 'lucide-react';

interface ReviewResultsDisplayProps {
  reviewStatus?: 'approved' | 'rejected' | 'pending';
  reviewComment?: string;
  reviewedAt?: string;
  compact?: boolean;
  onComplete?: () => void;
  onRequestReReview?: () => void;
}

export function ReviewResultsDisplay({
  reviewStatus,
  reviewComment,
  reviewedAt,
  compact = false,
  onComplete,
  onRequestReReview
}: ReviewResultsDisplayProps) {
  // Don't render if no review status or if still pending
  if (!reviewStatus || reviewStatus === 'pending') {
    return null;
  }

  // Format the reviewed date/time
  const formatTimeAgo = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

      // For older dates, show the actual date
      return date.toLocaleDateString();
    } catch (error) {
      return '';
    }
  };

  const isApproved = reviewStatus === 'approved';

  return (
    <div className={`mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg ${compact ? 'text-xs' : 'text-sm'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Badge
          className={`${
            isApproved
              ? 'bg-green-100 text-green-700 border-green-200'
              : 'bg-red-100 text-red-700 border-red-200'
          } text-xs font-medium`}
        >
          {isApproved ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Approved
            </>
          ) : (
            <>
              <X className="h-3 w-3 mr-1" />
              Rejected
            </>
          )}
        </Badge>
        {reviewedAt && (
          <span className="text-xs text-slate-500">
            {formatTimeAgo(reviewedAt)}
          </span>
        )}
      </div>
      {reviewComment && (
        <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
          {reviewComment}
        </p>
      )}

      {/* Action Buttons */}
      {(onComplete || onRequestReReview) && (
        <div className="flex gap-1 mt-3 pt-2 border-t border-slate-200">
          {onComplete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={onComplete}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              처리완료
            </Button>
          )}
          {reviewStatus === 'rejected' && onRequestReReview && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={onRequestReReview}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              재요청
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

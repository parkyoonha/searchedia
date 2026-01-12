-- Migration: Add folder review support to review_sessions table
-- This allows review sessions to be linked to entire folders, not just individual projects

-- Add folder_id column to link review session to a folder
ALTER TABLE review_sessions
ADD COLUMN IF NOT EXISTS folder_id TEXT;

-- Add review_type to explicitly distinguish between project and folder reviews
ALTER TABLE review_sessions
ADD COLUMN IF NOT EXISTS review_type TEXT CHECK (review_type IN ('project', 'folder')) DEFAULT 'project';

-- Add index for better query performance on folder-based reviews
CREATE INDEX IF NOT EXISTS idx_review_sessions_folder_id ON review_sessions(folder_id);

-- Note: Business logic should ensure that exactly one of project_id OR folder_id is set
-- (but not both, and not neither for non-rereview sessions)

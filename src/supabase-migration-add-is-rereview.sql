-- Migration: Add is_rereview column to review_sessions table
-- Run this in Supabase Dashboard > SQL Editor if you have an existing database

-- Add is_rereview column to review_sessions table
ALTER TABLE review_sessions
ADD COLUMN IF NOT EXISTS is_rereview BOOLEAN DEFAULT false;

  -- LexiGrid AI - Supabase Database Reset & Setup
  -- Run this in Supabase Dashboard > SQL Editor

  -- Drop existing objects if they exist
  DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
  DROP TRIGGER IF EXISTS update_review_sessions_updated_at ON review_sessions;
  DROP FUNCTION IF EXISTS update_updated_at_column();
  DROP TABLE IF EXISTS review_sessions CASCADE;
  DROP TABLE IF EXISTS projects CASCADE;

  -- Create projects table
  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Enable Row Level Security
  ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

  -- Policy: Users can only access their own projects
  CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own projects"
    ON projects FOR DELETE
    USING (auth.uid() = user_id);

  -- Create index for better performance
  CREATE INDEX idx_projects_user_id ON projects(user_id);
  CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

  -- Create function to update updated_at timestamp
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $$ language 'plpgsql';

  -- Create trigger to auto-update updated_at
  CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- Create review_sessions table
  CREATE TABLE review_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_token TEXT UNIQUE NOT NULL,
    creator_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'in-review', 'completed')) DEFAULT 'pending',
    items JSONB DEFAULT '[]'::jsonb,
    view_count INTEGER DEFAULT 0,
    max_views INTEGER DEFAULT 10,
    reviewed_at TIMESTAMP WITH TIME ZONE
  );

  -- Enable Row Level Security
  ALTER TABLE review_sessions ENABLE ROW LEVEL SECURITY;

  -- Policy: Anyone can view review sessions by share token (for public review links)
  CREATE POLICY "Anyone can view review sessions by share token"
    ON review_sessions FOR SELECT
    USING (true);

  -- Policy: Authenticated users can insert their own review sessions
  CREATE POLICY "Users can insert their own review sessions"
    ON review_sessions FOR INSERT
    WITH CHECK (auth.uid() = creator_user_id);

  -- Policy: Anyone can update review sessions (for reviewers to submit feedback)
  CREATE POLICY "Anyone can update review sessions"
    ON review_sessions FOR UPDATE
    USING (true);

  -- Policy: Users can delete their own review sessions
  CREATE POLICY "Users can delete their own review sessions"
    ON review_sessions FOR DELETE
    USING (auth.uid() = creator_user_id);

  -- Create indexes for better performance
  CREATE INDEX idx_review_sessions_share_token ON review_sessions(share_token);
  CREATE INDEX idx_review_sessions_creator_user_id ON review_sessions(creator_user_id);
  CREATE INDEX idx_review_sessions_created_at ON review_sessions(created_at DESC);

  -- Create trigger to auto-update updated_at
  CREATE TRIGGER update_review_sessions_updated_at BEFORE UPDATE ON review_sessions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
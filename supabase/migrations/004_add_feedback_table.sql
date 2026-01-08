-- Migration: Add feedback table
-- Created: January 8, 2026

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users,
  feedback_type VARCHAR(50) DEFAULT 'general', -- 'general' | 'bug' | 'feature' | 'contextual'
  context VARCHAR(100), -- page path or trigger context like 'after_challenge_pass'
  message TEXT NOT NULL,
  rating INTEGER, -- Optional: 1-5 or thumbs up/down (1 = down, 5 = up)
  user_email VARCHAR(255), -- Cached for quick reference
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);

-- Index for querying by type
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(feedback_type);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- RLS: Users can insert their own feedback
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (even anonymous)
CREATE POLICY "Anyone can insert feedback"
  ON feedback FOR INSERT
  WITH CHECK (true);

-- Users can only view their own feedback
CREATE POLICY "Users can view own feedback"
  ON feedback FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Only service role can update/delete (for admin purposes)
-- No policy needed as default denies

COMMENT ON TABLE feedback IS 'User feedback collected via in-app feedback button and contextual prompts';
COMMENT ON COLUMN feedback.feedback_type IS 'Type of feedback: general, bug, feature request, or contextual (triggered by events)';
COMMENT ON COLUMN feedback.context IS 'Where feedback was submitted from - page path or event trigger';
COMMENT ON COLUMN feedback.rating IS 'Optional rating: 1-5 scale or binary (1=negative, 5=positive)';

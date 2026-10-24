-- Supabase Schema for CINEMAS
-- Run this in your Supabase SQL Editor (Database > SQL Editor > New query)

-- Drop existing table if it exists (safe for a fresh setup)
DROP TABLE IF EXISTS movies CASCADE;

-- Create movies table
CREATE TABLE movies (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('Movie', 'TV Series')),
  genres       TEXT[] NOT NULL,
  franchise    TEXT,
  release_year INTEGER,
  tmdb_id      INTEGER UNIQUE,
  poster_path  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_movies_title   ON movies(title);
CREATE INDEX IF NOT EXISTS idx_movies_type    ON movies(type);
CREATE INDEX IF NOT EXISTS idx_movies_genres  ON movies USING gin(genres);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_movies_updated_at ON movies;
CREATE TRIGGER trg_movies_updated_at
  BEFORE UPDATE ON movies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: since this is personal use, allow all operations with the anon key.
-- Enable RLS but grant full access to anon role.
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal use — allow all"
  ON movies
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

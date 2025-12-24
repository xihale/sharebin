CREATE TABLE IF NOT EXISTS pastes (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  language TEXT,
  created_at INTEGER NOT NULL
);

-- Index for expiration cleanup performance
CREATE INDEX IF NOT EXISTS idx_pastes_created_at ON pastes(created_at);
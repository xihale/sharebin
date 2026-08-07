-- ShareBin PostgreSQL schema
-- created_at stored as BIGINT milliseconds (zero-cost migration from D1/SQLite)

CREATE TABLE IF NOT EXISTS pastes (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  language TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pastes_created_at ON pastes(created_at);

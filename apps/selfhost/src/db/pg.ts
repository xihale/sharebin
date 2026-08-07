/**
 * PostgreSQL data access layer
 * Replaces D1Database usage with semantic paste CRUD methods
 */

import { Pool } from 'pg'
import { env } from '../env'
import type { PasteRow } from '../types'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10, // connection pool size
})

/** Fetch a single paste by ID, or null if not found */
export async function getPasteById(id: string): Promise<PasteRow | null> {
  const res = await pool.query('SELECT * FROM pastes WHERE id = $1', [id])
  const row = res.rows[0] as (PasteRow & { created_at: unknown }) | undefined
  if (!row) return null
  // pg returns BIGINT as a string; coerce to number to match the PasteRow type
  return { ...row, created_at: Number(row.created_at) }
}

/** Insert a new paste. Throws pg error code '23505' on unique constraint (ID collision). */
export async function insertPaste(p: {
  id: string
  content: string
  type: 'code' | 'url'
  language: string | null
  created_at: number
}): Promise<void> {
  await pool.query(
    'INSERT INTO pastes (id, content, type, language, created_at) VALUES ($1, $2, $3, $4, $5)',
    [p.id, p.content, p.type, p.language, p.created_at],
  )
}

/** Delete a paste by ID (lazy deletion / cleanup) */
export async function deletePaste(id: string): Promise<void> {
  await pool.query('DELETE FROM pastes WHERE id = $1', [id])
}

/** Delete all pastes older than the given timestamp. Returns number of deleted rows. */
export async function deleteExpired(olderThan: number): Promise<number> {
  const res = await pool.query('DELETE FROM pastes WHERE created_at < $1', [olderThan])
  return res.rowCount ?? 0
}

/** Close the pool (for graceful shutdown / tests) */
export async function closePool(): Promise<void> {
  await pool.end()
}

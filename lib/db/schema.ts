import "server-only";

import type { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS calls (
  bot_id TEXT PRIMARY KEY,
  recording_id TEXT UNIQUE,
  platform TEXT,
  meeting_id TEXT,
  joined_at TEXT,
  bot_status TEXT,
  processing_state TEXT NOT NULL,
  error TEXT,
  segment_count INTEGER NOT NULL DEFAULT 0,
  ticket_generation_state TEXT NOT NULL DEFAULT 'not_generated',
  ticket_generation_error TEXT,
  ticket_generation_model TEXT,
  ticket_generated_at TEXT,
  openrouter_response_id TEXT,
  openrouter_prompt_tokens INTEGER,
  openrouter_completion_tokens INTEGER,
  openrouter_total_tokens INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transcript_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT NOT NULL REFERENCES calls(bot_id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  speaker TEXT NOT NULL,
  start_seconds REAL,
  end_seconds REAL,
  text TEXT NOT NULL,
  UNIQUE (bot_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_calls_joined_at ON calls (joined_at DESC);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT NOT NULL REFERENCES calls(bot_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('bug', 'feature', 'task')),
  priority TEXT NOT NULL CHECK (priority IN ('p0', 'p1', 'p2')),
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  missing_evidence TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'approved')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, bot_id)
);

CREATE TABLE IF NOT EXISTS ticket_evidence (
  ticket_id INTEGER NOT NULL,
  bot_id TEXT NOT NULL,
  segment_sequence INTEGER NOT NULL,
  PRIMARY KEY (ticket_id, segment_sequence),
  FOREIGN KEY (ticket_id, bot_id) REFERENCES tickets(id, bot_id) ON DELETE CASCADE,
  FOREIGN KEY (bot_id, segment_sequence)
    REFERENCES transcript_segments(bot_id, sequence) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tickets_bot_status ON tickets (bot_id, status);
`;

const CALL_GENERATION_COLUMNS = [
  "ticket_generation_state TEXT NOT NULL DEFAULT 'not_generated'",
  "ticket_generation_error TEXT",
  "ticket_generation_model TEXT",
  "ticket_generated_at TEXT",
  "openrouter_response_id TEXT",
  "openrouter_prompt_tokens INTEGER",
  "openrouter_completion_tokens INTEGER",
  "openrouter_total_tokens INTEGER",
] as const;

function migrateCallGenerationColumns(db: DatabaseSync): void {
  const existing = new Set(
    (
      db.prepare("PRAGMA table_info(calls)").all() as unknown as {
        name: string;
      }[]
    ).map((column) => column.name),
  );

  for (const definition of CALL_GENERATION_COLUMNS) {
    const name = definition.slice(0, definition.indexOf(" "));
    if (!existing.has(name)) {
      db.exec(`ALTER TABLE calls ADD COLUMN ${definition}`);
    }
  }
}

export function initializeDatabase(db: DatabaseSync): void {
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  migrateCallGenerationColumns(db);
}

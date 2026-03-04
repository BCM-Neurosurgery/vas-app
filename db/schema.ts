export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS patients (
  uuid TEXT PRIMARY KEY,
  emu_id TEXT NOT NULL UNIQUE,
  latest INTEGER NOT NULL DEFAULT 0,
  updated_at_utc TEXT NOT NULL,
  deleted_at_utc TEXT
);

CREATE INDEX IF NOT EXISTS idx_patients_latest ON patients(latest);

CREATE TABLE IF NOT EXISTS simple_interviews (
  uuid TEXT PRIMARY KEY,
  patient_uuid TEXT NOT NULL,
  mood_rating INTEGER NOT NULL,
  energy_rating INTEGER NOT NULL,
  pain_rating INTEGER NOT NULL,
  task_name TEXT NOT NULL,
  timestamp_start_utc TEXT NOT NULL,
  timestamp_save_utc TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL,
  deleted_at_utc TEXT,

  FOREIGN KEY(patient_uuid) REFERENCES patients(uuid)
);

CREATE INDEX IF NOT EXISTS idx_interviews_patient_uuid ON simple_interviews(patient_uuid);
CREATE INDEX IF NOT EXISTS idx_interviews_start ON simple_interviews(timestamp_start_utc);

CREATE TABLE IF NOT EXISTS outbox (
  op_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_uuid TEXT NOT NULL,
  op_type TEXT NOT NULL,
  scope_patient_uuid TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at_ms INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  acked_at_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_outbox_ready ON outbox(acked_at_ms, next_attempt_at_ms, created_at_ms);

CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
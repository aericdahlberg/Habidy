-- tool_logs was originally designed for session-level logging (model, turn_count, etc.)
-- The agentGuard layer writes per-tool-call rows with a different shape.
-- Add the missing columns so all logging actually lands in the DB.

alter table public.tool_logs
  add column if not exists tool_name   text,
  add column if not exists input       jsonb,
  add column if not exists output      jsonb,
  add column if not exists success     boolean,
  add column if not exists error       text,
  add column if not exists duration_ms integer;
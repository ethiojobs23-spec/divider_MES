-- Migration: add dispatch logs table
-- Run this in Supabase SQL editor or via supabase db push

CREATE TABLE IF NOT EXISTS mes_dispatch_logs (
  id               bigserial PRIMARY KEY,
  created_at       timestamptz NOT NULL DEFAULT now(),
  production_week  text        NOT NULL,
  dispatch_date    date        NOT NULL DEFAULT CURRENT_DATE,
  divider_type     text        NOT NULL,
  client_name      text        NOT NULL,
  quantity         integer     NOT NULL DEFAULT 0,
  dispatched_by    text,
  notes            text
);

-- RLS: allow all authenticated and anon reads/writes (adjust as needed)
ALTER TABLE mes_dispatch_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on dispatch_logs" ON mes_dispatch_logs
  FOR ALL USING (true) WITH CHECK (true);

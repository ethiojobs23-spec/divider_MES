-- ============================================================
-- MES Supabase Migration: Attendance Realtime & Live Sync
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Ensure Replica Identity is FULL so updates include old/new values
ALTER TABLE IF EXISTS mes_attendance REPLICA IDENTITY FULL;

-- 2. Ensure Row Level Security allows all access for anon PIN-based tablets
ALTER TABLE mes_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access for anon" ON mes_attendance;
CREATE POLICY "Allow all access for anon" ON mes_attendance FOR ALL USING (true);

-- 3. Add mes_attendance to Supabase Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'mes_attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mes_attendance;
  END IF;
END $$;

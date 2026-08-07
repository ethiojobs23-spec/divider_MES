ALTER TABLE mes_production_logs ADD COLUMN IF NOT EXISTS is_overtime BOOLEAN DEFAULT FALSE;
NOTIFY pgrst, 'reload schema';

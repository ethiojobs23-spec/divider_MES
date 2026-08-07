ALTER TABLE mes_production_logs ADD COLUMN IF NOT EXISTS logged_by_admin BOOLEAN DEFAULT FALSE;
NOTIFY pgrst, 'reload schema';

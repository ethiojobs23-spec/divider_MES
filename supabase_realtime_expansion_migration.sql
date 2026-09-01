-- ============================================================================
-- MES Supabase Realtime & Replication Migration
-- Based on schema from database.md
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ============================================================================

-- 1. Enable Full Replica Identity so UPDATE and DELETE events send old record state
ALTER TABLE IF EXISTS mes_operators         REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS mes_inventory         REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS mes_production_logs   REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS mes_financial_ledger REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS mes_downtime_logs     REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS mes_attendance        REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS mes_loans             REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS mes_dispatch_logs     REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS mes_bonuses           REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS mes_customers         REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS mes_qc_defects        REPLICA IDENTITY FULL;

-- 2. Safely add all 11 MES tables to the `supabase_realtime` publication (Idempotent)
DO $$
DECLARE
    tbl TEXT;
    target_tables TEXT[] := ARRAY[
        'mes_operators',
        'mes_inventory',
        'mes_production_logs',
        'mes_financial_ledger',
        'mes_downtime_logs',
        'mes_attendance',
        'mes_loans',
        'mes_dispatch_logs',
        'mes_bonuses',
        'mes_customers',
        'mes_qc_defects'
    ];
BEGIN
    FOREACH tbl IN ARRAY target_tables
    LOOP
        -- Check if the table is already in the publication
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND schemaname = 'public' 
              AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
            RAISE NOTICE 'Added % to supabase_realtime publication.', tbl;
        ELSE
            RAISE NOTICE '% is already in supabase_realtime publication. Skipping.', tbl;
        END IF;
    END LOOP;
END $$;

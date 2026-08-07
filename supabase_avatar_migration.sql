-- 1. Alter mes_operators to add new profile fields and widen the avatar column to hold a URL
ALTER TABLE mes_operators
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS dob DATE;

-- Change avatar column from VARCHAR(10) to TEXT to store image URLs
ALTER TABLE mes_operators ALTER COLUMN avatar TYPE TEXT;

-- 2. Create Storage Bucket for Avatars (if using Supabase Storage)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up basic access policies for the avatars bucket
CREATE POLICY "Avatar images are publicly accessible." 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can upload an avatar." 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can update their avatar." 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'avatars' );


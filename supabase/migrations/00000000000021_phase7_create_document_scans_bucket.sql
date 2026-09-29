-- Phase 7 Bug Fix: document-scans storage bucket did not exist
--
-- UploadPage.tsx uploads files to supabase.storage.from('document-scans'),
-- but no bucket with that name was ever created — causing
-- "Upload failed: Bucket not found" on every upload attempt.
--
-- This migration creates the bucket (private, not publicly readable)
-- and the storage policies needed for authenticated users to upload
-- and read their own/scoped documents.

-- Create the bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-scans', 'document-scans', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'document-scans');

-- Allow authenticated users to view/download documents
-- (needed for Admin Queue review and the AI pipeline to fetch the file)
CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'document-scans');

-- Allow authenticated users to delete their own uploaded documents (optional cleanup)
CREATE POLICY "Authenticated users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'document-scans' AND owner = auth.uid());

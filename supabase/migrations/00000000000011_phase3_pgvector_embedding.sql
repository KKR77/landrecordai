-- Phase 3: Add pgvector support for near-duplicate detection
-- Stores OCR text embeddings for similarity search

-- Add embedding column to uploads (for near-duplicate detection)
ALTER TABLE public.uploads 
ADD COLUMN IF NOT EXISTS text_embedding vector(384);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_uploads_text_embedding 
  ON public.uploads 
  USING ivfflat (text_embedding vector_cosine_ops)
  WITH (lists = 100);

-- Note: The ivfflat index requires at least some rows to be present.
-- For new tables, you may need to run:
-- REINDEX INDEX idx_uploads_text_embedding;
-- after inserting initial data.

COMMENT ON COLUMN public.uploads.text_embedding IS 
  '384-dimensional embedding of OCR text for near-duplicate detection via cosine similarity';

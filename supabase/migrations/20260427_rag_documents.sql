-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Store embedded chunks from Atomic Habits
CREATE TABLE IF NOT EXISTS rag_documents (
  id bigserial PRIMARY KEY,
  content text NOT NULL,
  embedding vector(1024),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx
  ON rag_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- Function agents call to find relevant chunks given a query embedding
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1024),
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rag_documents.id,
    rag_documents.content,
    rag_documents.metadata,
    1 - (rag_documents.embedding <=> query_embedding) AS similarity
  FROM rag_documents
  WHERE 1 - (rag_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY rag_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

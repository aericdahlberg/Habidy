import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const PDF_PATH = '/Users/howardhuntermckeon/Desktop/Product Management/attomic habbits.pdf'
const VOYAGE_MODEL = 'voyage-3'
const CHUNK_SIZE = 1500
const CHUNK_OVERLAP = 150
const BATCH_SIZE = 50

// ── Validation ────────────────────────────────────────────────────────────────

if (!VOYAGE_API_KEY || VOYAGE_API_KEY === 'placeholder') {
  console.error('ERROR: VOYAGE_API_KEY is not set in .env.local')
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Supabase env vars are not set in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractTextFromPdf(pdfPath: string): string {
  console.log('Extracting text from PDF...')
  const text = execSync(`pdftotext "${pdfPath}" -`, { maxBuffer: 50 * 1024 * 1024 }).toString()
  console.log(`Extracted ${text.length} characters`)
  return text
}

function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = start + CHUNK_SIZE
    const chunk = text.slice(start, end).trim()
    if (chunk.length > 100) chunks.push(chunk)
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }

  console.log(`Split into ${chunks.length} chunks`)
  return chunks
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: texts, model: VOYAGE_MODEL }),
  })

  if (response.status === 402) {
    console.error('ERROR: Voyage AI billing limit reached. No charges will be made beyond free tier.')
    process.exit(1)
  }

  if (response.status === 429) {
    console.error('ERROR: Voyage AI rate limit hit. Wait a moment and try again.')
    process.exit(1)
  }

  if (!response.ok) {
    const error = await response.text()
    console.error(`ERROR: Voyage AI request failed (${response.status}): ${error}`)
    process.exit(1)
  }

  const data = await response.json() as { data: { embedding: number[] }[] }
  return data.data.map((d) => d.embedding)
}

async function insertChunks(chunks: string[], embeddings: number[][]): Promise<void> {
  const rows = chunks.map((content, i) => ({
    content,
    embedding: JSON.stringify(embeddings[i]),
    metadata: { chunk_index: i, source: 'atomic_habits' },
  }))

  const { error } = await supabase.from('rag_documents').insert(rows)
  if (error) {
    console.error('ERROR: Failed to insert into Supabase:', error.message)
    process.exit(1)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Starting RAG ingestion for Atomic Habits...\n')

  const text = extractTextFromPdf(PDF_PATH)
  const chunks = chunkText(text)

  console.log('Embedding chunks with Voyage AI...')
  let totalInserted = 0

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const embeddings = await embedBatch(batch)
    await insertChunks(batch, embeddings)
    totalInserted += batch.length
    console.log(`  Inserted ${totalInserted}/${chunks.length} chunks`)
  }

  console.log(`\nDone. ${totalInserted} chunks loaded into Supabase.`)
}

main()

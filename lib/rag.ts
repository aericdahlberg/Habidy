import { adminClient } from './supabase'

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY
const VOYAGE_MODEL = 'voyage-3'
const DEFAULT_MATCH_COUNT = 5
const DEFAULT_MATCH_THRESHOLD = 0.5

async function embedQuery(text: string): Promise<number[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: [text], model: VOYAGE_MODEL }),
  })

  if (response.status === 402) throw new Error('Voyage AI billing limit reached')
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Voyage AI embedding failed (${response.status}): ${error}`)
  }

  const data = await response.json() as { data: { embedding: number[] }[] }
  return data.data[0].embedding
}

export async function retrieveRelevantChunks(
  query: string,
  matchCount = DEFAULT_MATCH_COUNT,
): Promise<string[]> {
  const embedding = await embedQuery(query)

  const { data, error } = await adminClient().rpc('match_documents', {
    query_embedding: embedding,
    match_count: matchCount,
    match_threshold: DEFAULT_MATCH_THRESHOLD,
  })

  if (error) throw new Error(`RAG retrieval failed: ${error.message}`)

  return (data ?? []).map((row: { content: string }) => row.content)
}

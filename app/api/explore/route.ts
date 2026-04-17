import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { callClaude, resolveModel } from '@/lib/claude'
import { agentGuard } from '@/lib/agentGuard'

// Swap model by setting AGENT_MODEL in .env.local, or override here for this agent only.
// Supported: claude-opus-4-5 | claude-sonnet-4-5 | claude-haiku-4-5-20251001
//            gpt-4o | gpt-4o-mini | o3-mini
const AGENT_MODEL = resolveModel()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Bypasses RLS — used for aggregating all reflections and upserting the summary
function adminClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey,
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, content } = body as { userId?: string; content?: string }

    if (!userId || !content?.trim()) {
      return NextResponse.json({ error: 'userId and content are required' }, { status: 400 })
    }

    // Authenticated server client — uses the user's session cookie so the
    // insert satisfies the RLS policy "users can insert own reflections".
    let supabaseResponse = NextResponse.next({ request: req })
    const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cs) => {
          cs.forEach(({ name, value }) => req.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: req })
          cs.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    // 1. Save the reflection (authenticated — satisfies RLS)
    const { data: reflection, error: insertError } = await agentGuard({
      agentName: 'explore',
      toolName: 'insertReflection',
      input: { userId, contentLength: content.length },
      userId,
      fn: () =>
        authClient
          .from('user_reflections')
          .insert({ user_id: userId, content: content.trim() })
          .select('id, content, created_at')
          .single(),
    })

    if (insertError) {
      return NextResponse.json({ error: (insertError as Error).message }, { status: 500 })
    }

    // 2. Load all past reflections for this user (admin — aggregates across RLS boundary)
    const { data: allReflections } = await adminClient()
      .from('user_reflections')
      .select('content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    // 3. Load current profile summary (may be null on first reflection)
    const { data: existingCtx } = await adminClient()
      .from('user_profile_context')
      .select('summary')
      .eq('user_id', userId)
      .maybeSingle()

    // 4. Ask Claude to produce an updated profile summary
    const reflectionsList = (allReflections ?? [])
      .map((r, i) => `[${i + 1}] ${r.content}`)
      .join('\n\n')

    const systemPrompt = `You are a thoughtful habit coach building a concise, evolving profile of a person based on their self-reflections.

Your goal: distill the reflections into a 2–3 sentence profile that captures how this person works and lives, what they want to grow or change, and any recurring patterns or friction they mention.

Write in third person (e.g. "This person tends to..."). Be specific and insightful — not generic. Do not include filler phrases like "Based on their reflections...".

${existingCtx?.summary ? `Previous profile summary:\n"${existingCtx.summary}"\n\nUpdate it using the full set of reflections below.` : 'There is no previous summary. Write one based on the reflections below.'}

Respond with ONLY the updated profile summary — no intro, no explanation, no quotes.`

    const updatedSummary = await agentGuard({
      agentName: 'explore',
      toolName: 'generateProfileSummary',
      input: { userId, reflectionCount: allReflections?.length ?? 0 },
      userId,
      fn: () =>
        callClaude({
          systemPrompt,
          messages: [{ role: 'user', content: reflectionsList }],
          maxTokens: 300,
          model: AGENT_MODEL,
        }),
    })

    // 5. Upsert the profile context (admin — writes across RLS boundary)
    await adminClient()
      .from('user_profile_context')
      .upsert(
        { user_id: userId, summary: updatedSummary, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )

    return NextResponse.json({
      reflection,
      summary: updatedSummary,
    })
  } catch (err) {
    console.error('[POST /api/explore]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

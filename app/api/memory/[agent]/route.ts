import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'

const supabase = adminClient()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agent: string }> }
) {
  const { agent } = await params
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('conversation_memory')
    .select('*')
    .eq('user_id', userId)
    .eq('agent', agent)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ memory: data ?? null })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agent: string }> }
) {
  try {
    const { agent } = await params
    const body = await req.json()
    const { user_id, summary } = body

    if (!user_id || !summary) {
      return NextResponse.json({ error: 'user_id and summary required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('conversation_memory')
      .insert({ user_id, agent, summary })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ memory: data })
  } catch (err) {
    console.error(`[POST /api/memory/[agent]]`, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

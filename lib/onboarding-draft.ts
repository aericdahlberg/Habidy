import { supabase } from '@/lib/supabase'

export type OnboardingDraft = {
  step: string
  profile?: Record<string, unknown> | null
  identity?: string | null
  questionnaire?: Record<string, unknown> | null
  questionnaire_page?: number
}

export async function loadDraft(userId: string): Promise<OnboardingDraft | null> {
  try {
    const { data } = await supabase
      .from('onboarding_drafts')
      .select('step, profile, identity, questionnaire, questionnaire_page')
      .eq('user_id', userId)
      .maybeSingle()
    return data as OnboardingDraft | null
  } catch {
    return null
  }
}

export function saveDraft(userId: string, data: Partial<OnboardingDraft> & { step: string }): void {
  void supabase
    .from('onboarding_drafts')
    .upsert(
      { user_id: userId, ...data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .then(({ error }) => {
      if (error) console.warn('[onboarding-draft] save failed:', error.message)
    })
}

export function deleteDraft(userId: string): void {
  void supabase
    .from('onboarding_drafts')
    .delete()
    .eq('user_id', userId)
    .then(({ error }) => {
      if (error) console.warn('[onboarding-draft] delete failed:', error.message)
    })
}

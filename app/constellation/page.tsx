"use client"

import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import ChatInterface from '@/components/ChatInterface'

export default function ConstellationPage() {
  const router = useRouter()

  function handleHandoff() {
    router.push('/architect')
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-100 px-4 py-4">
        <div className="mx-auto flex max-w-sm items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-zinc-900">Constellation</h1>
            <p className="text-xs text-zinc-400">Your reflective companion</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-sm">
            ✦
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col overflow-hidden">
        <ChatInterface
          agentEndpoint="/api/agents/constellation"
          onHandoff={handleHandoff}
          handoffLabel="Build a habit →"
          initialMessage="Tell me about a day that felt really good recently. What made it that way?"
        />
      </div>

      <div className="h-16 flex-shrink-0" />
      <NavBar />
    </div>
  )
}

"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/constellation', icon: '💬', label: 'Constellation' },
  { href: '/architect', icon: '🔨', label: 'Architect' },
  { href: '/profile', icon: '👤', label: 'Profile' },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-sm items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-colors ${
                active
                  ? 'text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span className={`text-[10px] font-medium ${active ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

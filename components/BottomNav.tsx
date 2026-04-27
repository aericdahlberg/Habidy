'use client'

import { Home, Compass, Bot, Users, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'home',    label: 'Home',    icon: Home,    path: '/dashboard'    },
  { id: 'explore', label: 'Explore', icon: Compass,  path: '/explore'      },
  { id: 'coach',   label: 'Coach',   icon: Bot,      path: '/constellation', useMascot: true },
  { id: 'social',  label: 'Social',  icon: Users,   path: '/social'       },
  { id: 'profile', label: 'Profile', icon: User,    path: '/profile'      },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-100 bg-white/95 backdrop-blur-md shadow-[0_-1px_0_0_rgba(0,0,0,0.04)]">
      <div className="mx-auto flex max-w-md items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path || pathname.startsWith(tab.path + '/')
          return (
            <Link
              key={tab.id}
              href={tab.path}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.useMascot ? (
                <img src="/mascot.png" alt="Coach" className="h-[22px] w-[22px] object-contain" />
              ) : (
                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              )}
              <span className={cn(
                'font-body text-[10px]',
                isActive ? 'font-bold' : 'font-medium'
              )}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

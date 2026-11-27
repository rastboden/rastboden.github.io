import { ArrowLeftRight, Blocks, ChartColumn, Settings, Users, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

type NavKey = 'loans' | 'toys' | 'children' | 'statistics' | 'settings'

const navItems: { to: string; key: NavKey; icon: LucideIcon }[] = [
  { to: '/', key: 'loans', icon: ArrowLeftRight },
  { to: '/toys', key: 'toys', icon: Blocks },
  { to: '/children', key: 'children', icon: Users },
  { to: '/statistics', key: 'statistics', icon: ChartColumn },
  { to: '/settings', key: 'settings', icon: Settings },
]

export function AppLayout() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <main className="flex-1 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-24">
        <Outlet />
      </main>
      <nav
        aria-label={t('app.name')}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {navItems.map(({ to, key, icon: Icon }) => (
            <li key={key}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    // 11px keeps the longest label ("Inställningar") whole on a 375px wide phone.
                    'flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem]',
                    isActive ? 'font-medium text-primary' : 'text-muted-foreground',
                  )
                }
              >
                <Icon aria-hidden className="size-5" />
                <span className="max-w-full truncate">{t(`nav.${key}`)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

import type { ReactNode } from 'react'

type Props = { children: ReactNode; tone?: 'ok' | 'error'; action?: ReactNode }
export function Notice({ children, tone = 'ok', action }: Props) {
  return <div role={tone === 'error' ? 'alert' : undefined} className={`flex items-start justify-between gap-3 rounded-md px-3 py-2 text-sm ${tone === 'error' ? 'bg-brick-soft text-brick' : 'bg-spore-soft text-spore-deep'}`}><span>{children}</span>{action}</div>
}

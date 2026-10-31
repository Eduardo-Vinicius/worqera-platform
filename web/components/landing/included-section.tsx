"use client"

import {
  BarChart3,
  Camera,
  DatabaseBackup,
  HandCoins,
  KanbanSquare,
  MessageCircle,
  Package,
  QrCode,
  Sparkles,
  Star,
  Tv,
  Wallet,
} from "lucide-react"
import { useLanguage } from "@/components/landing/language-provider"

const ICONS = [KanbanSquare, Tv, QrCode, Camera, MessageCircle, HandCoins, Wallet, Package, Star, BarChart3, Sparkles, DatabaseBackup]

/** Everything that comes with the system, in one grid. */
export function IncludedSection() {
  const { t } = useLanguage()

  return (
    <section id="recursos" className="scroll-mt-24 border-t border-[var(--border)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">{t.included.eyebrow}</p>
        <h2 className="lp-display mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          {t.included.title}
        </h2>
        <ul className="mt-10 grid gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
          {t.included.items.map((item, index) => {
            const Icon = ICONS[index] || KanbanSquare
            return (
              <li key={item.title} className="flex gap-3 bg-[var(--surface)] p-5">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
                <span>
                  <span className="block font-semibold text-[var(--ink)]">{item.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-[var(--muted-foreground)]">{item.desc}</span>
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">{t.included.note}</p>
      </div>
    </section>
  )
}

"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, PartyPopper, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { refreshRuntimeConfig, runtimeSnapshot } from "@/lib/runtimeFlags"
import type { PlatformNotice } from "@/lib/apiV1"
import { cn } from "@/lib/utils"

const seenKey = (id: string) => `wq-release-seen:${id}`

const CONFETTI_COLORS = ["#ffffff", "#fde68a", "#a7f3d0", "#c4b5fd", "#fbcfe8", "#99f6e4"]

/** A short burst of paper bits from the top of the card. Re-runs when `burst` changes. */
function Confetti({ burst }: { burst: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const angle = (Math.PI * (i / 21)) + Math.PI
        const dist = 90 + ((i * 37) % 80)
        return {
          left: `${10 + ((i * 41) % 80)}%`,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          size: 5 + (i % 3) * 2,
          style: {
            "--dx": `${Math.cos(angle) * dist * 0.6}px`,
            "--dy": `${-Math.sin(angle) * dist + 60}px`,
            "--rot": `${(i % 2 ? 1 : -1) * (180 + i * 20)}deg`,
            animationDelay: `${(i % 6) * 25}ms`,
          } as CSSProperties,
        }
      }),
    []
  )
  if (!burst) return null
  return (
    <div key={burst} aria-hidden className="pointer-events-none absolute inset-x-0 top-8 z-20 h-0">
      {bits.map((b, i) => (
        <span
          key={i}
          className="wq-confetti-bit absolute block rounded-[2px]"
          style={{ ...b.style, left: b.left, width: b.size, height: b.size * 1.6, background: b.color }}
        />
      ))}
    </div>
  )
}

/**
 * "Novidades" in the center of the screen: a notice published by the Worqera
 * admin with display=modal, shown once per browser, with a step-by-step tour.
 */
export function ReleaseNotesModal() {
  const router = useRouter()
  const [notice, setNotice] = useState<PlatformNotice | null>(null)

  useEffect(() => {
    if (String(localStorage.getItem("role") || "").toLowerCase() === "sector") return
    const pick = () => {
      const list = runtimeSnapshot()?.notices || []
      const next = list.find((n) => n.display === "modal" && !localStorage.getItem(seenKey(n.id)))
      setNotice((current) => current || next || null)
    }
    pick()
    void refreshRuntimeConfig()
    window.addEventListener("wq-runtime-config", pick)
    return () => window.removeEventListener("wq-runtime-config", pick)
  }, [])

  if (!notice) return null
  const close = () => {
    localStorage.setItem(seenKey(notice.id), String(Date.now()))
    setNotice(null)
  }
  return (
    <ReleaseNotesDialog
      notice={notice}
      onClose={close}
      onGo={(href) => {
        close()
        if (href) router.push(href)
      }}
    />
  )
}

/** The card itself. Also used by the Worqera admin to preview a notice before publishing. */
export function ReleaseNotesDialog({
  notice,
  onClose,
  onGo,
}: {
  notice: Pick<PlatformNotice, "title" | "body"> & { steps?: PlatformNotice["steps"] }
  onClose: () => void
  onGo: (href: string) => void
}) {
  const [step, setStep] = useState(0)
  const [burst, setBurst] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setBurst(1), 220)
    return () => clearTimeout(t)
  }, [])

  const steps = notice.steps || []
  const total = steps.length
  // step 0 = cover; 1..total = tour steps
  const current = step > 0 ? steps[step - 1] : null
  const last = step === total
  const progress = total ? Math.round((step / total) * 100) : 100
  const close = onClose
  const go = onGo

  const next = () => {
    const n = step + 1
    setStep(n)
    if (n === total) setBurst((b) => b + 1)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[3px] animate-in fade-in duration-300"
      onClick={close}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[var(--wq-surface)] text-[var(--wq-text)] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.6)] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Novidades"
      >
        <Confetti burst={burst} />
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 z-30 rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="wq-release-hero relative overflow-hidden bg-[linear-gradient(120deg,var(--wq-brand-deep),var(--wq-brand),color-mix(in_srgb,var(--wq-action)_75%,var(--wq-brand)),var(--wq-brand-deep))] px-6 pb-7 pt-7 text-white">
          <span aria-hidden className="wq-release-orb absolute -left-10 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <span
            aria-hidden
            className="wq-release-orb absolute -bottom-16 right-0 h-48 w-48 rounded-full bg-[color-mix(in_srgb,var(--wq-action)_60%,white)]/25 blur-3xl"
            style={{ animationDelay: "-3s" }}
          />
          <p className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ring-1 ring-white/20 wq-shine">
            {last && total ? <PartyPopper className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5 animate-pulse" />}
            Novidades
            {total ? <span className="tabular-nums">· {step === 0 ? "início" : `${step} de ${total}`}</span> : null}
          </p>
          <h2
            key={`title-${step}`}
            className="relative mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-500 sm:text-[27px]"
          >
            {current ? current.title : notice.title}
          </h2>
          {current ? (
            <span className="relative mt-3 inline-flex h-1 w-16 overflow-hidden rounded-full bg-white/25">
              <span className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} />
            </span>
          ) : null}
        </div>

        <div key={`body-${step}`} className="min-h-[170px] px-6 py-5 animate-in fade-in slide-in-from-right-3 duration-300">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-[var(--wq-text)]">{current ? current.body : notice.body}</p>
          {step === 0 && total > 0 ? (
            <ol className="mt-4 space-y-1.5">
              {steps.map((s, i) => (
                <li
                  key={i}
                  className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
                  style={{ animationDelay: `${150 + i * 80}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => setStep(i + 1)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-[var(--wq-border)] px-3 py-2 text-left text-sm transition hover:-translate-y-0.5 hover:border-[var(--wq-brand)]/40 hover:bg-[var(--wq-paper)] hover:shadow-sm"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--wq-brand-soft)] text-xs font-bold text-[var(--wq-brand)] transition group-hover:bg-[var(--wq-brand)] group-hover:text-white">
                      {i + 1}
                    </span>
                    <span className="flex-1 font-medium">{s.title}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[var(--wq-text-muted)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
          {current?.href ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-[10px] border-[var(--wq-brand)]/40 text-[var(--wq-brand)] hover:bg-[var(--wq-brand-soft)]"
              onClick={() => go(current.href)}
            >
              {current.cta || "Ver agora"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : null}
          {last && total ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 animate-in fade-in zoom-in-95 duration-500 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Check className="h-4 w-4" /> Tudo pronto. Já está no ar para a sua equipe.
            </p>
          ) : null}
        </div>

        <div className="relative border-t border-[var(--wq-border)]">
          <span
            aria-hidden
            className="absolute left-0 top-0 h-0.5 bg-[linear-gradient(90deg,var(--wq-brand),var(--wq-action))] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
          <div className="flex items-center justify-between gap-3 px-6 py-4">
            <div className="flex gap-1.5">
              {[0, ...steps.map((_, i) => i + 1)].map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={i === 0 ? "Início" : `Passo ${i}`}
                  onClick={() => setStep(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step ? "w-6 bg-[var(--wq-brand)]" : i < step ? "w-1.5 bg-[var(--wq-brand)]/50" : "w-1.5 bg-[var(--wq-border)]"
                  )}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {step > 0 ? (
                <Button type="button" variant="ghost" className="rounded-[10px]" onClick={() => setStep((s) => s - 1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
                </Button>
              ) : (
                <Button type="button" variant="ghost" className="rounded-[10px] text-[var(--wq-text-muted)]" onClick={close}>
                  Depois
                </Button>
              )}
              {step < total ? (
                <Button
                  type="button"
                  className="relative overflow-hidden rounded-[10px] bg-[var(--wq-brand)] text-white hover:bg-[var(--wq-brand-deep)] wq-shine"
                  onClick={next}
                >
                  {step === 0 ? "Fazer o tour" : "Próximo"} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" className="rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90" onClick={close}>
                  Bora usar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

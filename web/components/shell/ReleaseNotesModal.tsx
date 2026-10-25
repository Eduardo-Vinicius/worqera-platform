"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { refreshRuntimeConfig, runtimeSnapshot } from "@/lib/runtimeFlags"
import type { PlatformNotice } from "@/lib/apiV1"
import { cn } from "@/lib/utils"

const seenKey = (id: string) => `wq-release-seen:${id}`

/**
 * "Novidades" in the center of the screen: a notice published by the Worqera
 * admin with display=modal, shown once per browser, with a step-by-step tour.
 */
export function ReleaseNotesModal() {
  const router = useRouter()
  const [notice, setNotice] = useState<PlatformNotice | null>(null)
  const [step, setStep] = useState(0)

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
  const steps = notice.steps || []
  const total = steps.length
  // step 0 = cover; 1..total = tour steps
  const current = step > 0 ? steps[step - 1] : null

  const close = () => {
    localStorage.setItem(seenKey(notice.id), String(Date.now()))
    setNotice(null)
    setStep(0)
  }

  const go = (href: string) => {
    close()
    if (href) router.push(href)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]" onClick={close}>
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--wq-border)] bg-[var(--wq-surface)] text-[var(--wq-text)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Novidades"
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="bg-[linear-gradient(135deg,var(--wq-brand-deep),var(--wq-brand)_55%,color-mix(in_srgb,var(--wq-action)_70%,var(--wq-brand)))] px-6 pb-6 pt-7 text-white">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
            <Sparkles className="h-3.5 w-3.5" />
            Novidades
            {total ? <span className="tabular-nums">· {step === 0 ? "início" : `${step} de ${total}`}</span> : null}
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight tracking-tight sm:text-[26px]">
            {current ? current.title : notice.title}
          </h2>
        </div>

        <div className="min-h-[150px] px-6 py-5">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-[var(--wq-text)]">
            {current ? current.body : notice.body}
          </p>
          {step === 0 && total > 0 ? (
            <ol className="mt-4 space-y-1.5">
              {steps.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setStep(i + 1)}
                    className="flex w-full items-center gap-3 rounded-xl border border-[var(--wq-border)] px-3 py-2 text-left text-sm hover:border-[var(--wq-brand)]/40 hover:bg-[var(--wq-paper)]"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--wq-brand-soft)] text-xs font-bold text-[var(--wq-brand)]">
                      {i + 1}
                    </span>
                    <span className="font-medium">{s.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
          {current?.href ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-[10px] border-[var(--wq-brand)]/40 text-[var(--wq-brand)]"
              onClick={() => go(current.href)}
            >
              {current.cta || "Ver agora"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--wq-border)] px-6 py-4">
          <div className="flex gap-1.5">
            {[0, ...steps.map((_, i) => i + 1)].map((i) => (
              <span
                key={i}
                className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-[var(--wq-brand)]" : "w-1.5 bg-[var(--wq-border)]")}
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
                className="rounded-[10px] bg-[var(--wq-brand)] text-white hover:bg-[var(--wq-brand-deep)]"
                onClick={() => setStep((s) => s + 1)}
              >
                {step === 0 ? "Fazer o tour" : "Próximo"} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" className="rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90" onClick={close}>
                Entendi
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

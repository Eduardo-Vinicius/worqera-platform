"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { ArrowRight } from "lucide-react"

function KanbanMock({ pt }: { pt: boolean }) {
  const cols = pt
    ? [
        {
          name: "Recepção",
          color: "#8b5cf6",
          cards: [
            { code: "3201-26", client: "Maria S.", meta: "2 pares" },
            { code: "3204-26", client: "João P.", meta: "Prioridade" },
          ],
        },
        {
          name: "Oficina",
          color: "#6366f1",
          cards: [
            { code: "3198-26", client: "Ana L.", meta: "Cola + solado" },
            { code: "3195-26", client: "Carlos M.", meta: "Em andamento" },
          ],
        },
        {
          name: "Entrega",
          color: "#22c55e",
          cards: [{ code: "3188-26", client: "Paula R.", meta: "Pronto" }],
        },
      ]
    : [
        {
          name: "Intake",
          color: "#8b5cf6",
          cards: [
            { code: "3201-26", client: "Maria S.", meta: "2 pairs" },
            { code: "3204-26", client: "John P.", meta: "Priority" },
          ],
        },
        {
          name: "Workshop",
          color: "#6366f1",
          cards: [
            { code: "3198-26", client: "Ana L.", meta: "In progress" },
            { code: "3195-26", client: "Carlos M.", meta: "Sole" },
          ],
        },
        {
          name: "Ready",
          color: "#22c55e",
          cards: [{ code: "3188-26", client: "Paula R.", meta: "Done" }],
        },
      ]

  return (
    <div className="lp-float relative mx-auto w-full max-w-xl lg:max-w-none">
      <div className="absolute -inset-4 rounded-[2rem] bg-primary/15 blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-28px_rgba(76,29,149,0.55)]">
        <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 text-xs font-medium text-muted-foreground">
            {pt ? "Kanban · Oficina ao vivo" : "Kanban · Live workshop"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 bg-[var(--mock-bg)] p-3 sm:gap-3 sm:p-4">
          {cols.map((col) => (
            <div key={col.name} className="min-w-0 rounded-xl bg-[var(--mock-col)] p-2 shadow-sm sm:p-2.5">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
                <span className="truncate text-[10px] font-semibold tracking-wide text-foreground uppercase sm:text-[11px]">
                  {col.name}
                </span>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                {col.cards.map((card) => (
                  <div
                    key={card.code}
                    className="rounded-lg border border-border/80 bg-card px-2 py-1.5 sm:px-2.5 sm:py-2"
                  >
                    <div className="text-[11px] font-semibold text-foreground sm:text-xs">{card.code}</div>
                    <div className="truncate text-[10px] text-muted-foreground sm:text-[11px]">{card.client}</div>
                    <div className="mt-0.5 text-[9px] text-primary/90 sm:text-[10px]">{card.meta}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function HeroSection() {
  const { locale } = useLanguage()
  const pt = locale === "pt"

  return (
    <section className="relative flex min-h-[100dvh] items-center overflow-hidden pb-12 pt-20 sm:pb-16 sm:pt-24 lg:pb-20 lg:pt-28">
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12 xl:gap-16">
          <div className="lp-animate-in text-center lg:text-left">
            <p className="lp-brand mb-4 text-sm font-semibold tracking-[0.22em] text-primary uppercase">
              Worqera
            </p>

            <h1 className="lp-brand mb-4 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl xl:text-[3.35rem]">
              {pt ? (
                <>
                  Pedidos sob controle.
                  <span className="mt-1 block text-primary">Da recepção à entrega.</span>
                </>
              ) : (
                <>
                  Orders under control.
                  <span className="mt-1 block text-primary">From intake to pickup.</span>
                </>
              )}
            </h1>

            <p className="mx-auto mb-8 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              {pt
                ? "Kanban por setores, rastreio para o cliente e equipe alinhada. Em minutos você vê a oficina inteira — e para de perder pedido."
                : "Sector kanban, customer tracking, and an aligned team. See your whole workshop in minutes — and stop losing orders."}
            </p>

            <div className="mb-3 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
              <Button
                asChild
                size="lg"
                className="glow-primary h-12 rounded-xl bg-primary px-8 text-base font-medium text-primary-foreground hover:bg-secondary"
              >
                <Link href="/signup">
                  {pt ? "Testar grátis por 7 dias" : "Try free for 7 days"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-xl border-border bg-card px-8 text-base font-medium text-foreground hover:border-primary/30 hover:bg-muted/60"
              >
                <Link href="/login">{pt ? "Já tenho conta" : "I have an account"}</Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground sm:text-sm">
              {pt
                ? "Sem cartão · Setup em minutos · Cancele quando quiser"
                : "No card · Setup in minutes · Cancel anytime"}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground lg:justify-start">
              {(pt
                ? ["Usabilidade simples", "Pagamento seguro", "Feito para oficinas"]
                : ["Simple to use", "Secure payments", "Built for workshops"]
              ).map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="lp-animate-in-delay">
            <KanbanMock pt={pt} />
          </div>
        </div>
      </div>
    </section>
  )
}

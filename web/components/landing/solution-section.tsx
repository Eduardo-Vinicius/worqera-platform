"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { ArrowRight, Eye, LayoutGrid, ShieldCheck, Sparkles, Users } from "lucide-react"

const BENEFITS = [
  {
    icon: LayoutGrid,
    pt: {
      title: "Kanban que a equipe entende",
      desc: "Cada setor é uma coluna. Arraste o pedido e todo mundo sabe o que fazer agora.",
    },
    en: {
      title: "A kanban your team gets",
      desc: "Each sector is a column. Move the order and everyone knows what to do next.",
    },
  },
  {
    icon: Eye,
    pt: {
      title: "Cliente sem ficar no escuro",
      desc: "Consulta pública do status — menos ligação, menos WhatsApp, mais confiança.",
    },
    en: {
      title: "Customers stay informed",
      desc: "Public status lookup — fewer calls, less WhatsApp, more trust.",
    },
  },
  {
    icon: Users,
    pt: {
      title: "Papéis certos para cada pessoa",
      desc: "Dono vê o crítico. Atendimento e setor vêem só o que precisam. Operação limpa.",
    },
    en: {
      title: "The right role for each person",
      desc: "Owner sees the critical stuff. Front desk and sectors see only what they need.",
    },
  },
  {
    icon: ShieldCheck,
    pt: {
      title: "Qualidade de produto SaaS",
      desc: "Rápido, estável e pensado para o dia a dia da oficina — não uma planilha disfarçada.",
    },
    en: {
      title: "Real SaaS product quality",
      desc: "Fast, stable, built for workshop days — not a spreadsheet in disguise.",
    },
  },
]

export function SolutionSection() {
  const { locale } = useLanguage()
  const pt = locale === "pt"

  return (
    <section id="vantagens" className="relative py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary sm:text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {pt ? "Por que assinar a Worqera" : "Why subscribe to Worqera"}
          </div>
          <h2 className="lp-brand mb-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {pt ? "Clareza que faz a oficina render" : "Clarity that makes the workshop run"}
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            {pt
              ? "Menos caos, mais entrega. Você assina para ter visibilidade, ritmo e uma experiência que a equipe gosta de usar."
              : "Less chaos, more delivery. You subscribe for visibility, pace, and software the team actually enjoys using."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {BENEFITS.map((item) => {
            const copy = pt ? item.pt : item.en
            const Icon = item.icon
            return (
              <div
                key={copy.title}
                className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm transition-colors hover:border-primary/30 sm:p-6"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">{copy.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{copy.desc}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="glow-primary h-11 rounded-xl bg-primary px-7 hover:bg-secondary">
            <Link href="/signup">
              {pt ? "Quero testar agora" : "I want to try now"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

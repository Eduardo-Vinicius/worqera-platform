"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import "@/components/landing/landing.css"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Worqera"
const CHIPS = ["Kanban por setor", "Cliente avisado sozinho", "Pix, boleto ou cartão", "7 dias grátis"]

function BrandMark({
  light = false,
  className = "h-9 w-9",
}: {
  light?: boolean
  className?: string
}) {
  return (
    <Link href="/" className="relative flex items-center gap-2.5">
      <WorqeraLogo className={className} />
      <span className={`lp-display text-lg font-semibold ${light ? "text-white" : "text-[var(--ink)]"}`}>
        {APP_NAME}
      </span>
    </Link>
  )
}

const field =
  "h-11 rounded-lg border-[var(--border)] bg-white text-[var(--ink)] placeholder:text-[var(--muted-foreground)] focus-visible:ring-[var(--primary)]"

/** Split escuro + formulário no papel. Sem aurora, sem mock de kanban. */
export function AuthShell({
  children,
  aside = false,
}: {
  children: ReactNode
  aside?: boolean
}) {
  return (
    <div className="lp min-h-screen bg-[var(--paper)] text-[var(--ink)] antialiased">
      {aside ? (
        <div className="flex min-h-screen">
          <aside
            className="relative hidden overflow-hidden lg:flex lg:w-[44%] xl:w-[40%] shrink-0 flex-col justify-between p-10 xl:p-14"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 12% 18%, rgba(125,38,222,0.22), transparent 62%), #110f17",
            }}
          >
            <BrandMark light className="h-9 w-9" />
            <div className="relative max-w-sm space-y-6">
              <h2 className="lp-display text-4xl font-medium leading-[1.12] tracking-tight text-white xl:text-[2.65rem]">
                Gestão moderna
                <br />
                <span className="text-[#c4a0ff]">para sua empresa.</span>
              </h2>
              <p className="text-[15px] leading-relaxed text-[#9d9da1]">
                Kanban por setores, pedidos, clientes e métricas — um painel para a rotina do dia a dia.
              </p>
              <ul className="flex flex-wrap gap-2">
                {CHIPS.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: "rgba(125,38,222,0.22)", color: "#d4b4ff" }}
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </div>
            <p className="relative text-xs text-[#5c5670]">
              © {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
            </p>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-5 py-12 sm:px-10">
            <div className="mb-8 flex w-full max-w-[400px] lg:hidden">
              <BrandMark />
            </div>
            <div className="w-full max-w-[400px]">{children}</div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
          <BrandMark className="h-9 w-9" />
          <div className="mt-8 w-full max-w-[400px] rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

export { field as authFieldClass }

"use client"

import Link from "next/link"
import { Check, Minus } from "lucide-react"
import { PLAN_ROWS } from "@/components/landing/features-data"
import { PLANS, formatBRL } from "@/lib/plans"

export function PlanMark({ value, pt }: { value: string; pt: boolean }) {
  if (value === "yes") return <Check className="mx-auto h-4 w-4 text-[var(--primary)]" strokeWidth={2.5} aria-label={pt ? "Sim" : "Yes"} />
  if (value === "no") return <Minus className="mx-auto h-4 w-4 text-[var(--muted-foreground)]/50" aria-label={pt ? "Não" : "No"} />
  const [ptText, enText] = value.split("|")
  return <span className="text-xs font-semibold text-[var(--ink)]">{pt ? ptText : enText || ptText}</span>
}

/** Feature-by-plan table, with the plan prices from the catalog. */
export function PlanTable({ pt, highlight = "Pro" }: { pt: boolean; highlight?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left">
            <th className="px-4 py-3 font-semibold text-[var(--muted-foreground)]">{pt ? "Recurso" : "Feature"}</th>
            {PLANS.map((plan) => (
              <th key={plan.code} className={`w-28 px-3 py-3 text-center ${plan.name === highlight ? "bg-[var(--brand-soft)]" : ""}`}>
                <p className="lp-display text-base font-semibold text-[var(--ink)]">{plan.name}</p>
                <p className="text-xs font-normal text-[var(--muted-foreground)]">
                  {formatBRL(plan.monthly)}
                  {pt ? "/mês" : "/mo"}
                </p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PLAN_ROWS.map((row) => (
            <tr key={row.pt} className="border-b border-[var(--border)] last:border-0">
              <td className="px-4 py-3 text-[var(--ink)]">
                {row.href ? (
                  <Link href={`/recursos/${row.href}`} className="hover:text-[var(--primary)] hover:underline">
                    {pt ? row.pt : row.en}
                  </Link>
                ) : pt ? (
                  row.pt
                ) : (
                  row.en
                )}
              </td>
              {[row.basic, row.pro, row.business].map((mark, index) => (
                <td key={index} className={`px-3 py-3 text-center ${PLANS[index]?.name === highlight ? "bg-[var(--brand-soft)]" : ""}`}>
                  <PlanMark value={mark} pt={pt} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

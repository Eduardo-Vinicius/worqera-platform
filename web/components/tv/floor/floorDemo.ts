import type { FloorSector } from "@/lib/tvFloor"

const H = 3_600_000

/** `/tv-dashboard?demo=1`: sample floor to show the shop. No real orders. */
export function demoFloor(now = Date.now()): FloorSector[] {
  const iso = (ms: number) => new Date(now + ms).toISOString()
  const make = (code: string, hours: number, dueIn: number | null, priority: number | null = 2) => ({
    id: code,
    code,
    hoursInSector: hours,
    dueAt: dueIn == null ? null : iso(dueIn),
    priority,
  })
  return [
    { id: "s1", name: "Recebimento", color: "#64748B", count: 3, orders: [make("0701", 0.5, 72 * H), make("0702", 1.2, 96 * H), make("0703", 2, 120 * H)] },
    { id: "s2", name: "Lavagem", color: "#0EA5E9", count: 6, orders: [make("0688", 30, -26 * H), make("0690", 5, 4 * H), make("0692", 3, 30 * H, 1), make("0694", 2, 50 * H), make("0695", 1, 70 * H), make("0697", 0.8, 80 * H)] },
    { id: "s3", name: "Costura", color: "#F97316", count: 4, orders: [make("0684", 12, 2 * H), make("0686", 8, 40 * H, 1), make("0689", 4, 60 * H), make("0693", 2, 72 * H)] },
    { id: "s4", name: "Pintura", color: "#A855F7", count: 2, orders: [make("0685", 50, -6 * H), make("0691", 6, 26 * H)] },
    { id: "s5", name: "Acabamento", color: "#22C55E", count: 3, orders: [make("0680", 3, 3 * H), make("0681", 2, 20 * H), make("0683", 1, 48 * H)] },
    { id: "s6", name: "Pronto", color: "#14B8A6", count: 0, orders: [] },
  ]
}

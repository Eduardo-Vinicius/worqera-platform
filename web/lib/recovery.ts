/** How a refused quote was turned around. Same ids as the API (`RECOVERY_HOW`). */
export type RecoveryHow = "discount" | "deadline" | "new_offer" | "follow_up" | "explained" | "other"

export const RECOVERY_HOWS: Array<{ id: RecoveryHow; label: string }> = [
  { id: "discount", label: "Desconto" },
  { id: "deadline", label: "Prazo melhor" },
  { id: "new_offer", label: "Nova proposta" },
  { id: "follow_up", label: "Insistiu / retornou" },
  { id: "explained", label: "Explicou o serviço" },
  { id: "other", label: "Outro" },
]

export const RECOVERY_HOW_LABEL: Record<string, string> = Object.fromEntries(
  RECOVERY_HOWS.map((h) => [h.id, h.label])
)

export type LaudoNotice = {
  ok?: boolean
  waiting?: boolean
  skipped?: boolean
  reason?: string
  error?: string
  provider?: string
  queued?: boolean
}

export function laudoSaveMessage(prefix: string, notify?: LaudoNotice | null) {
  if (!notify) {
    return { tone: "fail" as const, text: `${prefix} O servidor não confirmou o e-mail.` }
  }
  if (notify.reason === "awaiting-photos" || (notify.waiting && notify.reason === "awaiting-photos")) {
    return { tone: "wait" as const, text: `${prefix} O laudo sai quando as fotos terminarem.` }
  }
  if (notify.reason === "awaiting-price") {
    return { tone: "wait" as const, text: `${prefix} Sem valor, o laudo não saiu.` }
  }
  if (notify.reason === "no-email") {
    return { tone: "fail" as const, text: `${prefix} O cliente não tem e-mail, o laudo não saiu.` }
  }
  if (notify.reason === "email-disabled") {
    return { tone: "fail" as const, text: `${prefix} O e-mail da oficina está desligado.` }
  }
  if (notify.provider === "console" || notify.reason === "smtp-off") {
    return { tone: "fail" as const, text: `${prefix} O servidor está sem SMTP. O laudo não saiu.` }
  }
  if (notify.ok === false || notify.skipped) {
    const extra = notify.error ? ` ${notify.error}` : ""
    return { tone: "fail" as const, text: `${prefix} O laudo não saiu.${extra}` }
  }
  if (notify.queued) {
    return { tone: "wait" as const, text: `${prefix} O laudo entrou na fila de envio.` }
  }
  return { tone: "ok" as const, text: `${prefix} Laudo enviado ao cliente.` }
}

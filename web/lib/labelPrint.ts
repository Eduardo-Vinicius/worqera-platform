import QRCode from "qrcode"
import { buildPublicOrderUrl, withPublicOrderQuery } from "@/lib/publicOrderLink"
import { capitalizeNoun, resolveItemNoun } from "@/lib/itemNoun"

export type LabelSize = "a4" | "50x30" | "60x40" | "62x40" | "100x50"
export type AfterCreate = "ask" | "auto" | "off"

export const LABEL_SIZES: Record<LabelSize, { title: string; hint: string; w: number; h: number }> = {
  "60x40": { title: "Térmica 60 × 40 mm", hint: "A mais comum. Elgin, Zebra, Argox.", w: 60, h: 40 },
  "50x30": { title: "Térmica 50 × 30 mm", hint: "Pequena: código, cliente e QR.", w: 50, h: 30 },
  "100x50": { title: "Térmica 100 × 50 mm", hint: "Grande, letra maior.", w: 100, h: 50 },
  "62x40": { title: "Brother QL · rolo 62 mm", hint: "QL-800, QL-820NWB (imprime também do iPhone).", w: 62, h: 40 },
  a4: { title: "Folha A4", hint: "Impressora comum. Até 8 por folha, para recortar.", w: 90, h: 55 },
}

export type LabelSettings = { size: LabelSize; perItem: boolean }

export function readLabelSettings(shop: any): LabelSettings {
  const raw = shop?.labelSettings || {}
  const size = (Object.keys(LABEL_SIZES) as LabelSize[]).includes(raw.size) ? (raw.size as LabelSize) : "a4"
  return { size, perItem: Boolean(raw.perItem) }
}

const AFTER_CREATE_KEY = "wq-label-after-create"

/** Per device: the counter computer prints, the owner's notebook usually does not. */
export function readAfterCreate(): AfterCreate {
  try {
    const v = localStorage.getItem(AFTER_CREATE_KEY)
    if (v === "auto" || v === "off" || v === "ask") return v
  } catch {}
  return "ask"
}

export function writeAfterCreate(value: AfterCreate) {
  try {
    localStorage.setItem(AFTER_CREATE_KEY, value)
  } catch {}
}

export type LabelJob = {
  brand: string
  code: string
  client: string
  /** Item brand + model (or "2 tênis · …" for the whole order). */
  detail: string
  url: string
  /** Service names, e.g. "Higienização + Pintura da sola". */
  services?: string
  /** "Entrega 12/11". */
  due?: string
}

type OrderLike = {
  code?: string
  publicToken?: string | null
  clientName?: string
  client?: { name?: string; nomeCompleto?: string }
  items?: Array<{ shoeModel?: string; brand?: string; services?: Array<{ name?: string; nome?: string }> }>
  shoeModel?: string
  dueAt?: string | Date | null
}

function itemName(item: { shoeModel?: string; brand?: string }) {
  const brand = String(item.brand || "").trim()
  const model = String(item.shoeModel || "").trim()
  if (brand && model.toLowerCase().startsWith(brand.toLowerCase())) return model
  return [brand, model].filter(Boolean).join(" ")
}

/** First + last name: fits the label and is enough to find the customer. */
function shortName(full: string) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean)
  return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : parts.join(" ")
}

function serviceNames(list: Array<{ services?: Array<{ name?: string; nome?: string }> }>) {
  const names = list.flatMap((i) => (i.services || []).map((s) => String(s.name || s.nome || "").trim())).filter(Boolean)
  return Array.from(new Set(names)).join(" + ")
}

function dueLabel(value: string | Date | null | undefined) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return `Entrega ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })}`
}

function brandOf(shop: any) {
  return String(shop?.branding?.displayName || shop?.name || "").trim()
}

/** One label for the order, or one per item (code-N, model, QR with ?item=N). */
export function buildLabelJobs(order: OrderLike, shop: any, { perItem }: { perItem: boolean }): LabelJob[] {
  if (!order?.code || typeof window === "undefined") return []
  const slug = shop?.slug || localStorage.getItem("shopSlug") || ""
  const url = buildPublicOrderUrl(window.location.origin, slug, order.code, order.publicToken)
  if (!url) return []
  const brand = brandOf(shop)
  const client = shortName(order.clientName || order.client?.nomeCompleto || order.client?.name || "")
  const items = Array.isArray(order.items) && order.items.length ? order.items : [{ shoeModel: order.shoeModel || "" }]
  const noun = resolveItemNoun(shop)
  const due = dueLabel(order.dueAt)
  if (!perItem || items.length < 2) {
    const names = items.map(itemName).filter(Boolean)
    const count = `${items.length} ${items.length === 1 ? noun.singular : noun.plural}`
    const detail = items.length === 1 ? names[0] || count : names.length ? `${count} · ${names.join(", ")}` : count
    return [{ brand, code: order.code, client, detail, services: serviceNames(items), due, url }]
  }
  return items.map((item, index) => ({
    brand,
    code: `${order.code}-${index + 1}`,
    client,
    detail: itemName(item) || `${capitalizeNoun(noun.singular)} ${index + 1}`,
    services: serviceNames([item]),
    due,
    url: withPublicOrderQuery(url, "item", index + 1),
  }))
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)
}

const PT_PER_MM = 2.835

/** Thermal printers are black only; QR and text go out pure black, sized to the roll. */
export async function labelsHtml(jobs: LabelJob[], size: LabelSize): Promise<string> {
  const { w, h } = LABEL_SIZES[size]
  const sheet = size === "a4"
  const pad = sheet ? 4 : 2
  const qr = Math.min(h - pad * 2, w * (sheet ? 0.45 : 0.4))
  const roomy = size !== "50x30"
  const textW = w - pad * 2 - qr - 2
  const scale = h / 40
  const qrs = await Promise.all(
    jobs.map((job) => QRCode.toDataURL(job.url, { margin: 0, width: 480, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#FFFFFF" } }))
  )
  const cards = jobs
    .map((job, i) => {
      const codePt = Math.min(22 * scale, (textW * PT_PER_MM) / (Math.max(job.code.length, 4) * 0.62))
      return `<div class="label">
  <img class="qr" src="${qrs[i]}" alt="" />
  <div class="txt">
    ${job.brand ? `<div class="brand">${escapeHtml(job.brand)}</div>` : ""}
    <div class="code" style="font-size:${codePt.toFixed(1)}pt">${escapeHtml(job.code)}</div>
    ${job.client ? `<div class="client">${escapeHtml(job.client)}</div>` : ""}
    ${job.detail ? `<div class="detail">${escapeHtml(job.detail)}</div>` : ""}
    ${job.services && size !== "50x30" ? `<div class="services">${escapeHtml(job.services)}</div>` : ""}
    ${job.due ? `<div class="due">${escapeHtml(job.due)}</div>` : ""}
  </div>
</div>`
    })
    .join("\n")
  const page = sheet ? "@page { size: A4; margin: 10mm; }" : `@page { size: ${w}mm ${h}mm; margin: 0; }`
  const layout = sheet
    ? `.sheet { display: flex; flex-wrap: wrap; gap: 4mm; } .label { border: 0.3mm dashed #999; break-inside: avoid; }`
    : `.label { break-after: page; } .label:last-child { break-after: auto; }`
  return `<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta</title><style>
${page}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.label { width: ${w}mm; height: ${h}mm; padding: ${pad}mm; display: flex; align-items: center; gap: 2mm; overflow: hidden; }
.qr { width: ${qr}mm; height: ${qr}mm; flex: none; image-rendering: pixelated; }
.txt { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: ${(0.6 * scale).toFixed(2)}mm; }
.txt > div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
${roomy ? ".txt > .detail, .txt > .services { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.15; }" : ""}
.brand { font-size: ${(6 * scale).toFixed(1)}pt; text-transform: uppercase; letter-spacing: 0.08em; }
.code { font-family: "Courier New", Courier, monospace; font-weight: 700; line-height: 1; }
.client { font-size: ${(8.5 * scale).toFixed(1)}pt; font-weight: 700; }
.detail { font-size: ${(7.5 * scale).toFixed(1)}pt; font-weight: 700; }
.services { font-size: ${(6.5 * scale).toFixed(1)}pt; }
.due { font-size: ${(7 * scale).toFixed(1)}pt; font-weight: 700; margin-top: ${(0.4 * scale).toFixed(2)}mm; padding: 0.3mm 1.2mm; border: 0.3mm solid #000; border-radius: 0.8mm; align-self: flex-start; }
${layout}
</style></head><body>${sheet ? `<div class="sheet">${cards}</div>` : cards}</body></html>`
}

/** Prints an HTML document through a hidden iframe: no navigation, no pop-up. */
function printHtml(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe")
    frame.setAttribute("aria-hidden", "true")
    frame.tabIndex = -1
    Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" })
    document.body.appendChild(frame)
    const win = frame.contentWindow
    const doc = frame.contentDocument
    if (!win || !doc) {
      frame.remove()
      reject(new Error("Não foi possível abrir a impressão"))
      return
    }
    doc.open()
    doc.write(html)
    doc.close()
    const cleanup = () => setTimeout(() => frame.remove(), 1000)
    const images = Array.from(doc.images)
    Promise.all(
      images.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r })))
    ).then(() => {
      win.addEventListener("afterprint", cleanup, { once: true })
      setTimeout(cleanup, 120_000)
      win.focus()
      win.print()
      resolve()
    })
  })
}

export async function printLabelJobs(jobs: LabelJob[], size: LabelSize) {
  if (!jobs.length) throw new Error("Pedido sem código para a etiqueta")
  await printHtml(await labelsHtml(jobs, size))
}

/** Order + shop → labels in the shop's size, straight to the print dialog. */
export async function printOrderLabels(order: OrderLike, shop: any, opts?: { perItem?: boolean }) {
  const settings = readLabelSettings(shop)
  const perItem = opts?.perItem ?? settings.perItem
  await printLabelJobs(buildLabelJobs(order, shop, { perItem }), settings.size)
}

/** Prints a PDF (blob URL) through a hidden iframe; falls back to a new tab. */
export function printPdfUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe")
    frame.setAttribute("aria-hidden", "true")
    Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "1px", height: "1px", border: "0", opacity: "0" })
    frame.src = url
    frame.onload = () => {
      try {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
        setTimeout(() => frame.remove(), 120_000)
        resolve(true)
      } catch {
        frame.remove()
        resolve(Boolean(window.open(url, "_blank")))
      }
    }
    document.body.appendChild(frame)
  })
}

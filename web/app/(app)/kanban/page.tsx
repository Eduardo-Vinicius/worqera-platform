"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Mail,
  MessageCircle,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addOrderCommentV1, deleteOrderV1, getKanbanV1, getShopCurrentV1, moveKanbanOrderItemV1, moveKanbanOrderV1, resendOrderEmailV1 } from "@/lib/apiV1"
import {
  getPedidoService,
  generateOrderPDFService,
  downloadBlobAsFile,
  updateOrderService,
  deletePedidoItemFotoService,
  patchPedidoItemService,
} from "@/lib/apiService"
import { shouldIgnoreKanbanShortcut } from "@/lib/kanbanShortcuts"
import { toast } from "sonner"
import { cn, pairCount } from "@/lib/utils"
import { buildOrderWaFromShop, type ShopWaDoc } from "@/lib/orderWhatsApp"
import { ENABLE_WA_ME } from "@/lib/featureFlags"
import { buildPublicOrderUrl, withPublicOrderQuery } from "@/lib/publicOrderLink"
import QRCode from "qrcode"
import { formatBRL, moneyVisibility, readOrderPricing, roundMoney } from "@/lib/orderMoney"
import { MoneyField } from "@/components/orders/MoneyField"
import { OrderPricingSummary } from "@/components/orders/OrderPricingSummary"
import { laudoSaveMessage, type LaudoNotice } from "@/components/orders/laudoNotice"

type OrderCard = {
  _id?: string
  id?: string
  orderId?: string
  itemId?: string
  cardKey?: string
  code?: string
  codigo?: string
  pairLabel?: string
  itemIndex?: number
  pairTotal?: number
  publicToken?: string | null
  clientName?: string
  clientPhone?: string
  shoeModel?: string
  brand?: string
  modeloTenis?: string
  priority?: number
  dueAt?: string
  createdAt?: string
  itemCount?: number
  items?: unknown[]
  plannedSectorIds?: string[]
  currentSectorId?: string
  reopened?: boolean
  feedbackScore?: number | null
  status?: string
  itemInTerminal?: boolean
  photoThumb?: string | null
  hasPhotos?: boolean
  lineValue?: number
  linePending?: number
  paymentTotal?: number
  paymentRemaining?: number
  pricePending?: boolean
  itemNotes?: string | null
  services?: Array<{ name?: string; note?: string; price?: number; pricePending?: boolean }>
}

type Column = {
  sector: {
    _id: string
    id?: string
    name: string
    color?: string
    isTerminal?: boolean
  }
  orders: OrderCard[]
}

type ForwardTarget = { id: string; name: string; order?: number; isTerminal?: boolean }

type DetailOrder = {
  id?: string
  code?: string
  publicToken?: string | null
  clientName?: string
  clientPhone?: string
  client?: { name?: string; nomeCompleto?: string; phone?: string; telefone?: string }
  shoeModel?: string
  items?: Array<{
    id?: string
    _id?: string
    shoeModel?: string
    brand?: string
    notes?: string | null
    services?: Array<{ id?: string; name?: string; price?: number; note?: string }>
    photos?: Array<string | { url?: string }>
    currentSectorId?: string | null
    plannedSectorIds?: string[]
    sectorHistory?: DetailOrder["sectorHistory"]
  }>
  photos?: Array<string | { url?: string }>
  fotos?: string[]
  plannedSectorIds?: string[]
  sectorHistory?: Array<{
    sectorId?: string
    fromSectorId?: string | null
    enteredAt?: string
    leftAt?: string | null
    note?: string | null
    employeeName?: string | null
    movedByName?: string | null
    movedByEmail?: string | null
    action?: string | null
  }>
  sectorPath?: string[]
  currentSectorId?: string
  priority?: number
  dueAt?: string
  notes?: string
  status?: string
  comments?: Array<{
    id?: string
    text?: string
    authorName?: string
    createdAt?: string
  }>
}

function itemIdentity(it: { id?: string; _id?: string } | null | undefined) {
  if (!it) return ""
  return String(it.id || it._id || "").trim()
}

type OrderPhotoEntry = {
  url: string
  itemIndex: number
  photoIndex: number
  storedOnItem?: boolean
}

function photoUrlOf(u: unknown): string | null {
  if (typeof u === "string" && u.trim()) return u.trim()
  if (u && typeof u === "object" && typeof (u as { url?: string }).url === "string") {
    const url = String((u as { url?: string }).url || "").trim()
    return url || null
  }
  return null
}

function collectOrderPhotos(
  order: DetailOrder | null | undefined,
  focusItemId?: string | null,
  focusItemIndex?: number | null
): OrderPhotoEntry[] {
  if (!order) return []
  const out: OrderPhotoEntry[] = []
  const items = order.items || []
  const focusId = focusItemId ? String(focusItemId).trim() : ""

  const pushItemPhotos = (itemIndex: number, photos: unknown[] | undefined) => {
    ;(photos || []).forEach((u, photoIndex) => {
      const url = photoUrlOf(u)
      if (url) out.push({ url, itemIndex, photoIndex, storedOnItem: true })
    })
  }

  const orderPhotoPool = [...(order.fotos || []), ...(order.photos || [])]
  const locatorOf = (photo: unknown) => {
    if (typeof photo === "string") return photo
    const rec = photo as { key?: string; url?: string }
    const raw = `${rec?.key || ""} ${rec?.url || ""}`
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }
  const indexInRef = (photo: unknown) => {
    const ref = locatorOf(photo)
    for (let i = items.length - 1; i >= 0; i -= 1) {
      if (ref.includes(`/item-${i}/`) || ref.includes(`item-${i}/`)) return i
    }
    return null
  }
  const pushPoolPhoto = (photo: unknown, photoIndex: number, itemIndex: number) => {
    const url = photoUrlOf(photo)
    if (!url || out.some((entry) => entry.url === url)) return
    out.push({ url, itemIndex, photoIndex, storedOnItem: false })
  }

  let focusedIdx = -1
  if ((focusId || focusItemIndex != null) && items.length) {
    focusedIdx = focusId ? items.findIndex((it) => itemIdentity(it) === focusId) : -1
    if (focusedIdx < 0 && focusItemIndex != null && focusItemIndex >= 0 && focusItemIndex < items.length) {
      focusedIdx = focusItemIndex
    }
    if (focusedIdx < 0) return []
    pushItemPhotos(focusedIdx, items[focusedIdx].photos)
  } else if (items.length) {
    items.forEach((it, itemIndex) => pushItemPhotos(itemIndex, it.photos))
  }

  const emptyIndexes = items
    .map((it, index) => ((it.photos || []).some((photo) => photoUrlOf(photo)) ? -1 : index))
    .filter((index) => index >= 0)

  const focusedHasOwn =
    focusedIdx >= 0 && (items[focusedIdx].photos || []).some((photo) => photoUrlOf(photo))

  orderPhotoPool.forEach((photo, photoIndex) => {
    const tagged = indexInRef(photo)
    if (focusedIdx >= 0) {
      if (focusedHasOwn) return
      if (tagged === focusedIdx) {
        pushPoolPhoto(photo, photoIndex, focusedIdx)
        return
      }
      if (tagged == null && emptyIndexes.length === 1 && emptyIndexes[0] === focusedIdx) {
        pushPoolPhoto(photo, photoIndex, focusedIdx)
      }
      return
    }
    if (tagged != null) {
      pushPoolPhoto(photo, photoIndex, tagged)
      return
    }
    pushPoolPhoto(photo, photoIndex, emptyIndexes.length === 1 ? emptyIndexes[0] : 0)
  })
  return out
}

function orderId(o: OrderCard) {
  return String(o.orderId || o._id || o.id || "")
}

function cardKey(o: OrderCard) {
  if (o.cardKey) return String(o.cardKey)
  const oid = orderId(o)
  const iid = o.itemId ? String(o.itemId) : ""
  return iid ? `${oid}:${iid}` : oid
}

function orderCode(o: OrderCard) {
  if (o.pairLabel) return o.pairLabel
  const total = Number(o.pairTotal || o.itemCount || 1)
  if (total > 1 && o.itemIndex != null) {
    return `${o.code || o.codigo || "—"}-${Number(o.itemIndex) + 1}`
  }
  return o.code || o.codigo || "—"
}

function amountDue(order: OrderCard) {
  if (order.paymentRemaining != null) return Number(order.paymentRemaining) || 0
  return Number(order.linePending) || 0
}

function isOffPath(order: OrderCard | DetailOrder | null, toSectorId: string) {
  const planned = (order?.plannedSectorIds || []).map(String)
  if (!planned.length) return false
  return !planned.includes(String(toSectorId))
}

/** Route UX for card: off-flow vs next step (replaces vague "Plano" badge). */
function routeCue(
  order: OrderCard,
  columnSectorId: string,
  sectorNameById: Map<string, string>
): { offFlow: boolean; nextLabel: string | null; stepLabel: string | null } {
  const planned = (order.plannedSectorIds || []).map(String).filter(Boolean)
  if (planned.length < 1) {
    return { offFlow: false, nextLabel: null, stepLabel: null }
  }
  const current = String(order.currentSectorId || columnSectorId || "")
  const offFlow = Boolean(current) && !planned.includes(current)
  if (offFlow) {
    return { offFlow: true, nextLabel: null, stepLabel: null }
  }
  const idx = planned.indexOf(current)
  const stepLabel =
    idx >= 0 && planned.length > 1 ? `${idx + 1}/${planned.length}` : null
  if (idx >= 0 && idx < planned.length - 1) {
    const nextId = planned[idx + 1]
    const name = sectorNameById.get(nextId)
    return {
      offFlow: false,
      nextLabel: name ? `→ ${name}` : "→ próximo",
      stepLabel,
    }
  }
  if (idx === planned.length - 1) {
    return { offFlow: false, nextLabel: "Fim do fluxo", stepLabel }
  }
  return { offFlow: false, nextLabel: null, stepLabel }
}

function sameLocalDay(value: string | undefined, day: string) {
  if (!value || !day) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const dateDay = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${dateDay}` === day
}

function filterOrders(orders: OrderCard[], filterLate: boolean, query = "", onDate = "") {
  const q = query.trim().toLowerCase()
  const qDigits = q.replace(/\D/g, "")
  const now = Date.now()
  return orders.filter((o) => {
    if (filterLate && !(o.dueAt && new Date(o.dueAt).getTime() < now)) return false
    if (onDate && !sameLocalDay(o.createdAt, onDate)) return false
    if (!q) return true
    const phone = String(o.clientPhone || "").replace(/\D/g, "")
    const blob = [
      orderCode(o),
      o.code,
      o.codigo,
      o.pairLabel,
      o.clientName,
      o.brand,
      o.shoeModel,
      o.modeloTenis,
      o.clientPhone,
    ]
      .map((x) => String(x || "").toLowerCase())
      .join(" ")
    if (blob.includes(q)) return true
    return qDigits.length >= 3 && phone.includes(qDigits)
  })
}

function useDesktopKanbanDrag() {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const apply = () => setDesktop(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])
  return desktop
}

function KanbanPairQrs({
  code,
  token,
  slug,
  items,
  focusIndex,
  onlyIndex = null,
}: {
  code: string
  token: string
  slug: string
  items: Array<{ shoeModel?: string }>
  focusIndex: number | null
  /** When set, show only that pair. Null shows every pair. */
  onlyIndex?: number | null
}) {
  const [rows, setRows] = useState<Array<{ index: number; label: string; url: string; qr: string }>>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const base = buildPublicOrderUrl(window.location.origin, slug, code, token)
      if (!base || !token) {
        if (!cancelled) setRows([])
        return
      }
      const list = items.length ? items : [{ shoeModel: "" }]
      const next: Array<{ index: number; label: string; url: string; qr: string }> = []
      for (let i = 0; i < list.length; i += 1) {
        const url = withPublicOrderQuery(base, "item", i + 1)
        const qr = await QRCode.toDataURL(url, { margin: 1, width: 220 })
        next.push({
          index: i,
          label: list[i]?.shoeModel?.trim() || `Par ${i + 1}`,
          url,
          qr,
        })
      }
      if (!cancelled) setRows(next)
    })().catch(() => {
      if (!cancelled) setRows([])
    })
    return () => {
      cancelled = true
    }
  }, [code, token, slug, items.map((it) => it.shoeModel || "").join("|")])

  if (!token) {
    return <p className="text-xs text-[var(--wq-text-muted)]">Link público ainda sem token.</p>
  }
  if (!rows.length) {
    return <p className="text-xs text-[var(--wq-text-muted)]">Gerando QR…</p>
  }

  const visible =
    onlyIndex != null ? rows.filter((row) => row.index === onlyIndex) : rows
  const ordered = [...visible].sort((a, b) => a.index - b.index)

  return (
    <div className="space-y-3">
      {ordered.map((row) => {
        const focused = focusIndex != null && row.index === focusIndex
        return (
          <div
            key={row.index}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] p-2",
              focused && "border-[var(--wq-brand)]"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.qr}
              alt={`QR par ${row.index + 1}`}
              className={focused ? "h-28 w-28 shrink-0" : "h-16 w-16 shrink-0"}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--wq-text)]">
                Par {row.index + 1}
                {row.label ? ` · ${row.label}` : ""}
              </p>
              <button
                type="button"
                className="mt-1 text-[11px] font-medium text-[var(--wq-brand-text)] hover:underline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(row.url)
                    toast.success("Link deste par copiado")
                  } catch {
                    toast.message(row.url)
                  }
                }}
              >
                Copiar link
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ServicePriceField({
  price,
  busy,
  onSave,
}: {
  price: number
  busy?: boolean
  onSave: (next: number) => void
}) {
  const [value, setValue] = useState(price)
  return (
    <div className="mt-1 flex items-center gap-2">
      <MoneyField value={value} onValue={setValue} className="h-8 w-28 text-sm" />
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onSave(roundMoney(value))}>
        {busy ? "…" : "Salvar"}
      </Button>
    </div>
  )
}

function KanbanCardBody({
  order,
  focused,
  dragging,
  onFocus,
  onOpen,
  dragHandleProps,
  columnSectorId,
  sectorNameById,
  isTerminalColumn,
  onMarkDelivered,
  onNotifyReady,
  showPayment = false,
}: {
  order: OrderCard
  focused?: boolean
  dragging?: boolean
  onFocus?: () => void
  onOpen?: () => void
  dragHandleProps?: Record<string, unknown>
  columnSectorId?: string
  sectorNameById?: Map<string, string>
  isTerminalColumn?: boolean
  onMarkDelivered?: (order: OrderCard) => void
  onNotifyReady?: (order: OrderCard) => void
  showPayment?: boolean
}) {
  const late = order.dueAt && new Date(order.dueAt).getTime() < Date.now()
  const pairs = pairCount(order)
  const cue = routeCue(order, columnSectorId || "", sectorNameById || new Map())
  const showDeliver =
    Boolean(isTerminalColumn) &&
    order.status === "ready" &&
    Boolean(onMarkDelivered)
  const showNotify =
    ENABLE_WA_ME &&
    Boolean(isTerminalColumn) &&
    order.status === "ready" &&
    Boolean(onNotifyReady)

  return (
    <div
      className={cn(
        "cursor-grab rounded-xl border bg-[var(--wq-surface)] p-3 shadow-sm active:cursor-grabbing",
        late
          ? "border-rose-300/80 border-l-[3px] border-l-rose-500 bg-[color-mix(in_srgb,#f43f5e_10%,var(--wq-surface))]"
          : order.reopened
            ? "border-sky-300/70 border-l-[3px] border-l-sky-500 bg-[color-mix(in_srgb,#0ea5e9_8%,var(--wq-surface))]"
            : cue.offFlow
              ? "border-[var(--wq-warn)]/50 border-l-[3px] border-l-[var(--wq-warn)] bg-[color-mix(in_srgb,var(--wq-warn)_8%,var(--wq-surface))]"
              : "border-[var(--wq-border)]",
        focused && "ring-2 ring-[var(--wq-action)]",
        dragging && "opacity-40"
      )}
      onClick={onFocus}
      {...(dragHandleProps || {})}
    >
      <button
        type="button"
        className="w-full cursor-inherit text-left"
        onClick={(e) => {
          e.stopPropagation()
          onOpen?.()
        }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-sm font-semibold tracking-tight text-[var(--wq-text)]">
            {orderCode(order)}
          </span>
          {late && (
            <Badge className="border-0 bg-rose-100 text-[10px] font-semibold text-rose-800">
              Atrasado
            </Badge>
          )}
          {order.reopened && (
            <Badge className="border-0 bg-sky-100 text-[10px] font-semibold text-sky-800">
              Reaberto
            </Badge>
          )}
          {order.hasPhotos === false && (
            <Badge className="border-0 bg-amber-100 text-[10px] font-semibold text-amber-900">
              Sem foto
            </Badge>
          )}
          {(() => {
            const hasPrice = order.paymentTotal != null && Number(order.paymentTotal) > 0.009
            const missingPrice =
              (order.paymentTotal != null && Number(order.paymentTotal) <= 0.009) ||
              (order.paymentTotal == null && order.pricePending === true)
            if (missingPrice) {
              return (
                <Badge className="border-0 bg-amber-100 text-[10px] font-semibold text-amber-950">
                  Pendente valor
                </Badge>
              )
            }
            if (hasPrice && amountDue(order) > 0.009) {
              return (
                <Badge className="border-0 bg-amber-100 text-[10px] font-semibold text-amber-900">
                  A pagar
                </Badge>
              )
            }
            return null
          })()}
          {cue.offFlow && (
            <Badge className="border-0 bg-[var(--wq-warn)]/20 text-[10px] font-semibold text-[var(--wq-warn)]">
              Fora do fluxo
            </Badge>
          )}
          {order.priority != null && Number(order.priority) <= 1 && (
            <Badge className="border-0 bg-amber-100 text-[10px] font-semibold text-amber-900">
              Alta
            </Badge>
          )}
          {pairs > 1 && (
            <Badge variant="secondary" className="font-mono text-[10px]">
              {typeof order.itemIndex === "number"
                ? `${order.itemIndex + 1}/${pairs}`
                : `${pairs} itens`}
            </Badge>
          )}
          {!cue.offFlow && cue.stepLabel && (
            <span className="font-mono text-[10px] text-[var(--wq-text-muted)]">{cue.stepLabel}</span>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-[var(--wq-text)]">{order.clientName || "Cliente"}</p>
        {order.services?.length ? (
          <ul className="mt-1.5 space-y-1">
            {order.services.map((service, index) => (
              <li key={`${service.name || "servico"}-${index}`}>
                <p className="text-[13px] font-medium leading-snug text-[var(--wq-text)]">
                  {service.name || "Serviço"}
                </p>
                {service.note ? (
                  <p className="line-clamp-2 text-[13px] leading-snug text-[var(--wq-text)]">{service.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {order.itemNotes ? (
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-[var(--wq-text-muted)]">{order.itemNotes}</p>
        ) : null}
        {(order.brand || order.shoeModel || order.modeloTenis) && (
          <p className="mt-1 truncate text-xs text-[var(--wq-text-muted)]">
            {[order.brand, order.shoeModel || order.modeloTenis].filter(Boolean).join(" · ")}
          </p>
        )}
        {!cue.offFlow && cue.nextLabel && (
          <p
            className={cn(
              "mt-1.5 truncate text-[11px] font-medium",
              cue.nextLabel === "Fim do fluxo"
                ? "text-[var(--wq-success)]"
                : "text-[var(--wq-brand-text)]"
            )}
          >
            {cue.nextLabel}
          </p>
        )}
        {cue.offFlow && (
          <p className="mt-1.5 text-[11px] font-medium text-[var(--wq-warn)]">
            Rota alterada · revisar no detalhe
          </p>
        )}
      </button>
      {showNotify || showDeliver ? (
        <div className="mt-2 flex flex-col gap-1.5">
          {showNotify ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--wq-success)]/40 bg-[color-mix(in_srgb,var(--wq-success)_12%,var(--wq-surface))] px-2 py-1.5 text-xs font-semibold text-[var(--wq-success)] hover:bg-[color-mix(in_srgb,var(--wq-success)_18%,var(--wq-surface))]"
              onClick={(e) => {
                e.stopPropagation()
                onNotifyReady?.(order)
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Avisar pronto
            </button>
          ) : null}
          {showDeliver ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
              onClick={(e) => {
                e.stopPropagation()
                onMarkDelivered?.(order)
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Check className="h-3.5 w-3.5" />
              Marcar entregue
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function DraggableCard({
  order,
  focused,
  onFocus,
  onOpen,
  columnSectorId,
  sectorNameById,
  isTerminalColumn,
  onMarkDelivered,
  onNotifyReady,
  dragEnabled = true,
  showPayment = false,
}: {
  order: OrderCard
  focused?: boolean
  onFocus?: () => void
  onOpen?: () => void
  columnSectorId: string
  sectorNameById: Map<string, string>
  isTerminalColumn?: boolean
  onMarkDelivered?: (order: OrderCard) => void
  onNotifyReady?: (order: OrderCard) => void
  dragEnabled?: boolean
  showPayment?: boolean
}) {
  const id = cardKey(order)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: !dragEnabled,
  })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div ref={setNodeRef} style={style} className={dragEnabled ? "touch-none" : undefined}>
      <KanbanCardBody
        order={order}
        focused={focused}
        dragging={isDragging}
        onFocus={onFocus}
        onOpen={onOpen}
        dragHandleProps={dragEnabled ? { ...listeners, ...attributes } : undefined}
        columnSectorId={columnSectorId}
        sectorNameById={sectorNameById}
        isTerminalColumn={isTerminalColumn}
        onMarkDelivered={onMarkDelivered}
        onNotifyReady={onNotifyReady}
        showPayment={showPayment}
      />
    </div>
  )
}

function DroppableColumn({
  column,
  filterLate,
  focusedCardId,
  onFocusCard,
  onOpenCard,
  sectorNameById,
  compact,
  onMarkDelivered,
  onNotifyReady,
  query = "",
  onDate = "",
  dragEnabled = true,
  showPending = false,
}: {
  column: Column
  filterLate: boolean
  focusedCardId: string | null
  onFocusCard: (id: string) => void
  onOpenCard: (o: OrderCard) => void
  sectorNameById: Map<string, string>
  compact?: boolean
  onMarkDelivered?: (order: OrderCard) => void
  onNotifyReady?: (order: OrderCard) => void
  query?: string
  onDate?: string
  dragEnabled?: boolean
  showPending?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.sector._id })
  const orders = filterOrders(column.orders, filterLate, query, onDate)
  const columnValue = orders.reduce((sum, order) => sum + (Number(order.lineValue) || 0), 0)
  const columnPending = orders.reduce((sum, order) => sum + (Number(order.linePending) || 0), 0)
  const isTerminal = Boolean(column.sector.isTerminal)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-[calc(100dvh-14rem)] flex-col overflow-hidden rounded-2xl border bg-[var(--wq-paper)]/60 md:min-h-[calc(100vh-11rem)]",
        compact ? "w-full max-w-full" : "min-w-[280px] w-[min(360px,28vw)] flex-1",
        isOver ? "border-[var(--wq-action)] ring-2 ring-[var(--wq-action)]/30" : "border-[var(--wq-border)]"
      )}
    >
      <div className="border-b border-[var(--wq-border)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: column.sector.color }} />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--wq-text)]">
            {column.sector.name}
          </span>
          {isTerminal ? (
            <Badge className="border-0 bg-emerald-100 text-[10px] font-semibold text-emerald-800">
              Pronto
            </Badge>
          ) : null}
          <Badge variant="outline" className="font-mono text-[11px]">
            {orders.length}
          </Badge>
        </div>
        {showPending ? (
          <div className="mt-1 space-y-0.5">
            <p className="font-mono text-sm font-semibold tabular-nums text-[var(--wq-text)]">
              Total {formatBRL(columnValue)}
            </p>
            <p
              className={cn(
                "font-mono text-xs tabular-nums",
                columnPending > 0.009 ? "font-medium text-amber-800" : "text-[var(--wq-text-muted)]"
              )}
            >
              A pagar {formatBRL(columnPending)}
            </p>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {orders.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-[var(--wq-text-muted)]">
            {query.trim() ? "Nenhum pedido" : "Vazio"}
          </p>
        )}
        {orders.map((o) => (
          <DraggableCard
            key={cardKey(o)}
            order={o}
            focused={focusedCardId === cardKey(o)}
            onFocus={() => onFocusCard(cardKey(o))}
            onOpen={() => onOpenCard(o)}
            columnSectorId={column.sector._id}
            sectorNameById={sectorNameById}
            isTerminalColumn={isTerminal}
            onMarkDelivered={onMarkDelivered}
            onNotifyReady={onNotifyReady}
            dragEnabled={dragEnabled}
            showPayment={showPending}
          />
        ))}
      </div>
    </div>
  )
}

export default function KanbanPage() {
  const [columns, setColumns] = useState<Column[]>([])
  const [forwardTargets, setForwardTargets] = useState<ForwardTarget[]>([])
  const [membershipRole, setMembershipRole] = useState("")
  const [loading, setLoading] = useState(true)
  const [activeSectorId, setActiveSectorId] = useState<string | null>(null)
  const [filterLate, setFilterLate] = useState(false)
  const [filterDate, setFilterDate] = useState("")
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<DetailOrder | null>(null)
  const [detailItemId, setDetailItemId] = useState<string | null>(null)
  const [detailItemIndex, setDetailItemIndex] = useState<number | null>(null)
  const [showAllOrderPhotos, setShowAllOrderPhotos] = useState(false)
  const [photoBusy, setPhotoBusy] = useState<string | null>(null)
  const isSectorRole = membershipRole === "sector"
  const moneyTone = moneyVisibility(membershipRole)
  // Soma da coluna fica oculta por ora, inclusive para admin e dono.
  const showColumnMoney = false

  const [deliverPrompt, setDeliverPrompt] = useState<OrderCard | null>(null)
  const [deliverBusy, setDeliverBusy] = useState(false)
  const [pendingMove, setPendingMove] = useState<{
    orderId: string
    itemId?: string
    cardKey: string
    toSectorId: string
    toSectorName: string
    card?: OrderCard | null
  } | null>(null)
  const [offPathNote, setOffPathNote] = useState("")
  const [moving, setMoving] = useState(false)
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null)
  const [codeQuery, setCodeQuery] = useState("")
  const [commentDraft, setCommentDraft] = useState("")
  const [commenting, setCommenting] = useState(false)
  const [notesDraft, setNotesDraft] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const [detailClientName, setDetailClientName] = useState("")
  const [detailClientPhone, setDetailClientPhone] = useState("")
  const [detailClientEmail, setDetailClientEmail] = useState("")
  const [resendingEmail, setResendingEmail] = useState(false)
  const [detailPriority, setDetailPriority] = useState("2")
  const [detailDueAt, setDetailDueAt] = useState("")
  const [detailPrice, setDetailPrice] = useState(0)
  const [savingPrice, setSavingPrice] = useState(false)
  const [savingServiceKey, setSavingServiceKey] = useState("")
  const [priceAskOpen, setPriceAskOpen] = useState(false)
  const [shopDoc, setShopDoc] = useState<ShopWaDoc | null>(null)

  const dragEnabled = useDesktopKanbanDrag()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getKanbanV1()
      const cols = (res.columns || []).map((c: any) => ({
        sector: {
          _id: String(c.sector?._id || c.sector?.id),
          name: c.sector?.name || "Setor",
          color: c.sector?.color || "#7C6CF0",
          isTerminal: Boolean(c.sector?.isTerminal),
        },
        orders: (c.orders || []).map((o: any) => ({
          ...o,
          orderId: o.orderId ? String(o.orderId) : String(o._id || o.id || ""),
          itemId: o.itemId ? String(o.itemId) : undefined,
          cardKey: o.cardKey
            ? String(o.cardKey)
            : o.itemId
              ? `${o.orderId || o._id || o.id}:${o.itemId}`
              : String(o._id || o.id || ""),
          pairLabel: o.pairLabel || undefined,
          itemIndex: o.itemIndex != null ? Number(o.itemIndex) : undefined,
          pairTotal: o.pairTotal != null ? Number(o.pairTotal) : undefined,
          clientPhone: o.clientPhone || o.client?.phone || o.client?.telefone || "",
          currentSectorId: o.currentSectorId
            ? String(o.currentSectorId._id || o.currentSectorId)
            : String(c.sector?._id || c.sector?.id || ""),
          plannedSectorIds: Array.isArray(o.plannedSectorIds)
            ? o.plannedSectorIds.map(String)
            : [],
          reopened: Boolean(o.reopened),
          status: o.status,
          hasPhotos:
            typeof o.hasPhotos === "boolean" ? Boolean(o.hasPhotos) : Boolean(o.photoThumb),
          photoThumb: o.photoThumb || null,
        })),
      }))
      const targets: ForwardTarget[] = (res.forwardTargets || []).map((t: any) => ({
        id: String(t.id || t._id),
        name: t.name || "Setor",
        order: t.order,
        isTerminal: Boolean(t.isTerminal),
      }))
      setForwardTargets(
        targets.length
          ? targets
          : cols.map((c: Column) => ({ id: c.sector._id, name: c.sector.name }))
      )
      setMembershipRole(String(res.role || localStorage.getItem("role") || "").toLowerCase())
      setColumns(cols)
      setActiveSectorId((prev) => {
        if (prev && cols.some((c: Column) => c.sector._id === prev)) return prev
        return cols[0]?.sector._id || null
      })
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar kanban")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    ;(async () => {
      try {
        const shop = await getShopCurrentV1()
        setShopDoc((shop?.shop || shop) as ShopWaDoc)
      } catch {
        setShopDoc(null)
      }
    })()
  }, [load])

  const activeIndex = useMemo(
    () => columns.findIndex((c) => c.sector._id === activeSectorId),
    [columns, activeSectorId]
  )
  const activeColumn = activeIndex >= 0 ? columns[activeIndex] : null
  const sectorNameById = useMemo(() => {
    const map = new Map<string, string>()
    forwardTargets.forEach((t) => map.set(t.id, t.name))
    columns.forEach((c) => map.set(c.sector._id, c.sector.name))
    return map
  }, [columns, forwardTargets])

  const visibleColumnIds = useMemo(
    () => new Set(columns.map((c) => c.sector._id)),
    [columns]
  )

  const visibleOrders = useMemo(() => {
    return filterOrders(activeColumn?.orders || [], filterLate, codeQuery, filterDate)
  }, [activeColumn, filterLate, codeQuery, filterDate])

  useEffect(() => {
    if (!visibleOrders.length) {
      setFocusedCardId(null)
      return
    }
    setFocusedCardId((prev) => {
      if (prev && visibleOrders.some((o) => cardKey(o) === prev)) return prev
      return cardKey(visibleOrders[0])
    })
  }, [visibleOrders])

  const findCard = (id: string) => {
    for (const col of columns) {
      const found = col.orders.find((o) => cardKey(o) === id || orderId(o) === id)
      if (found) return found
    }
    return null
  }

  const findCardSector = (id: string) => {
    for (const col of columns) {
      if (col.orders.some((o) => cardKey(o) === id || orderId(o) === id)) return col.sector._id
    }
    return null
  }

  const markDelivered = async (
    order: OrderCard,
    settle: "none" | "paid" = "none"
  ) => {
    const id = orderId(order)
    if (!id) return
    setDeliverBusy(true)
    try {
      const total = Number(order.paymentTotal) || 0
      await updateOrderService(id, {
        status: "delivered",
        deliveredAt: new Date().toISOString(),
        ...(settle === "paid" ? { pricing: { deposit: total, remaining: 0 } } : {}),
      })
      toast.success(
        settle === "paid"
          ? `${orderCode(order)} pago e entregue`
          : `${orderCode(order)} marcado como entregue`
      )
      if (detailOpen && detail && String(detail.id) === id) {
        setDetailOpen(false)
        setDetail(null)
      }
      setDeliverPrompt(null)
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao marcar entregue")
    } finally {
      setDeliverBusy(false)
    }
  }

  const requestDeliver = (order: OrderCard) => {
    if (amountDue(order) > 0.009) {
      setDeliverPrompt(order)
      return
    }
    void markDelivered(order)
  }

  const notifyReady = (order: OrderCard) => {
    const code = orderCode(order)
    const phone = (order as any).clientPhone || ""
    const built = buildOrderWaFromShop({
      shop: shopDoc,
      phone,
      code,
      publicToken: order.publicToken,
      clientName: order.clientName || "",
      templateKey: "ready",
    })
    if (!built?.url) {
      toast.error(
        shopDoc?.notifications?.whatsapp?.enabled
          ? "Cliente sem telefone — cadastre no pedido"
          : "Ative WhatsApp em Empresa → Notificações"
      )
      return
    }
    window.open(built.url, "_blank", "noopener,noreferrer")
  }

  const executeMove = async (
    orderIdValue: string,
    toSectorId: string,
    note?: string,
    itemIdValue?: string
  ) => {
    setMoving(true)
    try {
      const moved: any =
        itemIdValue
          ? await moveKanbanOrderItemV1(orderIdValue, itemIdValue, { toSectorId, note })
          : await moveKanbanOrderV1(orderIdValue, { toSectorId, note })
      const destVisible = visibleColumnIds.has(toSectorId)
      const destName = sectorNameById.get(toSectorId) || "setor"
      const wa = ENABLE_WA_ME ? moved?.whatsappSuggest : null
      if (wa?.url) {
        toast.success(destVisible ? `Movido para ${destName}` : `Encaminhado para ${destName}`, {
          action: {
            label: "Avisar no WhatsApp",
            onClick: () => window.open(wa.url, "_blank", "noopener,noreferrer"),
          },
          duration: 8000,
        })
      } else {
        toast.success(destVisible ? `Movido para ${destName}` : `Encaminhado para ${destName}`)
      }
      setPendingMove(null)
      setOffPathNote("")
      setActiveDragId(null)
      if (destVisible) setActiveSectorId(toSectorId)
      await load()
      if (detailOpen && detail && String(detail.id) === orderIdValue) {
        if (!destVisible) {
          setDetailOpen(false)
          setDetail(null)
        } else {
          const refreshed = await getPedidoService(orderIdValue)
          setDetail(refreshed)
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Falha ao mover")
    } finally {
      setMoving(false)
    }
  }

  const requestMove = async (toSectorId: string, cardKeyValue?: string | null) => {
    const key = cardKeyValue
    if (!key || !toSectorId) return
    const card = findCard(key)
    const oid = card ? orderId(card) : key.includes(":") ? key.split(":")[0] : key
    const iid = card?.itemId || (key.includes(":") ? key.split(":")[1] : undefined)
    const from =
      findCardSector(key) ||
      (detail && String(detail.id) === oid ? String(detail.currentSectorId || "") : "")
    if (from && from === toSectorId) return
    const toName = sectorNameById.get(toSectorId) || "setor"
    const source = card || (detail && String(detail.id) === oid ? detail : null)
    if (isOffPath(source, toSectorId)) {
      setPendingMove({
        orderId: oid,
        itemId: iid,
        cardKey: key,
        toSectorId,
        toSectorName: toName,
        card,
      })
      setOffPathNote("")
      return
    }
    await executeMove(oid, toSectorId, undefined, iid)
  }

  const moveRelative = async (order: OrderCard, dir: -1 | 1) => {
    const idx = activeIndex
    const target = columns[idx + dir]
    if (!target) {
      toast.message(dir < 0 ? "Já é o primeiro setor" : "Já é o último setor")
      return
    }
    await requestMove(target.sector._id, cardKey(order))
  }

  const openDetail = async (order: OrderCard) => {
    const id = orderId(order)
    if (!id) return
    setFocusedCardId(cardKey(order))
    setDetailItemId(order.itemId ? String(order.itemId) : null)
    setDetailItemIndex(
      typeof order.itemIndex === "number" && Number.isFinite(order.itemIndex)
        ? Number(order.itemIndex)
        : null
    )
    setShowAllOrderPhotos(false)
    setDetailOpen(true)
    setDetailLoading(true)
    setCommentDraft("")
    setNotesDraft("")
    try {
      const data = await getPedidoService(id)
      setDetail(data)
      setNotesDraft(String(data?.notes || data?.observacoes || ""))
      setDetailClientName(String(data?.clientName || data?.client?.name || ""))
      setDetailClientPhone(String(data?.clientPhone || data?.client?.phone || ""))
      setDetailClientEmail(String(data?.clientEmail || data?.client?.email || ""))
      setDetailPriority(String(data?.priority ?? data?.prioridade ?? 2))
      const due = data?.dueAt || data?.dataPrevistaEntrega
      setDetailDueAt(due ? String(due).slice(0, 10) : "")
      setDetailPrice(readOrderPricing(data).total)
      setPriceAskOpen(false)
    } catch (err: any) {
      toast.error(err?.message || "Erro ao abrir detalhe")
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const markSettlement = async (paid: boolean) => {
    if (!detail?.id) return
    const current = readOrderPricing(detail)
    if (current.total <= 0.009) {
      toast.message("Defina o valor do pedido antes de marcar como pago")
      return
    }
    setSavingPrice(true)
    try {
      const updated = await updateOrderService(String(detail.id), {
        pricing: {
          total: current.total,
          deposit: paid ? current.total : 0,
          remaining: paid ? 0 : current.total,
        },
      })
      setDetail(updated as DetailOrder)
      setDetailPrice(readOrderPricing(updated).total)
      toast.success(paid ? "Marcado como pago" : "Continua em aberto")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao atualizar o pagamento")
    } finally {
      setSavingPrice(false)
    }
  }

  const commitDetailPrice = async (sendLaudo?: boolean) => {
    if (!detail?.id) return
    const next = roundMoney(detailPrice)
    const current = readOrderPricing(detail)
    setSavingPrice(true)
    setPriceAskOpen(false)
    try {
      const updated = await updateOrderService(String(detail.id), {
        pricing: {
          total: next,
          deposit: Math.min(current.deposit, next),
          remaining: roundMoney(Math.max(0, next - Math.min(current.deposit, next))),
        },
        ...(sendLaudo === true ? { sendLaudo: true } : sendLaudo === false ? { sendLaudo: false } : {}),
      })
      setDetail(updated as DetailOrder)
      setDetailPrice(readOrderPricing(updated).total)
      const notify = (updated as { emailNotify?: LaudoNotice }).emailNotify
      if (sendLaudo === true) {
        const note = laudoSaveMessage("Valor salvo.", notify)
        if (note.tone === "ok") toast.success(note.text)
        else if (note.tone === "wait") toast.message(note.text)
        else toast.error(note.text)
      } else if (next <= 0.009) {
        toast.success("Valor em aberto. O laudo continua em espera.")
      } else {
        toast.success("Valor salvo. Laudo não enviado.")
      }
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar o valor")
    } finally {
      setSavingPrice(false)
    }
  }

  const saveServicePrice = async (itemIndex: number, serviceIndex: number, price: number) => {
    if (!detail?.id || !detail.items?.[itemIndex]) return
    const item = detail.items[itemIndex]
    const previousTotal = readOrderPricing(detail).total
    const key = `${itemIndex}:${serviceIndex}`
    setSavingServiceKey(key)
    try {
      const services = (item.services || []).map((service, index) => ({
        id: service.id,
        name: service.name,
        note: service.note || "",
        price: index === serviceIndex ? price : Number(service.price) || 0,
      }))
      const updated = await patchPedidoItemService(String(detail.id), itemIndex, {
        services,
        notes: item.notes || "",
      })
      setDetail(updated as DetailOrder)
      const nextTotal = readOrderPricing(updated).total
      setDetailPrice(nextTotal)
      if (Math.abs(nextTotal - previousTotal) > 0.009 && nextTotal > 0.009) setPriceAskOpen(true)
      else if (nextTotal <= 0.009) toast.success("Preço salvo. Sem valor, o laudo continua em espera.")
      else toast.success("Preço do serviço salvo")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar o serviço")
    } finally {
      setSavingServiceKey("")
    }
  }

  const requestDetailPrice = () => {
    if (!detail?.id) return
    const next = roundMoney(detailPrice)
    const current = readOrderPricing(detail).total
    if (Math.abs(next - current) <= 0.009) {
      toast.message("O valor não mudou")
      return
    }
    if (next <= 0.009) {
      void commitDetailPrice()
      return
    }
    setPriceAskOpen(true)
  }

  const saveNotes = async () => {
    if (!detail?.id) return
    setSavingNotes(true)
    try {
      const updated = await updateOrderService(String(detail.id), {
        notes: notesDraft,
        clientName: detailClientName.trim() || undefined,
        clientPhone: detailClientPhone.trim() || undefined,
        clientEmail: detailClientEmail.trim(),
        prioridade: Number(detailPriority) || 2,
        dataPrevistaEntrega: detailDueAt || undefined,
      })
      setDetail(updated as DetailOrder)
      toast.success("Pedido atualizado")
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar")
    } finally {
      setSavingNotes(false)
    }
  }

  const onDeleteDetailPhoto = async (itemIndex: number, photoIndex: number) => {
    if (!detail?.id) return
    const key = `${itemIndex}:${photoIndex}`
    setPhotoBusy(key)
    try {
      await deletePedidoItemFotoService(String(detail.id), itemIndex, photoIndex)
      const fresh = await getPedidoService(String(detail.id))
      setDetail(fresh as DetailOrder)
      toast.success("Foto removida")
      void load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao remover")
    } finally {
      setPhotoBusy(null)
    }
  }

  const onDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
    setFocusedCardId(String(event.active.id))
  }

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return
    const id = String(active.id)
    let toSectorId = String(over.id)
    // if dropped on a card, resolve parent sector
    if (!columns.some((c) => c.sector._id === toSectorId)) {
      toSectorId = findCardSector(toSectorId) || ""
    }
    if (!toSectorId) return
    await requestMove(toSectorId, id)
  }

  useEffect(() => {
    const focusBoardFilter = () => {
      document
        .querySelector<HTMLInputElement>('input[aria-label="Filtrar pedidos no kanban"]')
        ?.focus()
    }
    const blockOrderJump = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault()
        e.stopPropagation()
        focusBoardFilter()
      }
    }
    window.addEventListener("keydown", blockOrderJump, true)
    return () => window.removeEventListener("keydown", blockOrderJump, true)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shouldIgnoreKanbanShortcut(e.target as any)) return
      if (pendingMove || moving) return
      if (detailOpen && e.key !== "Escape") return

      if (e.key === "Escape" && detailOpen) {
        setDetailOpen(false)
        return
      }

      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        const el = document.querySelector<HTMLInputElement>('input[aria-label="Filtrar pedidos no kanban"]')
        el?.focus()
        return
      }

      if (e.key >= "1" && e.key <= "9") {
        const idx = Number(e.key) - 1
        if (columns[idx]) {
          e.preventDefault()
          setActiveSectorId(columns[idx].sector._id)
        }
        return
      }

      if (e.key === "j" || e.key === "k") {
        e.preventDefault()
        if (!visibleOrders.length) return
        const ids = visibleOrders.map(cardKey)
        const cur = focusedCardId ? ids.indexOf(focusedCardId) : 0
        const next =
          e.key === "j"
            ? Math.min(ids.length - 1, Math.max(0, cur) + 1)
            : Math.max(0, Math.max(0, cur) - 1)
        setFocusedCardId(ids[next])
        return
      }

      if (e.key === "Enter" && focusedCardId) {
        e.preventDefault()
        const card = visibleOrders.find((o) => cardKey(o) === focusedCardId)
        if (card) openDetail(card)
        return
      }

      if (e.key === "n" && focusedCardId) {
        e.preventDefault()
        const card = visibleOrders.find((o) => cardKey(o) === focusedCardId)
        if (card) moveRelative(card, 1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [
    columns,
    visibleOrders,
    focusedCardId,
    pendingMove,
    moving,
    detailOpen,
    activeIndex,
  ])

  const focusedDetailItem = (() => {
    if (!detail?.items?.length) return null
    if (detailItemId) {
      const byId = detail.items.find((it) => itemIdentity(it) === String(detailItemId))
      if (byId) return byId
    }
    if (detailItemIndex != null && detailItemIndex >= 0 && detailItemIndex < detail.items.length) {
      return detail.items[detailItemIndex]
    }
    return null
  })()

  const itemPlan = (focusedDetailItem?.plannedSectorIds || []).map(String).filter(Boolean)
  const orderPlan = (detail?.plannedSectorIds || []).map(String).filter(Boolean)
  const workSectors = forwardTargets
    .filter((t) => !t.isTerminal)
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
  const startId = workSectors[0]?.id || ""
  const terminalIds = new Set(forwardTargets.filter((t) => t.isTerminal).map((t) => t.id))
  const itemPlanIsStub =
    itemPlan.length === 0 ||
    (itemPlan.length <= 2 && itemPlan.every((id) => id === startId || terminalIds.has(id)))
  const plannedIds =
    itemPlanIsStub && orderPlan.length > itemPlan.length ? orderPlan : itemPlan.length ? itemPlan : orderPlan
  const detailCurrentSectorId = String(
    focusedDetailItem?.currentSectorId || detail?.currentSectorId || ""
  )
  const dragCard = activeDragId ? findCard(activeDragId) : null
  const plannedPathIds = plannedIds.length
    ? plannedIds
    : forwardTargets.map((t) => t.id)
  const historyEntries = [
    ...((focusedDetailItem?.sectorHistory?.length
      ? focusedDetailItem.sectorHistory
      : detail?.sectorHistory) || []),
  ].reverse()
  const commentsNewestFirst = [...(detail?.comments || [])].reverse()

  const plannedMoveTargets = (() => {
    if (!plannedIds.length) return forwardTargets
    const byId = new Map(forwardTargets.map((t) => [t.id, t]))
    const ordered = plannedIds.map((id) => byId.get(id)).filter(Boolean) as ForwardTarget[]
    return ordered
  })()
  const offPlanMoveTargets = plannedIds.length
    ? forwardTargets.filter((t) => !plannedIds.includes(t.id))
    : []

  const submitComment = async () => {
    if (!detail?.id || !commentDraft.trim()) return
    setCommenting(true)
    try {
      const updated = await addOrderCommentV1(String(detail.id), commentDraft.trim())
      setDetail(updated as DetailOrder)
      setCommentDraft("")
      toast.success("Comentário adicionado")
    } catch (err: any) {
      toast.error(err?.message || "Falha ao comentar")
    } finally {
      setCommenting(false)
    }
  }

  const renderMoveButton = (target: ForwardTarget, planned: boolean) => {
    if (!detail) return null
    const isCurrent = detailCurrentSectorId === target.id
    const blind = isSectorRole && !visibleColumnIds.has(target.id)
    return (
      <button
        key={`move-${target.id}`}
        type="button"
        disabled={isCurrent || moving}
        onClick={() =>
          requestMove(
            target.id,
            detailItemId ? `${String(detail.id)}:${detailItemId}` : String(detail.id)
          )
        }
        className={cn(
          "rounded-xl border px-3 py-2 text-left text-sm disabled:opacity-40",
          planned
            ? "border-[var(--wq-brand)]/50 hover:bg-[var(--wq-brand-soft)]"
            : "border-[var(--wq-border)] hover:bg-[var(--wq-paper)]"
        )}
      >
        {target.name}
        {blind && <span className="ml-2 text-xs text-[var(--wq-text-muted)]">encaminhar</span>}
        {!planned && (
          <span className="ml-2 text-xs text-[var(--wq-text-muted)]">fora do plano</span>
        )}
      </button>
    )
  }

  return (
      <div className="relative flex h-[calc(100dvh-3.5rem-5.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[280px] max-h-[100dvh] max-w-[100vw] flex-col overflow-hidden md:h-[calc(100vh-0px)] md:min-h-[640px] md:max-h-none">
        <div className="shrink-0 border-b border-[var(--wq-border)] bg-[var(--wq-paper)] px-2 pt-0 sm:px-4 md:px-6">
          <AppHeader
            title="Kanban"
            showOrderJump={false}
            subtitle={
              isSectorRole
                ? "Sua fila · abra o pedido para encaminhar"
                : dragEnabled
                  ? "Board · arraste · atalhos j/k · 1-9 · Enter · n"
                  : "Toque no pedido para abrir e mover"
            }
        actions={
          <div className="flex w-full min-w-0 flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full min-w-0 md:w-[240px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--wq-text-muted)]" />
              <Input
                value={codeQuery}
                onChange={(e) => setCodeQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "/") e.stopPropagation()
                }}
                placeholder="Cliente, código ou modelo"
                className="h-9 w-full min-w-0 rounded-[10px] pl-8 text-sm"
                aria-label="Filtrar pedidos no kanban"
              />
            </div>
            <div className="flex w-full min-w-0 items-center gap-2 md:w-auto">
            <div
              className={cn(
                "flex h-9 min-w-0 flex-1 items-center rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-surface)] pl-2 md:w-[11.5rem] md:flex-none",
                filterDate && "border-[var(--wq-brand)]"
              )}
            >
              <span className="shrink-0 text-[11px] text-[var(--wq-text-muted)]">Data</span>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-9 min-w-0 flex-1 border-0 bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-0"
                aria-label="Filtrar pela data de entrada"
              />
              {filterDate ? (
                <button
                  type="button"
                  className="mr-1 shrink-0 rounded-md p-1 text-[var(--wq-text-muted)] hover:text-[var(--wq-text)]"
                  aria-label="Limpar data"
                  onClick={() => setFilterDate("")}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
            <Button
              variant={filterLate ? "default" : "outline"}
              size="sm"
              className={cn("h-9 shrink-0 rounded-[10px]", filterLate && "bg-[var(--wq-warn)]")}
              onClick={() => setFilterLate((v) => !v)}
            >
              Atrasados
            </Button>
            <Button variant="outline" size="sm" className="h-9 shrink-0 rounded-[10px] px-2.5" onClick={load} aria-label="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
            </div>
            {!isSectorRole ? (
              <Button asChild variant="outline" size="sm" className="hidden rounded-[10px] sm:inline-flex">
                <Link href="/settings/setores">
                  <Settings className="mr-1.5 h-4 w-4" />
                  Setores
                </Link>
              </Button>
            ) : null}
            {!isSectorRole ? (
              <Button asChild size="sm" className="hidden rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90 sm:inline-flex">
                <Link href="/pedidos/novo">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Novo
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />
        </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden px-2 py-3 sm:px-3 md:px-4 md:py-4">
        {loading ? (
          <p className="py-16 text-center text-sm text-[var(--wq-text-muted)]">Carregando board…</p>
        ) : columns.length === 0 ? (
          <div className="rounded-2xl border border-[var(--wq-border)] bg-white p-6 text-center sm:p-8">
            <p className="text-[var(--wq-text-muted)]">Cadastre setores para montar o kanban.</p>
            <Button asChild className="mt-4 bg-[var(--wq-action)]">
              <Link href="/settings/setores">Configurar setores</Link>
            </Button>
          </div>
        ) : (
          <>
            {filterDate &&
            columns.every((c) => filterOrders(c.orders, filterLate, codeQuery, filterDate).length === 0) ? (
              <p className="mb-3 shrink-0 text-center text-sm text-[var(--wq-text-muted)]">
                Nenhum pedido entrou nessa data.
              </p>
            ) : null}
            {columns.every((c) => filterOrders(c.orders, filterLate, codeQuery, filterDate).length === 0) &&
            !codeQuery.trim() &&
            !filterDate &&
            !isSectorRole ? (
              <div className="mb-3 shrink-0 rounded-2xl border border-dashed border-[var(--wq-border)] bg-white px-4 py-5 text-center">
                <p className="font-medium text-[var(--wq-text)]">Fila vazia</p>
                <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
                  Crie um pedido para ver o board em ação.
                </p>
                <Button asChild className="mt-3 rounded-[10px] bg-[var(--wq-action)]">
                  <Link href="/pedidos/novo">Novo pedido</Link>
                </Button>
              </div>
            ) : null}
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            {/* Mobile: sector chips + one column */}
            <div className="flex min-h-0 flex-1 flex-col space-y-3 md:hidden">
              <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
                {columns.map((col) => {
                  const active = col.sector._id === activeSectorId
                  const visible = filterOrders(col.orders, filterLate, codeQuery, filterDate)
                  const columnValue = visible.reduce((sum, order) => sum + (Number(order.lineValue) || 0), 0)
                  const columnPending = visible.reduce((sum, order) => sum + (Number(order.linePending) || 0), 0)
                  return (
                    <button
                      key={col.sector._id}
                      type="button"
                      onClick={() => setActiveSectorId(col.sector._id)}
                      className={cn(
                        "flex shrink-0 flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-sm font-medium",
                        active
                          ? "bg-[var(--wq-brand)] text-white"
                          : "border border-[var(--wq-border)] bg-white text-[var(--wq-text)]"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: col.sector.color }} />
                        <span className="max-w-[9rem] truncate">{col.sector.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {visible.length}
                        </Badge>
                      </span>
                      {showColumnMoney ? (
                        <span className={cn("font-mono text-[10px] tabular-nums leading-tight", active ? "text-white/90" : "text-[var(--wq-text-muted)]")}>
                          Total {formatBRL(columnValue)}
                          <span className={cn("block", !active && columnPending > 0.009 && "text-amber-800")}>
                            A pagar {formatBRL(columnPending)}
                          </span>
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              {activeColumn && (
                <DroppableColumn
                  column={activeColumn}
                  filterLate={filterLate}
                  query={codeQuery}
                  onDate={filterDate}
                  dragEnabled={false}
                  focusedCardId={focusedCardId}
                  onFocusCard={setFocusedCardId}
                  onOpenCard={openDetail}
                  sectorNameById={sectorNameById}
                  compact
                  showPending={showColumnMoney}
                  onMarkDelivered={requestDeliver}
                  onNotifyReady={notifyReady}
                />
              )}
              {focusedCardId && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-[10px]"
                    disabled={activeIndex <= 0}
                    onClick={() => {
                      const card = findCard(focusedCardId)
                      if (card) moveRelative(card, -1)
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-[10px]"
                    onClick={() => {
                      const card = findCard(focusedCardId)
                      if (card) openDetail(card)
                    }}
                  >
                    Detalhe
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-[10px]"
                    disabled={activeIndex < 0 || activeIndex >= columns.length - 1}
                    onClick={() => {
                      const card = findCard(focusedCardId)
                      if (card) moveRelative(card, 1)
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Desktop: multi-column board — full width */}
            <div className="hidden min-h-0 flex-1 gap-3 overflow-x-auto pb-1 md:flex">
              {columns.map((col) => (
                <DroppableColumn
                  key={col.sector._id}
                  column={col}
                  filterLate={filterLate}
                  query={codeQuery}
                  onDate={filterDate}
                  dragEnabled
                  focusedCardId={focusedCardId}
                  onFocusCard={setFocusedCardId}
                  onOpenCard={openDetail}
                  sectorNameById={sectorNameById}
                  showPending={showColumnMoney}
                  onMarkDelivered={requestDeliver}
                  onNotifyReady={notifyReady}
                />
              ))}
            </div>

            <DragOverlay>
              {dragCard ? (
                <div className="w-[300px] rotate-1 scale-105 opacity-95">
                  <KanbanCardBody
                    order={dragCard}
                    columnSectorId={String(dragCard.currentSectorId || "")}
                    sectorNameById={sectorNameById}
                    showPayment={showColumnMoney}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          </>
        )}
      </div>

      {detailOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setDetailOpen(false)}>
          <aside
            className="flex h-full w-full max-w-md flex-col bg-[var(--wq-surface)] shadow-xl text-[var(--wq-text)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--wq-border)] px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--wq-text-muted)]">Pedido</p>
                <p className="font-mono text-2xl font-semibold">{detail?.code || "…"}</p>
              </div>
              <button type="button" onClick={() => setDetailOpen(false)} className="rounded-lg p-2 hover:bg-[var(--wq-paper)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {detailLoading || !detail ? (
                <p className="text-sm text-[var(--wq-text-muted)]">Carregando…</p>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-[var(--wq-text)]">
                      {detail.clientName || detail.client?.nomeCompleto || detail.client?.name || "Cliente"}
                    </p>
                    {moneyTone !== "hidden" ? (
                      <div className={moneyTone === "quiet" ? "mt-1" : "mt-3"}>
                        {readOrderPricing(detail).total <= 0.009 ? (
                          <p className="mb-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-950">
                            Pendente valor
                          </p>
                        ) : readOrderPricing(detail).remaining > 0.009 ? (
                          <p className="mb-2 text-sm font-medium text-amber-950">
                            Ainda não pago. Falta {formatBRL(readOrderPricing(detail).remaining)}.
                          </p>
                        ) : (
                          <p className="mb-2 text-sm font-medium text-emerald-700">Pago</p>
                        )}
                        <OrderPricingSummary
                          order={detail}
                          tone={moneyTone === "quiet" ? "quiet" : "explicit"}
                        />
                        <div className="mt-3 space-y-2">
                          <Label htmlFor="detail-price">Valor do pedido</Label>
                          <div className="flex items-center gap-2">
                            <MoneyField
                              id="detail-price"
                              value={detailPrice}
                              onValue={setDetailPrice}
                              className="rounded-[10px] text-base font-semibold"
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={savingPrice}
                              className="shrink-0 rounded-[10px] bg-[var(--wq-action)] text-white"
                              onClick={requestDetailPrice}
                            >
                              {savingPrice ? "Salvando…" : "Salvar valor"}
                            </Button>
                          </div>
                          <p className="text-xs text-[var(--wq-text-muted)]">
                            Sem valor, o laudo não sai. Ao mudar o preço, dá para escolher se envia o laudo.
                          </p>
                          {readOrderPricing(detail).total > 0.009 ? (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={readOrderPricing(detail).remaining <= 0.009 ? "default" : "outline"}
                                disabled={savingPrice}
                                className="rounded-[10px]"
                                onClick={() => void markSettlement(true)}
                              >
                                Pago
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={readOrderPricing(detail).remaining > 0.009 ? "default" : "outline"}
                                disabled={savingPrice}
                                className="rounded-[10px]"
                                onClick={() => void markSettlement(false)}
                              >
                                Em aberto
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {detail.dueAt && (
                      <p
                        className={cn(
                          "text-xs",
                          new Date(detail.dueAt).getTime() < Date.now()
                            ? "font-semibold text-rose-700"
                            : "text-[var(--wq-text-muted)]"
                        )}
                      >
                        Prazo {new Date(detail.dueAt).toLocaleDateString("pt-BR")}
                        {new Date(detail.dueAt).getTime() < Date.now() ? " · atrasado" : ""}
                      </p>
                    )}
                    {(detail.items || []).length > 0 ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">
                          Pares, serviços e observações
                        </p>
                        {(detail.items || []).map((item, itemIndex) => {
                          const focused =
                            (detailItemIndex != null && detailItemIndex === itemIndex) ||
                            (detailItemId != null && itemIdentity(item) === String(detailItemId))
                          return (
                            <div
                              key={item.id || item._id || itemIndex}
                              className={cn(
                                "rounded-xl border px-3 py-2",
                                focused
                                  ? "border-[var(--wq-border)] border-l-[3px] border-l-[var(--wq-text)] bg-[var(--wq-paper)]"
                                  : "border-[var(--wq-border)] bg-[var(--wq-paper)]"
                              )}
                            >
                              <p className="text-sm font-semibold text-[var(--wq-text)]">
                                Par {itemIndex + 1}
                                {[item.brand, item.shoeModel].filter(Boolean).length
                                  ? ` · ${[item.brand, item.shoeModel].filter(Boolean).join(" ")}`
                                  : ""}
                              </p>
                              {item.notes ? (
                                <p className="mt-1 text-xs text-[var(--wq-text)]">Obs. do par: {item.notes}</p>
                              ) : (
                                <p className="mt-1 text-xs text-[var(--wq-text-muted)]">Sem observação neste par</p>
                              )}
                              <ul className="mt-2 space-y-2">
                                {(item.services || []).length === 0 ? (
                                  <li className="text-xs text-[var(--wq-text-muted)]">Nenhum serviço neste par</li>
                                ) : (
                                  (item.services || []).map((service, serviceIndex) => {
                                    const orderHasPrice = readOrderPricing(detail).total > 0.009
                                    const pending = !orderHasPrice && (Number(service.price) || 0) <= 0.009
                                    return (
                                      <li key={`${service.id || service.name}-${serviceIndex}`}>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-sm text-[var(--wq-text)]">{service.name || "Serviço"}</span>
                                          {moneyTone !== "hidden" && pending ? (
                                            <Badge className="border-0 bg-amber-100 text-[10px] font-semibold text-amber-950">
                                              Pendente valor
                                            </Badge>
                                          ) : null}
                                          {moneyTone !== "hidden" && !pending ? (
                                            <span className="font-mono text-xs text-[var(--wq-text-muted)]">
                                              {formatBRL(Number(service.price) || 0)}
                                            </span>
                                          ) : null}
                                        </div>
                                        {service.note ? (
                                          <p className="mt-0.5 text-sm leading-snug text-[var(--wq-text)]">{service.note}</p>
                                        ) : null}
                                        {moneyTone !== "hidden" && pending ? (
                                          <ServicePriceField
                                            price={Number(service.price) || 0}
                                            busy={savingServiceKey === `${itemIndex}:${serviceIndex}`}
                                            onSave={(next) => void saveServicePrice(itemIndex, serviceIndex, next)}
                                          />
                                        ) : null}
                                      </li>
                                    )
                                  })
                                )}
                              </ul>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-[10px]"
                        onClick={async () => {
                          const slug = localStorage.getItem("shopSlug") || ""
                          const code = detail.code || ""
                          const link = buildPublicOrderUrl(
                            window.location.origin,
                            slug,
                            code,
                            detail.publicToken
                          )
                          if (!link || !detail.publicToken) {
                            toast.error("Token do link ainda não disponível — reabra o pedido")
                            return
                          }
                          try {
                            await navigator.clipboard.writeText(link)
                            toast.success("Link público copiado")
                          } catch {
                            toast.message(link)
                          }
                        }}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copiar link
                      </Button>
                      {ENABLE_WA_ME ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-[10px]"
                          onClick={() => {
                            const phone =
                              detail.clientPhone ||
                              detail.client?.phone ||
                              detail.client?.telefone ||
                              ""
                            const code = detail.code || ""
                            const isReady = detail.status === "ready"
                            const built = buildOrderWaFromShop({
                              shop: shopDoc,
                              phone,
                              code,
                              publicToken: detail.publicToken,
                              clientName:
                                detail.clientName ||
                                detail.client?.nomeCompleto ||
                                detail.client?.name ||
                                "",
                              sectorName:
                                sectorNameById.get(detailCurrentSectorId) || "",
                              templateKey: isReady ? "ready" : "publicLink",
                              requireEnabled: false,
                            })
                            if (!built?.url) {
                              toast.error("Cliente sem telefone válido")
                              return
                            }
                            window.open(built.url, "_blank", "noopener,noreferrer")
                          }}
                        >
                          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                          WhatsApp
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-[10px]"
                        disabled={resendingEmail}
                        onClick={async () => {
                          if (!detail.id) return
                          const email = detailClientEmail.trim()
                          if (!email) {
                            toast.error("Informe o e-mail e salve antes de reenviar")
                            return
                          }
                          setResendingEmail(true)
                          try {
                            const updated = await updateOrderService(String(detail.id), {
                              clientEmail: email,
                            })
                            setDetail(updated as DetailOrder)
                            const result = await resendOrderEmailV1(String(detail.id), "created")
                            const notify = result?.emailNotify || result
                            if (notify?.queued) {
                              toast.success(`Laudo a caminho para ${email}`)
                            } else if (notify?.ok && notify?.provider !== "console") {
                              toast.success(`Laudo reenviado para ${email}`)
                            } else if (notify?.ok) {
                              toast.message("E-mail só foi para o log da API")
                            } else {
                              toast.error(notify?.error || notify?.reason || "Não enviou o laudo")
                            }
                          } catch (err: any) {
                            toast.error(err?.message || "Falha ao reenviar o laudo")
                          } finally {
                            setResendingEmail(false)
                          }
                        }}
                      >
                        <Mail className="mr-1.5 h-3.5 w-3.5" />
                        {resendingEmail ? "Reenviando…" : "Reenviar laudo"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-[10px]"
                        onClick={async () => {
                          if (!detail.id) return
                          try {
                            const blob = await generateOrderPDFService(detail.id)
                            downloadBlobAsFile(blob, `laudo-${detail.code || detail.id}.pdf`)
                            toast.success("Laudo gerado")
                          } catch (err: any) {
                            toast.error(err?.message || "Falha ao gerar laudo")
                          }
                        }}
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Laudo
                      </Button>
                      <Button asChild size="sm" variant="outline" className="rounded-[10px]">
                        <Link href={`/pedidos/${detail.id}/etiqueta?print=1`}>
                          <Printer className="mr-1.5 h-3.5 w-3.5" />
                          Imprimir
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="rounded-[10px]">
                        <Link href={`/pedidos?q=${encodeURIComponent(detail.code || "")}`}>
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Pedidos
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div>
                    {(() => {
                      const pairFocus = (() => {
                        if (detailItemIndex != null) return detailItemIndex
                        if (!detailItemId) return null
                        const i = (detail.items || []).findIndex(
                          (it) => itemIdentity(it) === String(detailItemId)
                        )
                        return i >= 0 ? i : null
                      })()
                      const onlyThisPair = pairFocus != null && !showAllOrderPhotos
                      return (
                        <>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">
                            {onlyThisPair ? "QR deste par" : "QR de cada par"}
                          </p>
                          <KanbanPairQrs
                            code={String(detail.code || "")}
                            token={String(detail.publicToken || "")}
                            slug={String(
                              shopDoc?.slug ||
                                (typeof window !== "undefined"
                                  ? localStorage.getItem("shopSlug")
                                  : "") ||
                                ""
                            )}
                            items={(detail.items || []).map((it) => ({ shoeModel: it.shoeModel }))}
                            focusIndex={pairFocus}
                            onlyIndex={onlyThisPair ? pairFocus : null}
                          />
                        </>
                      )
                    })()}
                  </div>

                  {(() => {
                    const viewingItem = Boolean(detailItemId || detailItemIndex != null)
                    const photos = collectOrderPhotos(
                      detail,
                      viewingItem && !showAllOrderPhotos ? detailItemId : null,
                      viewingItem && !showAllOrderPhotos ? detailItemIndex : null
                    )
                    const focusLabel =
                      viewingItem && !showAllOrderPhotos
                        ? (() => {
                            const byId = detailItemId
                              ? detail.items?.find((it) => itemIdentity(it) === String(detailItemId))
                              : null
                            const byIdx =
                              detailItemIndex != null ? detail.items?.[detailItemIndex] : null
                            return (byId || byIdx)?.shoeModel || null
                          })()
                        : null
                    return (
                      <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">
                            Fotos
                            {focusLabel ? ` · ${focusLabel}` : showAllOrderPhotos || !viewingItem ? " · pedido" : ""}
                            {photos.length ? ` (${photos.length})` : ""}
                          </p>
                          {viewingItem && (detail.items?.length || 0) > 1 ? (
                            <button
                              type="button"
                              className="text-[11px] font-medium text-[var(--wq-brand-text)] hover:underline"
                              onClick={() => setShowAllOrderPhotos((v) => !v)}
                            >
                              {showAllOrderPhotos ? "Só este par" : "Ver pedido inteiro"}
                            </button>
                          ) : null}
                        </div>
                        {photos.length === 0 ? (
                          <p className="text-xs text-[var(--wq-text-muted)]">
                            Nenhuma foto neste{" "}
                            {viewingItem && !showAllOrderPhotos ? "item" : "pedido"}.
                          </p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {photos.map((ph) => {
                              const busyKey = `${ph.itemIndex}:${ph.photoIndex}`
                              return (
                                <div
                                  key={busyKey}
                                  className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]"
                                >
                                  <a
                                    href={ph.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block h-full w-full"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={ph.url}
                                      alt={`Foto ${ph.photoIndex + 1}`}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  </a>
                                  {ph.storedOnItem !== false ? (
                                    <button
                                      type="button"
                                      className="absolute inset-x-0 bottom-0 bg-[var(--wq-ink)]/60 py-0.5 text-[10px] font-semibold text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                      disabled={photoBusy === busyKey}
                                      onClick={() => onDeleteDetailPhoto(ph.itemIndex, ph.photoIndex)}
                                    >
                                      {photoBusy === busyKey ? "…" : "Remover"}
                                    </button>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">
                      Caminho planejado
                      {focusedDetailItem?.shoeModel
                        ? ` · ${focusedDetailItem.shoeModel}`
                        : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {plannedPathIds.map((sid) => {
                        const current = detailCurrentSectorId === sid
                        const visited = (
                          focusedDetailItem?.sectorHistory ||
                          detail.sectorHistory ||
                          []
                        )
                          .map((h) => String(h.sectorId || ""))
                          .includes(sid)
                        return (
                          <span
                            key={sid}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs",
                              current
                                ? "border-[var(--wq-brand)] bg-[var(--wq-brand)] text-white"
                                : visited
                                  ? "border-[var(--wq-brand)]/40 bg-[var(--wq-brand-soft)] text-[var(--wq-text)]"
                                  : "border-[var(--wq-border)] text-[var(--wq-text-muted)]"
                            )}
                          >
                            {visited && !current ? "✓ " : ""}
                            {sectorNameById.get(sid) || sid.slice(-4)}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">
                      {isSectorRole ? "Encaminhar — no plano" : "Mover — no plano"}
                    </p>
                    {isSectorRole && (
                      <p className="mb-2 text-xs text-[var(--wq-text-muted)]">
                        Você não vê a fila de destino — só envia o pedido. Quem encaminhou fica no
                        histórico.
                      </p>
                    )}
                    <div className="grid gap-2">
                      {plannedMoveTargets.length === 0 && (
                        <p className="text-xs text-[var(--wq-text-muted)]">Nenhum destino no plano.</p>
                      )}
                      {plannedMoveTargets.map((t) => renderMoveButton(t, true))}
                    </div>
                  </div>

                  {offPlanMoveTargets.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">
                        Fora do plano
                      </p>
                      <p className="mb-2 text-xs text-[var(--wq-text-muted)]">
                        Exige comentário ao confirmar o move.
                      </p>
                      <div className="grid gap-2">
                        {offPlanMoveTargets.map((t) => renderMoveButton(t, false))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">
                        Dados rápidos
                      </p>
                      {detail.id && !isSectorRole ? (
                        <Link
                          href={`/pedidos/${detail.id}/editar`}
                          className="text-[11px] font-medium text-[var(--wq-brand-text)] hover:underline"
                        >
                          Editar completo
                        </Link>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={detailClientName}
                        onChange={(e) => setDetailClientName(e.target.value)}
                        placeholder="Cliente"
                        className="rounded-[10px] text-sm"
                      />
                      <Input
                        value={detailClientPhone}
                        onChange={(e) => setDetailClientPhone(e.target.value)}
                        placeholder="Telefone"
                        className="rounded-[10px] text-sm"
                      />
                      <Input
                        type="email"
                        value={detailClientEmail}
                        onChange={(e) => setDetailClientEmail(e.target.value)}
                        placeholder="E-mail do cliente"
                        className="rounded-[10px] text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="h-10 rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-surface)] px-2 text-sm"
                          value={detailPriority}
                          onChange={(e) => setDetailPriority(e.target.value)}
                        >
                          <option value="1">Prioridade alta</option>
                          <option value="2">Prioridade média</option>
                          <option value="3">Prioridade baixa</option>
                        </select>
                        <Input
                          type="date"
                          value={detailDueAt}
                          onChange={(e) => setDetailDueAt(e.target.value)}
                          className="rounded-[10px] text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">
                      Observação do pedido
                    </p>
                    <p className="mb-2 text-xs text-[var(--wq-text-muted)]">
                      Anote o que o cliente pediu no telefone — fica no pedido para a equipe ver.
                    </p>
                    <Textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Ex.: cliente pediu sola preta, buscar só após 18h…"
                      className="min-h-[88px] rounded-[10px] bg-[var(--wq-surface)] text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingNotes}
                      className="mt-2 rounded-[10px] bg-[var(--wq-brand)] text-white"
                      onClick={() => void saveNotes()}
                    >
                      {savingNotes ? "Salvando…" : "Salvar"}
                    </Button>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">
                      Histórico de anotações
                    </p>
                    <div className="space-y-2">
                      <Textarea
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder="Nova anotação rápida (timeline)…"
                        className="min-h-[64px] rounded-[10px] bg-[var(--wq-surface)] text-sm"
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={commenting || !commentDraft.trim()}
                        className="rounded-[10px]"
                        variant="outline"
                        onClick={submitComment}
                      >
                        {commenting ? "Salvando…" : "Adicionar anotação"}
                      </Button>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {commentsNewestFirst.length === 0 && (
                        <li className="text-xs text-[var(--wq-text-muted)]">Nenhuma anotação ainda.</li>
                      )}
                      {commentsNewestFirst.map((c, idx) => (
                        <li
                          key={c.id || `${c.createdAt}-${idx}`}
                          className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] px-3 py-2 text-xs"
                        >
                          <p className="text-[var(--wq-text)]">{c.text}</p>
                          <p className="mt-1 text-[var(--wq-text-muted)]">
                            {c.authorName || "—"}
                            {c.createdAt
                              ? ` · ${new Date(c.createdAt).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`
                              : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {historyEntries.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">
                        Histórico de setores
                      </p>
                      <ul className="space-y-2">
                        {historyEntries.map((h, idx) => {
                          const toName = sectorNameById.get(String(h.sectorId || "")) || "Setor"
                          const fromName = h.fromSectorId
                            ? sectorNameById.get(String(h.fromSectorId)) || "Setor"
                            : null
                          const who = h.movedByName || h.employeeName || "—"
                          const when = h.enteredAt
                            ? new Date(h.enteredAt).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""
                          const actionLabel =
                            h.action === "forward"
                              ? "Encaminhou"
                              : h.action === "create"
                                ? "Entrou"
                                : "Moveu"
                          return (
                            <li
                              key={`${h.sectorId}-${h.enteredAt}-${idx}`}
                              className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] px-3 py-2 text-xs"
                            >
                              <p className="font-medium text-[var(--wq-text)]">
                                {actionLabel}
                                {fromName ? ` ${fromName} → ` : " em "}
                                {toName}
                              </p>
                              <p className="mt-0.5 text-[var(--wq-text-muted)]">
                                {who}
                                {when ? ` · ${when}` : ""}
                              </p>
                              {h.note && h.note !== "created" && h.note !== "encaminhado" && (
                                <p className="mt-1 text-[var(--wq-text)]">{h.note}</p>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  <Button asChild variant="outline" className="w-full rounded-[10px]">
                    <Link href={`/pedidos/${detail.id}/etiqueta`}>Ver etiqueta</Link>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-[10px] border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                    onClick={async () => {
                      if (!detail.id) return
                      const ok = window.confirm(
                        `Excluir pedido #${detail.code || ""}?\nEle sai do kanban e vai para a lixeira em Pedidos (dá para recuperar).`
                      )
                      if (!ok) return
                      try {
                        await deleteOrderV1(String(detail.id))
                        toast.success("Pedido movido para a lixeira")
                        setDetailOpen(false)
                        setDetail(null)
                        await load()
                      } catch (err: any) {
                        toast.error(err?.message || "Não foi possível excluir")
                      }
                    }}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Excluir pedido
                  </Button>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      <Dialog open={priceAskOpen} onOpenChange={setPriceAskOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar o laudo?</DialogTitle>
            <DialogDescription>
              O valor vai para {formatBRL(roundMoney(detailPrice))}. Quer enviar o laudo para o cliente?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={savingPrice} onClick={() => void commitDetailPrice(false)}>
              Só salvar
            </Button>
            <Button
              type="button"
              disabled={savingPrice}
              className="bg-[var(--wq-action)] text-white"
              onClick={() => void commitDetailPrice(true)}
            >
              Enviar laudo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {pendingMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--wq-text)]">
              {visibleColumnIds.has(pendingMove.toSectorId) ? "Mover" : "Encaminhar"} para{" "}
              {pendingMove.toSectorName}?
            </h3>
            <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
              Este setor está fora do fluxo planejado. Registre um comentário no histórico
              {isSectorRole && !visibleColumnIds.has(pendingMove.toSectorId)
                ? " (você não verá a fila de destino)."
                : "."}
            </p>
            <div className="mt-4 space-y-2">
              <Label htmlFor="off-path-note">Comentário *</Label>
              <Input
                id="off-path-note"
                value={offPathNote}
                onChange={(e) => setOffPathNote(e.target.value)}
                placeholder="Ex.: cliente pediu priorizar pintura"
                className="rounded-[10px]"
                autoFocus
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPendingMove(null)
                  setOffPathNote("")
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={moving || !offPathNote.trim()}
                className="bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
                onClick={() =>
                  executeMove(
                    pendingMove.orderId,
                    pendingMove.toSectorId,
                    offPathNote.trim(),
                    pendingMove.itemId
                  )
                }
              >
                Confirmar move
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(deliverPrompt)}
        onOpenChange={(open) => {
          if (!open && !deliverBusy) setDeliverPrompt(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Já foi pago?</DialogTitle>
            <DialogDescription>
              {deliverPrompt ? orderCode(deliverPrompt) : "Este pedido"} ainda tem valor em aberto.
              {Number(deliverPrompt?.itemCount) > 1
                ? " Entregar encerra o pedido inteiro."
                : ""}
            </DialogDescription>
          </DialogHeader>
          <p className="text-center text-4xl font-semibold tabular-nums tracking-tight text-amber-800">
            {formatBRL(deliverPrompt ? amountDue(deliverPrompt) : 0)}
          </p>
          <p className="text-center text-sm text-[var(--wq-text-muted)]">
            Falta receber neste pedido.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              disabled={deliverBusy}
              className="h-11 bg-emerald-700 text-white hover:bg-emerald-800"
              onClick={() => {
                if (deliverPrompt) void markDelivered(deliverPrompt, "paid")
              }}
            >
              Cliente já pagou o restante
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={deliverBusy}
              className="h-11"
              onClick={() => {
                if (deliverPrompt) void markDelivered(deliverPrompt, "none")
              }}
            >
              Entregar mesmo assim
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={deliverBusy}
              onClick={() => setDeliverPrompt(null)}
            >
              Voltar
            </Button>
            {deliverPrompt && orderId(deliverPrompt) ? (
              <Link
                href={`/pedidos/${orderId(deliverPrompt)}/editar`}
                className="pt-1 text-center text-sm text-[var(--wq-brand-text)] underline"
              >
                Recebeu só uma parte? Ajustar o valor
              </Link>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addOrderCommentV1, deleteOrderV1, getKanbanV1, getShopCurrentV1, moveKanbanOrderV1 } from "@/lib/apiV1"
import { getPedidoService, generateOrderPDFService, downloadBlobAsFile, updateOrderService } from "@/lib/apiService"
import { shouldIgnoreKanbanShortcut } from "@/lib/kanbanShortcuts"
import { toast } from "sonner"
import { cn, pairCount } from "@/lib/utils"
import { buildOrderWaFromShop, type ShopWaDoc } from "@/lib/orderWhatsApp"
import { ENABLE_WA_ME } from "@/lib/featureFlags"
import { buildPublicOrderUrl } from "@/lib/publicOrderLink"

type OrderCard = {
  _id?: string
  id?: string
  code?: string
  codigo?: string
  publicToken?: string | null
  clientName?: string
  clientPhone?: string
  shoeModel?: string
  modeloTenis?: string
  priority?: number
  dueAt?: string
  itemCount?: number
  items?: unknown[]
  plannedSectorIds?: string[]
  currentSectorId?: string
  reopened?: boolean
  feedbackScore?: number | null
  status?: string
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
    shoeModel?: string
    services?: Array<{ name?: string; price?: number }>
    photos?: Array<string | { url?: string }>
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

function collectOrderPhotoUrls(order: DetailOrder | null | undefined): string[] {
  if (!order) return []
  const urls: string[] = []
  const push = (u: unknown) => {
    if (typeof u === "string" && u.trim()) urls.push(u.trim())
    else if (u && typeof u === "object" && typeof (u as { url?: string }).url === "string") {
      const url = String((u as { url?: string }).url || "").trim()
      if (url) urls.push(url)
    }
  }
  for (const u of order.fotos || []) push(u)
  for (const u of order.photos || []) push(u)
  for (const it of order.items || []) {
    for (const u of it.photos || []) push(u)
  }
  return [...new Set(urls)]
}

function orderId(o: OrderCard) {
  return String(o._id || o.id || "")
}

function orderCode(o: OrderCard) {
  return o.code || o.codigo || "—"
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

function filterOrders(orders: OrderCard[], filterLate: boolean) {
  if (!filterLate) return orders
  const now = Date.now()
  return orders.filter((o) => o.dueAt && new Date(o.dueAt).getTime() < now)
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
}) {
  const late = order.dueAt && new Date(order.dueAt).getTime() < Date.now()
  const pairs = pairCount(order)
  const cue = routeCue(order, columnSectorId || "", sectorNameById || new Map())
  const showDeliver =
    Boolean(isTerminalColumn) &&
    (order.status === "ready" || !order.status) &&
    Boolean(onMarkDelivered)
  const showNotify =
    ENABLE_WA_ME &&
    Boolean(isTerminalColumn) &&
    (order.status === "ready" || !order.status) &&
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
              {pairs} pares
            </Badge>
          )}
          {!cue.offFlow && cue.stepLabel && (
            <span className="font-mono text-[10px] text-[var(--wq-text-muted)]">{cue.stepLabel}</span>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-[var(--wq-text)]">{order.clientName || "Cliente"}</p>
        {(order.shoeModel || order.modeloTenis) && (
          <p className="truncate text-xs text-[var(--wq-text-muted)]">
            {order.shoeModel || order.modeloTenis}
          </p>
        )}
        {!cue.offFlow && cue.nextLabel && (
          <p
            className={cn(
              "mt-1.5 truncate text-[11px] font-medium",
              cue.nextLabel === "Fim do fluxo"
                ? "text-[var(--wq-success)]"
                : "text-[var(--wq-brand)]"
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
}) {
  const id = orderId(order)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <KanbanCardBody
        order={order}
        focused={focused}
        dragging={isDragging}
        onFocus={onFocus}
        onOpen={onOpen}
        dragHandleProps={{ ...listeners, ...attributes }}
        columnSectorId={columnSectorId}
        sectorNameById={sectorNameById}
        isTerminalColumn={isTerminalColumn}
        onMarkDelivered={onMarkDelivered}
        onNotifyReady={onNotifyReady}
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
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.sector._id })
  const orders = filterOrders(column.orders, filterLate)
  const isTerminal = Boolean(column.sector.isTerminal)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-[calc(100vh-11rem)] flex-col rounded-2xl border bg-[var(--wq-paper)]/60",
        compact ? "w-full" : "min-w-[300px] w-[min(360px,28vw)] flex-1",
        isOver ? "border-[var(--wq-action)] ring-2 ring-[var(--wq-action)]/30" : "border-[var(--wq-border)]"
      )}
    >
      <div className="flex items-center gap-2 border-b border-[var(--wq-border)] px-3 py-2.5">
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
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {orders.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-[var(--wq-text-muted)]">Vazio</p>
        )}
        {orders.map((o) => (
          <DraggableCard
            key={orderId(o)}
            order={o}
            focused={focusedCardId === orderId(o)}
            onFocus={() => onFocusCard(orderId(o))}
            onOpen={() => onOpenCard(o)}
            columnSectorId={column.sector._id}
            sectorNameById={sectorNameById}
            isTerminalColumn={isTerminal}
            onMarkDelivered={onMarkDelivered}
            onNotifyReady={onNotifyReady}
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
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<DetailOrder | null>(null)
  const isSectorRole = membershipRole === "sector"

  const [pendingMove, setPendingMove] = useState<{
    orderId: string
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
  const [shopDoc, setShopDoc] = useState<ShopWaDoc | null>(null)

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
          clientPhone: o.clientPhone || o.client?.phone || o.client?.telefone || "",
          currentSectorId: o.currentSectorId
            ? String(o.currentSectorId._id || o.currentSectorId)
            : String(c.sector?._id || c.sector?.id || ""),
          plannedSectorIds: Array.isArray(o.plannedSectorIds)
            ? o.plannedSectorIds.map(String)
            : [],
          reopened: Boolean(o.reopened),
          status: o.status,
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
    return filterOrders(activeColumn?.orders || [], filterLate)
  }, [activeColumn, filterLate])

  useEffect(() => {
    if (!visibleOrders.length) {
      setFocusedCardId(null)
      return
    }
    setFocusedCardId((prev) => {
      if (prev && visibleOrders.some((o) => orderId(o) === prev)) return prev
      return orderId(visibleOrders[0])
    })
  }, [visibleOrders])

  const findCard = (id: string) => {
    for (const col of columns) {
      const found = col.orders.find((o) => orderId(o) === id)
      if (found) return found
    }
    return null
  }

  const findCardSector = (id: string) => {
    for (const col of columns) {
      if (col.orders.some((o) => orderId(o) === id)) return col.sector._id
    }
    return null
  }

  const markDelivered = async (order: OrderCard) => {
    const id = orderId(order)
    if (!id) return
    try {
      await updateOrderService(id, {
        status: "delivered",
        deliveredAt: new Date().toISOString(),
      })
      toast.success(`${orderCode(order)} marcado como entregue`)
      if (detailOpen && detail && String(detail.id) === id) {
        setDetailOpen(false)
        setDetail(null)
      }
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao marcar entregue")
    }
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

  const executeMove = async (orderIdValue: string, toSectorId: string, note?: string) => {
    setMoving(true)
    try {
      const moved: any = await moveKanbanOrderV1(orderIdValue, { toSectorId, note })
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

  const requestMove = async (toSectorId: string, orderIdValue?: string | null) => {
    const id = orderIdValue
    if (!id || !toSectorId) return
    const from =
      findCardSector(id) ||
      (detail && String(detail.id) === id ? String(detail.currentSectorId || "") : "")
    if (from && from === toSectorId) return
    const card = findCard(id)
    const toName = sectorNameById.get(toSectorId) || "setor"
    const source = detail && String(detail.id) === id ? detail : card
    if (isOffPath(source, toSectorId)) {
      setPendingMove({
        orderId: id,
        toSectorId,
        toSectorName: toName,
        card,
      })
      setOffPathNote("")
      return
    }
    await executeMove(id, toSectorId)
  }

  const moveRelative = async (order: OrderCard, dir: -1 | 1) => {
    const idx = activeIndex
    const target = columns[idx + dir]
    if (!target) {
      toast.message(dir < 0 ? "Já é o primeiro setor" : "Já é o último setor")
      return
    }
    await requestMove(target.sector._id, orderId(order))
  }

  const openDetail = async (order: OrderCard) => {
    const id = orderId(order)
    if (!id) return
    setFocusedCardId(id)
    setDetailOpen(true)
    setDetailLoading(true)
    setCommentDraft("")
    setNotesDraft("")
    try {
      const data = await getPedidoService(id)
      setDetail(data)
      setNotesDraft(String(data?.notes || data?.observacoes || ""))
    } catch (err: any) {
      toast.error(err?.message || "Erro ao abrir detalhe")
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const saveNotes = async () => {
    if (!detail?.id) return
    setSavingNotes(true)
    try {
      const updated = await updateOrderService(String(detail.id), { notes: notesDraft })
      setDetail(updated as DetailOrder)
      toast.success("Observação salva")
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar observação")
    } finally {
      setSavingNotes(false)
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
        const el = document.querySelector<HTMLInputElement>('input[aria-label="Buscar código no kanban"]')
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
        const ids = visibleOrders.map(orderId)
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
        const card = visibleOrders.find((o) => orderId(o) === focusedCardId)
        if (card) openDetail(card)
        return
      }

      if (e.key === "n" && focusedCardId) {
        e.preventDefault()
        const card = visibleOrders.find((o) => orderId(o) === focusedCardId)
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

  const jumpToCode = () => {
    const q = codeQuery.trim().toLowerCase()
    if (!q) return
    for (const col of columns) {
      const found = col.orders.find((o) => orderCode(o).toLowerCase().includes(q))
      if (found) {
        setActiveSectorId(col.sector._id)
        setFocusedCardId(orderId(found))
        openDetail(found)
        toast.success(`Pedido ${orderCode(found)}`)
        return
      }
    }
    toast.message("Código não encontrado no board")
  }

  const plannedIds = (detail?.plannedSectorIds || []).map(String)
  const dragCard = activeDragId ? findCard(activeDragId) : null
  const plannedPathIds = plannedIds.length
    ? plannedIds
    : forwardTargets.map((t) => t.id)
  const historyEntries = [...(detail?.sectorHistory || [])].reverse()
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
    const isCurrent = String(detail.currentSectorId) === target.id
    const blind = isSectorRole && !visibleColumnIds.has(target.id)
    return (
      <button
        key={`move-${target.id}`}
        type="button"
        disabled={isCurrent || moving}
        onClick={() => requestMove(target.id, String(detail.id))}
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
      <div className="relative flex h-[calc(100dvh-3.5rem-4.75rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[360px] flex-col md:h-[calc(100vh-0px)] md:min-h-[640px]">
        <div className="shrink-0 border-b border-[var(--wq-border)] bg-[var(--wq-paper)] px-3 pt-0 sm:px-4 md:px-6">
          <AppHeader
            title="Kanban"
            subtitle={
              isSectorRole
                ? "Sua fila · abra o pedido para encaminhar"
                : "Board · arraste · atalhos j/k · 1-9 · Enter · n"
            }
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--wq-text-muted)]" />
              <Input
                value={codeQuery}
                onChange={(e) => setCodeQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    jumpToCode()
                  }
                  if (e.key === "/") {
                    e.stopPropagation()
                  }
                }}
                placeholder="Código…"
                className="h-8 w-full rounded-[10px] pl-8 text-sm sm:w-[120px] md:w-[140px]"
                aria-label="Buscar código no kanban"
              />
            </div>
            <Button
              variant={filterLate ? "default" : "outline"}
              size="sm"
              className={cn("rounded-[10px]", filterLate && "bg-[var(--wq-warn)]")}
              onClick={() => setFilterLate((v) => !v)}
            >
              <span className="sm:hidden">Atrasados</span>
              <span className="hidden sm:inline">Só atrasados</span>
            </Button>
            <Button variant="outline" size="sm" className="rounded-[10px]" onClick={load}>
              <RefreshCw className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
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

      <div className="flex min-h-0 flex-1 flex-col px-3 py-3 md:px-4 md:py-4">
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
            {columns.every((c) => filterOrders(c.orders, filterLate).length === 0) && !isSectorRole ? (
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
                  return (
                    <button
                      key={col.sector._id}
                      type="button"
                      onClick={() => setActiveSectorId(col.sector._id)}
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
                        active
                          ? "bg-[var(--wq-brand)] text-white"
                          : "border border-[var(--wq-border)] bg-white text-[var(--wq-text)]"
                      )}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: col.sector.color }} />
                      <span className="max-w-[9rem] truncate">{col.sector.name}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {filterOrders(col.orders, filterLate).length}
                      </Badge>
                    </button>
                  )
                })}
              </div>
              {activeColumn && (
                <DroppableColumn
                  column={activeColumn}
                  filterLate={filterLate}
                  focusedCardId={focusedCardId}
                  onFocusCard={setFocusedCardId}
                  onOpenCard={openDetail}
                  sectorNameById={sectorNameById}
                  compact
                  onMarkDelivered={markDelivered}
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
                  focusedCardId={focusedCardId}
                  onFocusCard={setFocusedCardId}
                  onOpenCard={openDetail}
                  sectorNameById={sectorNameById}
                  onMarkDelivered={markDelivered}
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
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          </>
        )}
      </div>

      {detailOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={() => setDetailOpen(false)}>
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

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
              {detailLoading || !detail ? (
                <p className="text-sm text-[var(--wq-text-muted)]">Carregando…</p>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-[var(--wq-text)]">
                      {detail.clientName || detail.client?.nomeCompleto || detail.client?.name || "Cliente"}
                    </p>
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
                                sectorNameById.get(String(detail.currentSectorId || "")) || "",
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

                  {(() => {
                    const photoUrls = collectOrderPhotoUrls(detail)
                    return (
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">
                          Fotos {photoUrls.length ? `(${photoUrls.length})` : ""}
                        </p>
                        {photoUrls.length === 0 ? (
                          <p className="text-xs text-[var(--wq-text-muted)]">
                            Nenhuma foto neste pedido.
                          </p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {photoUrls.map((url, idx) => (
                              <a
                                key={`${url}-${idx}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="aspect-square overflow-hidden rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`Foto ${idx + 1} do pedido ${detail.code || ""}`}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">
                      Caminho planejado
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {plannedPathIds.map((sid) => {
                        const current = String(detail.currentSectorId) === sid
                        const visited = (detail.sectorPath || []).map(String).includes(sid)
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
                      {savingNotes ? "Salvando…" : "Salvar observação"}
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
                  executeMove(pendingMove.orderId, pendingMove.toSectorId, offPathNote.trim())
                }
              >
                Confirmar move
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

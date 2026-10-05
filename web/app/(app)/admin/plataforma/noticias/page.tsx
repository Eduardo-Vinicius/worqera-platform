"use client"

import { useEffect, useState } from "react"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  createPlatformNoticeV1,
  deletePlatformNoticeV1,
  listPlatformNoticesV1,
  meV1,
  type PlatformNotice,
} from "@/lib/apiV1"
import { toast } from "sonner"

const EMPTY = {
  title: "",
  body: "",
  startsAt: "",
  endsAt: "",
  intervalHours: "0",
  region: "",
  platform: "all",
  minVersion: "",
  maxVersion: "",
}

function formatWhen(value?: string | null) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

export default function PlatformNoticesPage() {
  const [allowed, setAllowed] = useState(false)
  const [notices, setNotices] = useState<PlatformNotice[]>([])
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const me = await meV1()
    if (!me?.platformAdmin) {
      setAllowed(false)
      toast.error("Acesso restrito ao time Worqera")
      return
    }
    setAllowed(true)
    const res = await listPlatformNoticesV1()
    setNotices(res.notices || [])
  }

  useEffect(() => {
    load().catch((err) => toast.error(err?.message || "Falha ao carregar notícias"))
  }, [])

  const set = (key: keyof typeof EMPTY, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const publish = async () => {
    if (!form.title.trim()) {
      toast.error("Informe o título")
      return
    }
    setBusy(true)
    try {
      await createPlatformNoticeV1({
        title: form.title.trim(),
        body: form.body.trim(),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        intervalHours: Number(form.intervalHours) || 0,
        region: form.region.trim(),
        platform: form.platform,
        minVersion: form.minVersion.trim(),
        maxVersion: form.maxVersion.trim(),
        active: true,
      })
      setForm(EMPTY)
      toast.success("Notícia publicada")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Não publicou")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        title="Notícias"
        subtitle="Aparece na home de quem bater com plataforma, versão, região e vigência"
      />
      <div className="mx-auto grid w-full max-w-[1100px] gap-4 px-2.5 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {!allowed ? <p className="text-sm text-[var(--wq-text-muted)]">Sem acesso.</p> : null}
        {allowed ? (
          <>
            <section className="space-y-3 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
              <h2 className="text-sm font-semibold">Nova notícia</h2>
              <div className="space-y-1.5">
                <Label htmlFor="notice-title">Título</Label>
                <Input id="notice-title" value={form.title} onChange={(e) => set("title", e.target.value)} className="rounded-[10px]" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notice-body">Texto</Label>
                <Textarea id="notice-body" value={form.body} onChange={(e) => set("body", e.target.value)} className="min-h-24 rounded-[10px]" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="notice-start">Começa</Label>
                  <Input id="notice-start" type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} className="rounded-[10px]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notice-end">Expira</Label>
                  <Input id="notice-end" type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} className="rounded-[10px]" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="notice-interval">Intervalo (horas)</Label>
                  <Input id="notice-interval" inputMode="numeric" value={form.intervalHours} onChange={(e) => set("intervalHours", e.target.value)} className="rounded-[10px]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notice-region">Região</Label>
                  <Input id="notice-region" value={form.region} placeholder="vazio = todas" onChange={(e) => set("region", e.target.value)} className="rounded-[10px]" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="notice-platform">Plataforma</Label>
                  <select
                    id="notice-platform"
                    className="h-10 w-full rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-paper)] px-3"
                    value={form.platform}
                    onChange={(e) => set("platform", e.target.value)}
                  >
                    <option value="all">Todas</option>
                    <option value="web">Web</option>
                    <option value="ios">iOS</option>
                    <option value="android">Android</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notice-min">Versão mínima</Label>
                  <Input id="notice-min" value={form.minVersion} placeholder="1.2.0" onChange={(e) => set("minVersion", e.target.value)} className="rounded-[10px]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notice-max">Versão máxima</Label>
                  <Input id="notice-max" value={form.maxVersion} placeholder="2.0.0" onChange={(e) => set("maxVersion", e.target.value)} className="rounded-[10px]" />
                </div>
              </div>
              <Button type="button" className="rounded-[10px]" disabled={busy} onClick={() => void publish()}>
                {busy ? "Publicando…" : "Publicar"}
              </Button>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
              <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">Publicadas</h2>
              <ul className="divide-y divide-[var(--wq-border)]">
                {notices.length === 0 ? (
                  <li className="px-4 py-6 text-sm text-[var(--wq-text-muted)]">Nenhuma notícia.</li>
                ) : (
                  notices.map((notice) => (
                    <li key={notice.id} className="space-y-1 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium">{notice.title}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await deletePlatformNoticeV1(notice.id)
                              setNotices((prev) => prev.filter((n) => n.id !== notice.id))
                            } catch (err: any) {
                              toast.error(err?.message || "Não removeu")
                            }
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                      {notice.body ? <p className="text-sm text-[var(--wq-text-muted)]">{notice.body}</p> : null}
                      <p className="text-xs text-[var(--wq-text-muted)]">
                        {notice.platform} · {notice.region || "todas as regiões"}
                        {notice.minVersion ? ` · min ${notice.minVersion}` : ""}
                        {notice.maxVersion ? ` · max ${notice.maxVersion}` : ""}
                        {notice.startsAt ? ` · de ${formatWhen(notice.startsAt)}` : ""}
                        {notice.endsAt ? ` · até ${formatWhen(notice.endsAt)}` : ""}
                        {notice.intervalHours ? ` · a cada ${notice.intervalHours}h` : ""}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}

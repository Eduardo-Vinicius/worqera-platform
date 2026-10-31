"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Cake, Loader2, Mail, MessageCircle, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/shell/AppHeader";
import { getClienteByIdService } from "@/lib/apiService";
import { getClientOverviewV1, type ClientOverview } from "@/lib/apiV1";
import { ClientQuotes } from "@/components/quotes/ClientQuotes";
import { ClientInsightCard } from "@/components/ai/ClientInsightCard";
import { SEGMENT_LABEL, birthdayLabel, birthdayWhen, brl, sinceLabel } from "@/components/crm/crmUi";

const STATUS: Record<string, string> = {
  open: "Recebido",
  in_progress: "Em andamento",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refused: "Não fechou",
};

function waLink(phone: string) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length < 10) return "";
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
}

/** Ficha do cliente: quem é, quanto volta, o que já fez na loja e o próximo passo. */
export default function ClienteDetalhesPage() {
  const params = useParams();
  const id = decodeURIComponent(params?.id as string);
  const [cliente, setCliente] = useState<any>(null);
  const [overview, setOverview] = useState<ClientOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [data, ov] = await Promise.all([getClienteByIdService(id), getClientOverviewV1(id).catch(() => null)]);
        if (cancelled) return;
        setCliente(data);
        setOverview(ov);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Erro ao carregar cliente");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-[var(--wq-text-muted)]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando cliente
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="font-semibold">Cliente não encontrado</p>
        <p className="mt-1 text-sm text-[var(--wq-danger)]">{error}</p>
        <Button asChild variant="outline" className="mt-4 rounded-[10px]">
          <Link href="/clientes?tab=todos">Voltar para clientes</Link>
        </Button>
      </div>
    );
  }

  const name = cliente.nomeCompleto || cliente.name || "Cliente";
  const phone = cliente.telefone || cliente.phone || "";
  const s = overview?.stats;
  const address = [cliente.logradouro, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(", ");
  const wa = waLink(phone);
  const newOrderHref = `/pedidos/novo?clientId=${encodeURIComponent(cliente.id || id)}&clientName=${encodeURIComponent(name)}&clientPhone=${encodeURIComponent(phone)}`;

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title={name}
        subtitle={s ? [SEGMENT_LABEL[s.segment] || "", sinceLabel(s.daysSince)].filter(Boolean).join(" · ") : "Ficha do cliente"}
        actions={
          <div className="flex gap-1.5">
            <Button asChild variant="outline" size="sm" className="h-9 rounded-[10px]">
              <Link href="/clientes?tab=todos">
                <ArrowLeft className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Clientes</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 rounded-[10px] bg-[var(--wq-action)] text-white">
              <Link href={newOrderHref}>
                <Plus className="mr-1 h-4 w-4" />
                Novo pedido
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-[1100px] space-y-4 px-3 py-4 sm:px-5 sm:py-6 md:px-8">
        <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
          <div className="flex flex-wrap gap-2 text-sm">
            {phone ? (
              <a href={`tel:${phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--wq-border)] px-3 py-1.5 font-medium">
                <Phone className="h-3.5 w-3.5" /> {phone}
              </a>
            ) : null}
            {wa ? (
              <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 font-semibold text-[#073018]">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            ) : null}
            {cliente.email ? (
              <a href={`mailto:${cliente.email}`} className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-[var(--wq-border)] px-3 py-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{cliente.email}</span>
              </a>
            ) : null}
            {cliente.birthday ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                <Cake className="h-3.5 w-3.5" /> {birthdayLabel(cliente.birthday)}
                {s?.birthdayIn != null && s.birthdayIn <= 30 ? ` · ${birthdayWhen(s.birthdayIn).toLowerCase()}` : ""}
              </span>
            ) : null}
          </div>
          {(cliente.tags || []).length || cliente.source ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(cliente.tags || []).map((t: string) => (
                <span key={t} className="rounded-full bg-[var(--wq-brand-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--wq-brand-text)]">
                  {t}
                </span>
              ))}
              {cliente.source ? <span className="rounded-full bg-[var(--wq-paper)] px-2.5 py-0.5 text-xs text-[var(--wq-text-muted)]">Veio por: {cliente.source}</span> : null}
            </div>
          ) : null}
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {cliente.cpf ? (
              <div className="flex gap-2">
                <dt className="text-[var(--wq-text-muted)]">CPF</dt>
                <dd>{cliente.cpf}</dd>
              </div>
            ) : null}
            {address ? (
              <div className="flex gap-2">
                <dt className="text-[var(--wq-text-muted)]">Endereço</dt>
                <dd className="[overflow-wrap:anywhere]">{address}</dd>
              </div>
            ) : null}
          </dl>
          {cliente.observacoes || cliente.notes ? (
            <p className="mt-3 rounded-xl bg-[var(--wq-paper)] px-3 py-2 text-sm">{cliente.observacoes || cliente.notes}</p>
          ) : null}
        </section>

        {s ? (
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Pedidos", value: String(s.orders), hint: s.openOrders ? `${s.openOrders} em andamento` : "" },
              s.spent != null ? { label: "Gasto total", value: brl(s.spent), hint: s.ticket ? `Ticket ${brl(s.ticket)}` : "" } : null,
              { label: "Volta a cada", value: s.avgGapDays ? `${s.avgGapDays} dias` : "—", hint: s.orders >= 2 ? "Média entre pedidos" : "Precisa de 2 pedidos" },
              { label: "Cliente desde", value: s.firstOrderAt ? new Date(s.firstOrderAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "—", hint: sinceLabel(s.daysSince) },
            ]
              .filter(Boolean)
              .map((c) => (
                <div key={c!.label} className="min-w-0 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--wq-text-muted)]">{c!.label}</p>
                  <p className="mt-1 truncate font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums sm:text-2xl">{c!.value}</p>
                  <p className="truncate text-xs text-[var(--wq-text-muted)]">{c!.hint}</p>
                </div>
              ))}
          </section>
        ) : null}

        <ClientInsightCard clientId={cliente.id || id} />

        <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
          <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">Histórico de pedidos</h2>
          {overview?.orders.length ? (
            <ul className="divide-y divide-[var(--wq-border)]">
              {overview.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/pedidos?q=${encodeURIComponent(o.code)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--wq-paper)]">
                    <span className="font-mono text-sm font-semibold">#{o.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{o.what || "Pedido"}</span>
                      <span className="block text-xs text-[var(--wq-text-muted)]">
                        {new Date(o.createdAt).toLocaleDateString("pt-BR")} · {STATUS[o.status] || o.status}
                        {o.score ? ` · nota ${o.score}` : ""}
                      </span>
                    </span>
                    {o.total != null ? <span className="shrink-0 text-sm font-semibold tabular-nums">{brl(o.total)}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-[var(--wq-text-muted)]">Nenhum pedido ainda.</p>
          )}
        </section>

        <ClientQuotes clientId={cliente.id || id} />
      </div>
    </div>
  );
}

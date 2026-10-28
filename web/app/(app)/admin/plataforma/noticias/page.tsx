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
import { Eye } from "lucide-react"
import { ReleaseNotesDialog } from "@/components/shell/ReleaseNotesModal"

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
  display: "modal",
}

type Step = { title: string; body: string; href: string; cta: string }

const EMPTY_STEP: Step = { title: "", body: "", href: "", cta: "" }

type ReleaseTemplate = { id: string; label: string; title: string; body: string; steps: Step[] }

/** Everything important shipped in October, in one tour. */
const OCTOBER_TEMPLATE: ReleaseTemplate = {
  id: "outubro",
  label: "Tudo o que chegou em outubro",
  title: "Sua Worqera ficou muito maior. Bora ver?",
  body:
    "Em poucas semanas chegaram orçamentos que voltam a vender, pedido com cara de ficha, produtos da loja no mesmo pedido, entregues e recusados à vista e um resumo que mostra quanto dinheiro está em jogo hoje. São 6 passos rápidos — cada um leva direto para a tela.",
  steps: [
    {
      title: "Quem não fechou vira venda de novo",
      body: "No pedido, toque em Não fechou: o cliente vai para Orçamentos com o motivo e o dia de ligar. A lista Ligar hoje mostra quem vale mais primeiro. Fechou? O pedido volta sozinho para a fila.",
      href: "/orcamentos",
      cta: "Abrir Orçamentos",
    },
    {
      title: "O pedido virou ficha",
      body: "Abra um card no kanban: nome, telefone e e-mail no topo, quanto falta receber e os botões Avançar, Entregar e Avisar. A mensagem para o cliente já vem pronta — WhatsApp, e-mail ou copiar.",
      href: "/kanban",
      cta: "Abrir o kanban",
    },
    {
      title: "Venda produto no mesmo pedido",
      body: "Cadastre o que a loja vende em Cadastros → Produtos. No pedido, adicione em Produtos da loja: o estoque reserva e baixa sozinho. Só vendeu um cadarço? Marque Cliente já levou e pronto.",
      href: "/pedidos/novo",
      cta: "Fazer um pedido",
    },
    {
      title: "Entregues e Recusados à vista",
      body: "No fim do kanban (e nos chips do celular) tem Entregues e Recusados. Veja o que saiu nos últimos dias e quem não fechou — com o motivo e o atalho para Orçamentos.",
      href: "/kanban",
      cta: "Ver no kanban",
    },
    {
      title: "Quanto está em jogo hoje",
      body: "A Visão geral soma orçamentos para ligar, prontos para receber e entregues sem pagar, e mostra as 4 prioridades do dia. O dono ainda vê a prateleira: prontos parados e o botão Lembrar.",
      href: "/dashboard",
      cta: "Ver o resumo do dia",
    },
    {
      title: "Mais avaliações e IA no Business",
      body: "Cole o link do Google em Empresa: quem dá nota 4 ou 5 é convidado a avaliar você. No Business, a IA escreve o resumo do dia, os textos de orçamento, o laudo para o cliente e a resposta das avaliações.",
      href: "/settings/empresa",
      cta: "Colocar o link do Google",
    },
  ],
}

const RECOVERY_TEMPLATE: ReleaseTemplate = {
  id: "recuperacao",
  label: "Aberto por, recuperados e repor estoque",
  title: "Agora dá para medir quem atende, quem recupera e o que falta",
  body:
    "Quem abriu cada pedido, como cada cliente que recusou voltou, quanto isso rendeu no Financeiro, a nota do atendimento e o aviso para pedir o solado antes de acabar. São 6 passos rápidos.",
  steps: [
    {
      title: "Aberto por, logo no topo do pedido",
      body: "Toque no nome de quem está atendendo. O último já vem marcado no aparelho, então quase sempre é zero toque. Produtos da loja virou a etapa 3, com o número de itens à vista. Cadastre quem atende em Funcionários → Atende no balcão.",
      href: "/pedidos/novo",
      cta: "Fazer um pedido",
    },
    {
      title: "Recuperou? Conte como",
      body: "Ao marcar Recuperado em Orçamentos, diga o problema de verdade, como reverteu (desconto, prazo, nova proposta…) e quem ajudou. O pedido volta para a fila com o selo Recuperado no kanban.",
      href: "/orcamentos",
      cta: "Abrir Orçamentos",
    },
    {
      title: "Recuperados: o que funciona",
      body: "A nova aba mostra a taxa de recuperação, quantos contatos até fechar, quantas pessoas atuaram, o que mais reverte cada motivo e quem mais recupera. No Financeiro, o card Recuperado soma os tênis que voltaram no período.",
      href: "/orcamentos?view=recovered",
      cta: "Ver Recuperados",
    },
    {
      title: "Como foi o atendimento?",
      body: "Na página do pedido, o cliente dá estrelas para o atendimento e vê quem o atendeu. Em Métricas → Atendimento: pedidos, vendido, ticket e nota de cada pessoa. Em Avaliações, filtre por quem atendeu.",
      href: "/admin/metrics",
      cta: "Ver Atendimento",
    },
    {
      title: "Solado que demora? O sistema lembra",
      body: "Em Produtos, informe o prazo do fornecedor (ex.: 35 dias). Pelo que sai por dia, a Worqera avisa a hora de pedir antes de acabar. Marque Pedi ao fornecedor e, quando chegar, Chegou: o estoque soma sozinho.",
      href: "/admin/produtos#repor",
      cta: "Abrir Repor estoque",
    },
    {
      title: "Pronto antigo? Confira e finalize",
      body: "Na prateleira da Visão geral, pedidos prontos há uma semana aparecem para conferir: talvez já tenham saído. Marque Conferir ou toque em Já entregue e diga se recebeu o saldo.",
      href: "/dashboard#prateleira",
      cta: "Ver a prateleira",
    },
  ],
}

const KANBAN_TEMPLATE: ReleaseTemplate = {
  id: "kanban",
  label: "Kanban turbinado e R$ em jogo",
  title: "Seu kanban ficou mais rápido (e mais esperto)",
  body:
    "O pedido abre como uma ficha: cliente, telefone, valor e o próximo passo no topo. Entregues e recusados ficam à vista no fim do quadro. E a Visão geral agora mostra quanto dinheiro está em jogo hoje — e por onde começar.",
  steps: [
    {
      title: "O pedido virou ficha",
      body: "Abra qualquer card: nome, telefone e e-mail no topo, quanto falta receber e um botão grande para Avançar ou Entregar. Mover para outro setor é um toque.",
      href: "/kanban",
      cta: "Abrir o kanban",
    },
    {
      title: "Avisar em 1 toque",
      body: "Botão Avisar: a mensagem já vem pronta para o momento do pedido (pronto, atraso, andamento). Manda no WhatsApp, por e-mail ou copia e cola.",
      href: "",
      cta: "",
    },
    {
      title: "Entregues e Recusados à vista",
      body: "No fim do kanban tem duas colunas que abrem com um toque. Veja o que saiu nos últimos dias e quem não fechou — e leve direto para Orçamentos.",
      href: "/kanban",
      cta: "Ver no kanban",
    },
    {
      title: "Quanto está em jogo hoje",
      body: "A Visão geral soma orçamentos para ligar, prontos para receber e entregues sem pagar. Embaixo, as 4 prioridades do dia, cada uma com um botão.",
      href: "/dashboard",
      cta: "Ver o resumo",
    },
    {
      title: "Orçamentos sem travar",
      body: "O quadro de orçamentos arrasta liso, no computador e no celular. A lista Ligar hoje continua sendo o começo do dia.",
      href: "/orcamentos?view=board",
      cta: "Abrir o quadro",
    },
    {
      title: "Menu mais limpo",
      body: "Operação, Cadastros, Gestão e Administração. Equipe, funcionários e plano ficam no fim, só para dono e admin.",
      href: "",
      cta: "",
    },
  ],
}

const PRODUCTS_TEMPLATE: ReleaseTemplate = {
  id: "produtos",
  label: "Produtos e venda no pedido",
  title: "Agora a loja vende produto no mesmo pedido",
  body:
    "Palmilha, cadarço, produto de limpeza, peça. Cadastre o que a loja vende em Produtos e coloque no pedido junto com o serviço. O estoque reserva, baixa na entrega e volta se cancelar. O item do cliente continua igualzinho.",
  steps: [
    {
      title: "Cadastre seus produtos",
      body: "Em Cadastros → Produtos (dono e admin): nome, preço e quantidade. Tem tamanho ou cor? Adicione as variações, cada uma com o próprio saldo.",
      href: "/admin/produtos",
      cta: "Abrir Produtos",
    },
    {
      title: "Produtos da loja no pedido",
      body: "No pedido, logo abaixo do item do cliente, tem Produtos da loja. Busque o produto, toque e ele entra com preço e quantidade (+ e −). Dá para ajustar o preço.",
      href: "/pedidos/novo",
      cta: "Fazer um pedido",
    },
    {
      title: "Serviço e produto juntos",
      body: "Limpeza do tênis e cadarço novo no mesmo pedido, no mesmo total. O produto já entra pronto no kanban, sem passar pela produção.",
      href: "",
      cta: "",
    },
    {
      title: "Venda de balcão em segundos",
      body: "Só vendeu um produto? Adicione, marque Cliente já levou e crie. O pedido nasce entregue, o estoque baixa e entra no caixa de hoje.",
      href: "/pedidos/novo",
      cta: "Fazer uma venda",
    },
    {
      title: "O estoque se mexe sozinho",
      body: "Salvou o pedido, o saldo fica reservado. Entregou, sai do estoque. Cancelou ou o cliente não fechou, volta para a prateleira.",
      href: "",
      cta: "",
    },
    {
      title: "Saldo sempre à vista",
      body: "Em Produtos: disponível, reservado, valor em estoque, o que está abaixo do mínimo e o relatório para baixar.",
      href: "/admin/produtos",
      cta: "Ver o estoque",
    },
  ],
}

const WEEK_TEMPLATE: ReleaseTemplate = {
  id: "semana",
  label: "Novidades da semana",
  title: "Novidades na Worqera",
  body:
    "Separamos o que chegou esta semana para deixar o dia mais leve: dinheiro parado à vista, avaliação no Google, o detalhe do pedido organizado e produtos no pedido.",
  steps: [
    {
      title: "Na prateleira",
      body: "Só o dono vê, na Visão geral: pedidos prontos que o cliente não buscou, há quantos dias e quanto falta receber. Um toque em Lembrar abre o WhatsApp com o texto pronto.",
      href: "/dashboard",
      cta: "Ver a prateleira",
    },
    {
      title: "Avaliação no Google",
      body: "Cole o link do Google em Empresa. Quem der nota 4 ou 5 no pedido recebe o convite para avaliar sua loja no Google.",
      href: "/settings/empresa",
      cta: "Colocar o link",
    },
    {
      title: "Pedido organizado no kanban",
      body: "O detalhe do pedido agora vem em seções: valor, itens, ações, fila, fotos, cliente e histórico. Tudo no mesmo lugar de antes, mais fácil de achar.",
      href: "/kanban",
      cta: "Abrir o kanban",
    },
    {
      title: "Produtos no pedido",
      body: "Cadastre o que a loja vende em Produtos e adicione no pedido em Produtos da loja. Venda de balcão sai entregue na hora.",
      href: "/admin/produtos",
      cta: "Abrir Produtos",
    },
    {
      title: "Quem não fechou vira retorno",
      body: "No pedido, Ações → Cliente não fechou. O cliente entra em Orçamentos com o dia de ligar e a mensagem pronta.",
      href: "/orcamentos",
      cta: "Ver Orçamentos",
    },
  ],
}

/** Ready-made announcement for the Orçamentos + IA release. */
const QUOTES_TEMPLATE: ReleaseTemplate = {
  id: "orcamentos",
  label: "Orçamentos e IA",
  title: "Orçamentos: quem não fechou agora tem lugar",
  body:
    "O cliente não fechou? Agora ele não some. O pedido sai da fila, entra em Orçamentos com o motivo e o dia de ligar, e você recupera a venda com um toque.",
  steps: [
    {
      title: "Cliente não fechou",
      body: "No kanban, abra o pedido e toque em Ações → Cliente não fechou. Escolha o motivo (preço, prazo, vai pensar) e o dia de ligar de novo.",
      href: "/kanban",
      cta: "Abrir o kanban",
    },
    {
      title: "Ligar hoje",
      body: "Em Orçamentos, a lista Ligar hoje mostra primeiro quem está atrasado e vale mais. WhatsApp com texto pronto, Ligar, Adiar e Fechou em cada linha.",
      href: "/orcamentos",
      cta: "Ver Orçamentos",
    },
    {
      title: "Quadro do funil",
      body: "Na aba Quadro, arraste entre Novo, Em contato, Retorno, Recuperado e Perdido. No topo: quanto está na mesa e quanto já voltou no mês.",
      href: "/orcamentos?view=board",
      cta: "Abrir o quadro",
    },
    {
      title: "Fechou? Volta para a fila",
      body: "Tocou em Fechou, o pedido volta para o setor onde estava. Orçamento do balcão abre o Novo pedido com o cliente já preenchido.",
      href: "",
      cta: "",
    },
    {
      title: "IA no Business",
      body: "No Business, a IA escreve o resumo do dia, os textos para retomar o orçamento, a resposta das avaliações e o texto do laudo para o cliente. São 1.000 usos por mês.",
      href: "/dashboard",
      cta: "Ver o resumo do dia",
    },
  ],
}

const RELEASE_TEMPLATES: ReleaseTemplate[] = [RECOVERY_TEMPLATE, OCTOBER_TEMPLATE, KANBAN_TEMPLATE, PRODUCTS_TEMPLATE, WEEK_TEMPLATE, QUOTES_TEMPLATE]

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
  const [steps, setSteps] = useState<Step[]>([])
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)

  const setStep = (index: number, key: keyof Step, value: string) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: value } : s)))

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
        display: form.display === "modal" ? "modal" : "banner",
        steps: form.display === "modal" ? steps.filter((s) => s.title.trim()) : [],
      })
      setForm(EMPTY)
      setSteps([])
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
        subtitle="Novidades no centro da tela (com tour) ou faixa no topo, para as empresas que baterem com plataforma, versão e vigência"
      />
      <div className="mx-auto grid w-full max-w-[1100px] gap-4 px-2.5 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {!allowed ? <p className="text-sm text-[var(--wq-text-muted)]">Sem acesso.</p> : null}
        {allowed ? (
          <>
            <section className="space-y-3 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
              <h2 className="text-sm font-semibold">Nova notícia</h2>
              <div className="space-y-1.5">
                <p className="text-xs text-[var(--wq-text-muted)]">Comece por um modelo pronto (dá para editar antes de publicar):</p>
                <div className="flex flex-wrap gap-2">
                  {RELEASE_TEMPLATES.map((tpl) => (
                    <Button
                      key={tpl.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-[10px]"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, title: tpl.title, body: tpl.body, display: "modal" }))
                        setSteps(tpl.steps)
                      }}
                    >
                      {tpl.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Como aparece</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "modal", label: "Quadro no centro", hint: "Novidades com tour, uma vez" },
                    { id: "banner", label: "Faixa no topo", hint: "Aviso curto, fecha" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => set("display", opt.id)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm ${
                        form.display === opt.id
                          ? "border-[var(--wq-brand)] bg-[var(--wq-brand-soft)]"
                          : "border-[var(--wq-border)]"
                      }`}
                    >
                      <span className="block font-medium">{opt.label}</span>
                      <span className="block text-xs text-[var(--wq-text-muted)]">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notice-title">Título</Label>
                <Input id="notice-title" value={form.title} onChange={(e) => set("title", e.target.value)} className="rounded-[10px]" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notice-body">Texto</Label>
                <Textarea id="notice-body" value={form.body} onChange={(e) => set("body", e.target.value)} className="min-h-24 rounded-[10px]" />
              </div>
              {form.display === "modal" ? (
                <div className="space-y-2 rounded-xl border border-[var(--wq-border)] p-3">
                  <div className="flex items-center justify-between">
                    <Label>Tour (até 6 passos)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={steps.length >= 6}
                      onClick={() => setSteps((prev) => [...prev, { ...EMPTY_STEP }])}
                    >
                      + Passo
                    </Button>
                  </div>
                  {steps.length === 0 ? (
                    <p className="text-xs text-[var(--wq-text-muted)]">Sem passos, aparece só o título e o texto.</p>
                  ) : null}
                  {steps.map((s, i) => (
                    <div key={i} className="space-y-1.5 rounded-lg bg-[var(--wq-paper)] p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--wq-brand)]">{i + 1}</span>
                        <Input value={s.title} onChange={(e) => setStep(i, "title", e.target.value)} placeholder="Título do passo" className="h-9 rounded-[10px]" />
                        <Button type="button" size="sm" variant="ghost" onClick={() => setSteps((prev) => prev.filter((_, j) => j !== i))}>
                          Tirar
                        </Button>
                      </div>
                      <Textarea value={s.body} onChange={(e) => setStep(i, "body", e.target.value)} placeholder="O que mudou e onde clicar" className="min-h-16 rounded-[10px]" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={s.href} onChange={(e) => setStep(i, "href", e.target.value)} placeholder="Tela: /orcamentos" className="h-9 rounded-[10px]" />
                        <Input value={s.cta} onChange={(e) => setStep(i, "cta", e.target.value)} placeholder="Botão: Ver agora" className="h-9 rounded-[10px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
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
              <div className="flex flex-wrap gap-2">
                {form.display === "modal" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-[10px]"
                    disabled={!form.title.trim()}
                    onClick={() => setPreview(true)}
                  >
                    <Eye className="mr-1.5 h-4 w-4" /> Pré-visualizar
                  </Button>
                ) : null}
                <Button type="button" className="rounded-[10px]" disabled={busy} onClick={() => void publish()}>
                  {busy ? "Publicando…" : "Publicar"}
                </Button>
              </div>
            </section>
            {preview ? (
              <ReleaseNotesDialog
                notice={{
                  title: form.title.trim() || "Novidades",
                  body: form.body.trim(),
                  steps: steps.filter((s) => s.title.trim()),
                }}
                onClose={() => setPreview(false)}
                onGo={(href) => toast.message(`O botão levaria para ${href}`)}
              />
            ) : null}

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
                        {notice.display === "modal" ? `Quadro no centro · ${notice.steps?.length || 0} passos · ` : "Faixa · "}
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

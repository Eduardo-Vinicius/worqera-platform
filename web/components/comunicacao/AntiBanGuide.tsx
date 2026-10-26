import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react"

const DO = [
  {
    title: "Use a API oficial da Meta (é o que a Worqera usa)",
    body: "O número fica registrado como empresa no WhatsApp Business Platform. Quem bane é a automação não oficial (programas que imitam o WhatsApp Web), não a API oficial.",
  },
  {
    title: "Mande só para quem pediu",
    body: "Cliente que deixou o pedido na loja e aceitou receber avisos. Marque “A loja pede autorização ao cliente no balcão”. Nada de lista comprada ou contato frio.",
  },
  {
    title: "Mensagem útil primeiro",
    body: "Pedido pronto, mudança de prazo e link do pedido são mensagens de serviço (utilidade). São as que menos geram bloqueio e as mais baratas.",
  },
  {
    title: "Pouca promoção, com espaço",
    body: "Retomada de orçamento é marketing: no máximo 2 por cliente na Worqera, com dias de intervalo. Quem não respondeu duas vezes, para.",
  },
  {
    title: "Deixe a saída fácil",
    body: "Toda mensagem aceita PARAR ou SAIR. A Worqera respeita na hora e não manda mais para aquele cliente.",
  },
  {
    title: "Número com nome e perfil completos",
    body: "Nome da loja aprovado pela Meta, foto, endereço e horário no perfil. Cliente que reconhece a loja não denuncia.",
  },
  {
    title: "Comece devagar",
    body: "Número novo começa com limite de conversas por dia (250) e sobe sozinho (1.000, 10.000…) conforme a qualidade fica verde. Não dispare tudo no primeiro dia.",
  },
  {
    title: "Acompanhe a qualidade",
    body: "Na Meta, a qualidade do número aparece como verde, amarelo ou vermelho. Amarelo = reduzir marketing e revisar textos. A Worqera pausa sozinha se a Meta pausar.",
  },
]

const DONT = [
  "Usar aplicativos de “disparo em massa” ou extensões que automatizam o WhatsApp Web.",
  "Mandar a mesma mensagem para centenas de pessoas que nunca compraram.",
  "Insistir com quem não respondeu (mais de 2 retomadas).",
  "Enviar link encurtado desconhecido ou texto todo em maiúsculas.",
  "Trocar o número da loja toda hora: a reputação fica no número.",
]

/** How to automate WhatsApp without getting the shop number banned. */
export function AntiBanGuide() {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
        <div className="text-sm">
          <p className="font-semibold text-emerald-900 dark:text-emerald-200">Resumo: número cai por denúncia, não por automação oficial.</p>
          <p className="mt-1 text-emerald-900/80 dark:text-emerald-200/80">
            Com a API oficial, mandando só para clientes da loja, mensagens úteis e com opção de sair, o risco é baixo. A Worqera já
            aplica as travas abaixo por padrão.
          </p>
        </div>
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {DO.map((item) => (
          <li key={item.title} className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
            <p className="flex items-start gap-2 text-sm font-semibold text-[var(--wq-text)]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {item.title}
            </p>
            <p className="mt-1.5 pl-6 text-sm leading-relaxed text-[var(--wq-text-muted)]">{item.body}</p>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-950/30">
        <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">O que derruba número</p>
        <ul className="mt-2 space-y-1.5">
          {DONT.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-rose-900/85 dark:text-rose-200/85">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4 text-sm">
        <p className="font-semibold text-[var(--wq-text)]">Travas que a Worqera já aplica</p>
        <ul className="mt-2 grid gap-1.5 text-[var(--wq-text-muted)] sm:grid-cols-2">
          <li>• Só envia com autorização do cliente marcada</li>
          <li>• Só modelos aprovados pela Meta fora da janela de 24 h</li>
          <li>• No máximo 2 retomadas por orçamento</li>
          <li>• PARAR / SAIR bloqueia o cliente na hora</li>
          <li>• Teto mensal de mensagens por loja</li>
          <li>• Pausa automática se a Meta pausar ou a loja tirar o acesso</li>
        </ul>
      </div>
    </div>
  )
}

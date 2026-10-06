import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacidade · Worqera",
  description: "O que o Worqera guarda da conta, dos clientes da oficina e da consulta pública.",
}

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 text-[var(--wq-text)]">
      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--wq-brand)]">WORQERA</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Privacidade</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--wq-text-muted)]">
        O Worqera é a ferramenta da empresa. Quem entra no painel ou no app vê os dados da própria oficina.
      </p>
      <section className="mt-8 space-y-6 text-sm leading-relaxed">
        <Block title="Conta">
          Nome, e-mail e senha. A senha fica só como hash. Sair invalida a sessão: o token de acesso e o de renovação deixam de valer neste aparelho e nos outros.
        </Block>
        <Block title="Clientes da oficina">
          Nome, telefone, e-mail, CPF e endereço que a equipe cadastra para o pedido. Na lista do app, o CPF aparece só com os dois últimos dígitos.
        </Block>
        <Block title="Pedidos">
          Itens, valores, fotos do serviço e o andamento no kanban. As fotos ficam ligadas ao pedido da empresa.
        </Block>
        <Block title="Consulta do cliente">
          O link público é /p/o/ e um código opaco. Não leva o nome da empresa na barra de endereço. A página mostra o primeiro nome do cliente e o telefone da oficina.
        </Block>
        <Block title="Localização">
          O app não lê a localização do aparelho. O site também não envia coordenadas.
        </Block>
        <Block title="Apagar">
          A equipe remove cliente e pedido dentro da oficina. Para encerrar o login, use Sair e peça ao dono da empresa.
        </Block>
      </section>
      <p className="mt-10 text-sm">
        <Link href="/login" className="text-[var(--wq-brand)] hover:underline">
          Voltar ao login
        </Link>
      </p>
    </main>
  )
}

function Block({ title, children }: { title: string; children: string }) {
  return (
    <div>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-[var(--wq-text-muted)]">{children}</p>
    </div>
  )
}

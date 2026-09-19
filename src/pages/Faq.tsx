import { Link } from "react-router-dom";
import { CircleHelp, CreditCard, Grid2X2, PackageCheck, UserRound } from "lucide-react";
import { CrazyHeader } from "@/components/crazy-hero/CrazyHeader";
import "@/components/crazy-hero/crazy-hero.css";

const questions = [
  {
    icon: Grid2X2,
    title: "Como encontro um produto?",
    answer: "Use as categorias da Home ou a busca no topo. Cada categoria abre o catálogo já filtrado para aquele jogo.",
  },
  {
    icon: CreditCard,
    title: "Quais formas de pagamento estão disponíveis?",
    answer: "Os métodos habilitados aparecem na Home e no checkout. A disponibilidade é controlada pela configuração atual da loja.",
  },
  {
    icon: PackageCheck,
    title: "A entrega é automática?",
    answer: "Depende do produto. Quando a entrega automática estiver disponível, isso será indicado no fluxo de compra e no pedido.",
  },
  {
    icon: UserRound,
    title: "Onde acompanho meus pedidos?",
    answer: "Entre na sua conta e acesse Meus Pedidos para acompanhar status, entrega e conversas relacionadas ao pedido.",
  },
];

export default function Faq() {
  return (
    <div className="crazy-page-shell min-h-screen">
      <CrazyHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-32 sm:px-6">
        <section className="rounded-3xl border border-blue-500/15 bg-white/75 p-6 shadow-2xl shadow-blue-950/10 backdrop-blur-xl dark:border-blue-400/15 dark:bg-slate-950/75 sm:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <CircleHelp className="mx-auto h-9 w-9 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Perguntas frequentes
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Atalhos rápidos para navegar, comprar e acompanhar seus pedidos na CRAZZY PROJECT.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {questions.map(({ icon: Icon, title, answer }) => (
              <article
                key={title}
                className="rounded-2xl border border-blue-500/10 bg-white/60 p-5 dark:border-blue-400/10 dark:bg-blue-950/20"
              >
                <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <h2 className="mt-3 font-extrabold text-slate-950 dark:text-white">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{answer}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/produtos"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Ver produtos
            </Link>
            <Link
              to="/meus-pedidos"
              className="rounded-xl border border-blue-500/20 bg-white/70 px-5 py-3 text-sm font-extrabold text-slate-900 transition hover:border-blue-500/40 dark:bg-blue-950/30 dark:text-white"
            >
              Meus pedidos
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Headphones, Package, ShieldCheck, Sparkles, ShoppingBag } from "lucide-react";
import { CrazyHeader } from "@/components/crazy-hero/CrazyHeader";
import { FuturisticBackground } from "@/components/crazy-hero/FuturisticBackground";
import { supabase } from "@/integrations/supabase/client";
import { useReseller } from "@/hooks/useReseller";
import "@/components/crazy-hero/crazy-hero.css";
import "./store-home.css";

type Product = { id: string; name: string; image_url: string | null; game_id: string | null; is_new: boolean; product_plans: { active: boolean; price: number }[] };
function ProductRow({ title, products, href }: { title: string; products: Product[]; href: string }) {
  const track = useRef<HTMLDivElement>(null);
  const { isReseller, isResellerForProduct, getDiscountedPrice } = useReseller();
  const scroll = (direction: number) => track.current?.scrollBy({ left: direction * track.current.clientWidth * .8, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  return <section className="store-row" aria-label={title}>
    <div className="store-row-heading"><h2>{title}</h2><div><Link to={href}>Ver todos</Link><button onClick={() => scroll(-1)} aria-label={`Produtos anteriores: ${title}`}><ArrowLeft size={17} /></button><button onClick={() => scroll(1)} aria-label={`Próximos produtos: ${title}`}><ArrowRight size={17} /></button></div></div>
    <div className="store-products" ref={track} tabIndex={0} aria-label={`Produtos de ${title}`}>
      {products.map(product => {
        const prices = product.product_plans.filter(p => p.active && Number(p.price) > 0).map(p => Number(p.price));
        const price = prices.length ? Math.min(...prices) : null;
        const displayed = price !== null && isReseller && isResellerForProduct(product.id) ? getDiscountedPrice(product.id, price) : price;
        return <article className="store-product" key={product.id}>
          <Link to={`/produto/${product.id}`} className="store-product-image" aria-label={product.name}>{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <Package size={42} />}{product.is_new && <span>Novo</span>}</Link>
          <div className="store-product-body"><h3><Link to={`/produto/${product.id}`}>{product.name}</Link></h3><div className="store-price">{displayed !== null ? <><small>A partir de</small><strong>{displayed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></> : <small>Consulte os planos disponíveis</small>}</div><Link className="store-product-button" to={`/produto/${product.id}`}>Ver produto <ArrowRight size={15} /></Link></div>
        </article>;
      })}
    </div>
  </section>;
}

export default function Index() {
  const location = useLocation();
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ["store-home-catalog"], queryFn: async () => {
    const [games, products] = await Promise.all([
      supabase.from("games").select("id,name,slug").eq("active", true).order("sort_order"),
      supabase.from("products").select("id,name,image_url,game_id,is_new,product_plans(active,price)").eq("active", true).order("sort_order"),
    ]);
    if (games.error) throw games.error;
    if (products.error) throw products.error;
    return { games: games.data, products: products.data as Product[] };
  }});
  useEffect(() => { if (location.hash === "#categorias") document.getElementById("categorias")?.scrollIntoView(); }, [location.hash]);
  const products = data?.products ?? [];
  const featured = products.filter(p => p.is_new);
  return <div className="store-home">
    <FuturisticBackground />
    <CrazyHeader categories={data?.games} storeLayout />
    <main className="store-main">
      <section className="store-intro">
        <div><span className="store-eyebrow">BEM-VINDO À CRAZZY PROJECT</span><h1>Seu próximo nível<br />começa aqui.</h1><p>Explore nossos produtos, encontre seu plano e conte com a gente antes e depois da compra.</p><div className="store-intro-actions"><a href="#categorias" className="store-primary"><ShoppingBag size={18} /> Ver produtos</a><Link to="/faq">Como comprar? <ArrowRight size={17} /></Link></div></div>
        <div className="store-benefits">{[{ icon: Package, title: "Tudo em um só lugar", text: "Encontre produtos e planos para você." }, { icon: Sparkles, title: "Novidades", text: "Confira os destaques do catálogo." }, { icon: ShieldCheck, title: "Sua conta", text: "Acompanhe suas compras e pedidos." }, { icon: Headphones, title: "Suporte humano", text: "Fale com a equipe quando precisar." }].map(({ icon: Icon, title, text }) => <div key={title}><Icon size={22} /><div><strong>{title}</strong><p>{text}</p></div></div>)}</div>
      </section>
      {featured.length > 0 && <ProductRow title="Novidades e destaques" products={featured} href="/produtos" />}
      <section id="categorias" className="store-catalog"><span className="store-eyebrow">CATÁLOGO COMPLETO</span><h2>Produtos</h2><nav className="store-category-links" aria-label="Categorias de produtos">{data?.games.map(game => <Link key={game.id} to={`/produtos?game=${encodeURIComponent(game.slug)}`}>{game.name}</Link>)}</nav>
        {isPending ? <p role="status">Carregando produtos…</p> : isError ? <div className="store-empty"><p>Não foi possível carregar o catálogo.</p><button onClick={() => refetch()}>Tentar novamente</button></div> : products.length === 0 ? <div className="store-empty"><Package size={32} /><h3>Novos produtos em breve</h3><p>Precisa de ajuda? Fale com nossa equipe pelo botão Suporte.</p></div> : <>
          {data?.games.map(game => { const items = products.filter(p => p.game_id === game.id); return items.length ? <ProductRow key={game.id} title={game.name} products={items} href={`/produtos?game=${encodeURIComponent(game.slug)}`} /> : null; })}
          {products.some(p => !data?.games.some(g => g.id === p.game_id)) && <ProductRow title="Mais produtos" products={products.filter(p => !data?.games.some(g => g.id === p.game_id))} href="/produtos" />}
        </>}
      </section>
      <footer className="store-footer"><strong>CRAZZY PROJECT</strong><nav aria-label="Links da loja"><Link to="/rewards">Rewards</Link><Link to="/extras">Extras</Link><Link to="/avaliacoes">Avaliações</Link><Link to="/meus-pedidos">Meus pedidos</Link><Link to="/faq">Ajuda</Link></nav></footer>
    </main>
  </div>;
}

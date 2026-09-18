import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, Headphones, Home, Package, RefreshCcw, ShieldCheck, ShoppingCart, X } from "lucide-react";

export interface HeroProductPlan {
  id: string;
  name: string;
  price: number;
  active: boolean;
  sort_order: number;
}

export interface HeroProduct {
  id: string;
  game_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  status: string;
  status_label: string;
  product_plans: HeroProductPlan[];
}

interface CategoryProductDockProps {
  categoryName: string | null;
  categoryImage?: string | null;
  products: HeroProduct[];
  loading?: boolean;
  onClose: () => void;
  onOpenProduct: (productId: string) => void;
  onOpenAll: () => void;
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const lowestPrice = (product: HeroProduct) => {
  const plans = (product.product_plans || []).filter((plan) => plan.active);
  if (!plans.length) return null;
  return Math.min(...plans.map((plan) => Number(plan.price)));
};

const CARD_LABELS = ["BÁSICO", "POPULAR", "MAIS COMPLETO"];

export function CategoryProductDock({
  categoryName,
  categoryImage,
  products,
  loading = false,
  onClose,
  onOpenProduct,
  onOpenAll,
}: CategoryProductDockProps) {
  return (
    <AnimatePresence>
      {categoryName ? (
        <motion.section
          className="crazy-product-dock"
          aria-label={`Produtos de ${categoryName}`}
          initial={{ opacity: 0, y: 24, scale: 0.992 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.992 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="crazy-product-dock__breadcrumb" aria-label="Breadcrumb">
            <Home aria-hidden="true" />
            <span>/</span><button type="button" onClick={onOpenAll}>Categorias</button>
            <span>/</span><strong>{categoryName}</strong>
          </div>

          <button type="button" className="crazy-product-dock__close" onClick={onClose} aria-label="Fechar produtos">
            <X className="h-4 w-4" />
          </button>

          <div className="crazy-product-dock__category">
            <div className="crazy-product-dock__category-art">
              {categoryImage ? (
                <img src={categoryImage} alt="" loading="lazy" />
              ) : (
                <Package className="h-10 w-10" aria-hidden="true" />
              )}
            </div>
            <div className="crazy-product-dock__category-copy">
              <h2>{categoryName}</h2>
              <h3>Domine o jogo com vantagem.</h3>
              <p>Softwares premium com foco em estabilidade, desempenho e atualizações constantes.</p>
            </div>
            <div className="crazy-product-dock__category-chips">
              <span><ShieldCheck aria-hidden="true" /> Proteção reforçada</span>
              <span><RefreshCcw aria-hidden="true" /> Atualizações contínuas</span>
              <span><Headphones aria-hidden="true" /> Suporte dedicado</span>
            </div>
            <div className="crazy-product-dock__playcopy" aria-hidden="true">
              <span>PLAY</span><span>OPTIMIZE</span><span>EVOLVE</span>
            </div>
          </div>

          <div className="crazy-product-dock__products">
            {loading ? (
              <div className="crazy-product-dock__empty">Carregando produtos...</div>
            ) : products.length === 0 ? (
              <div className="crazy-product-dock__empty">Nenhum produto ativo nesta categoria no momento.</div>
            ) : (
              products.slice(0, 3).map((product, index) => {
                const price = lowestPrice(product);
                return (
                  <motion.article
                    key={product.id}
                    className={`crazy-product-card ${index === 1 ? "crazy-product-card--popular" : ""}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.26, delay: index * 0.04 }}
                  >
                    <div className="crazy-product-card__topline">
                      <span className="crazy-product-card__tier">{CARD_LABELS[index] || "SOFTWARE"}</span>
                      <ChevronDown aria-hidden="true" />
                    </div>
                    <div className="crazy-product-card__body">
                      <h3>{product.name}</h3>
                      <p>{product.description || "Confira os planos disponíveis para este produto."}</p>
                    </div>
                    <div className="crazy-product-card__price">
                      <strong>{price === null ? "Consultar" : currency.format(price)}</strong>
                      {price !== null ? <small>/ plano</small> : null}
                    </div>
                    <div className="crazy-product-card__actions">
                      <button type="button" className="crazy-product-card__details" onClick={() => onOpenProduct(product.id)}>
                        Ver detalhes
                      </button>
                      <button type="button" className="crazy-product-card__buy" onClick={() => onOpenProduct(product.id)}>
                        <ShoppingCart aria-hidden="true" /> Comprar
                      </button>
                    </div>
                  </motion.article>
                );
              })
            )}
          </div>

          <button type="button" className="crazy-product-dock__all" onClick={onOpenAll}>
            Ver todos os produtos <ChevronRight aria-hidden="true" />
          </button>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}

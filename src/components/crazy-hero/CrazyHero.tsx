import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_HOME_CATEGORIES,
  getCategoryVisualConfig,
  normalizeSlug,
  type HomeCategoryConfig,
} from "@/config/homeCategories";
import { CategoryCloud } from "./CategoryCloud";
import { FeaturedCarousel, type FeaturedCarouselItem } from "./FeaturedCarousel";
import { CrazyLogo } from "./CrazyLogo";
import { FuturisticBackground } from "./FuturisticBackground";
import { FuturisticPlatform } from "./FuturisticPlatform";
import { HudDecoration } from "./HudDecoration";
import { HeroTrustBar } from "./HeroTrustBar";
import { HeroFooter } from "./HeroFooter";

interface HeroProductPlan {
  id: string;
  name: string;
  price: number;
  active: boolean;
  sort_order: number;
}

interface HeroProduct {
  id: string;
  game_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  status: string;
  status_label: string;
  is_new?: boolean;
  product_plans: HeroProductPlan[];
}

interface GameRow {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
  sort_order: number;
}

const buildCategoryFromGame = (game: GameRow, index: number): HomeCategoryConfig => {
  const slug = normalizeSlug(game.slug || game.name);
  const visual = getCategoryVisualConfig(slug, game.name);
  return {
    id: game.id,
    name: game.name,
    slug,
    iconKey: visual?.iconKey || "crosshair",
    featured: visual?.featured,
    placement: visual?.placement || DEFAULT_HOME_CATEGORIES[index % DEFAULT_HOME_CATEGORIES.length]?.placement,
    action: { type: "category", destination: `/produtos?game=${encodeURIComponent(slug)}` },
  };
};

export function CrazyHero() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [games, setGames] = useState<GameRow[]>([]);
  const [products, setProducts] = useState<HeroProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>("valorant");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [gamesResult, productsResult] = await Promise.all([
        supabase
          .from("games")
          .select("id,name,slug,image_url,sort_order")
          .eq("active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("products")
          .select("*,product_plans(id,name,price,active,sort_order)")
          .eq("active", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (!mounted) return;
      setGames((gamesResult.data || []) as GameRow[]);
      setProducts((productsResult.data || []) as unknown as HeroProduct[]);
      setLoading(false);
    };

    load().catch(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const categories = useMemo<HomeCategoryConfig[]>(() => {
    // A Home sempre preserva as categorias canonicas da referencia.
    // Quando existir um registro equivalente em public.games, usamos o ID/nome
    // real do banco sem deixar categorias extras alterarem a composicao da Home.
    return DEFAULT_HOME_CATEGORIES.map((fallback, index) => {
      const game = games.find(
        (item) => normalizeSlug(item.slug || item.name) === fallback.slug,
      );
      return game ? buildCategoryFromGame(game, index) : fallback;
    });
  }, [games]);

  const productCounts = useMemo(() => {
    const gameSlugById = new Map<string, string>(games.map((game) => [game.id, normalizeSlug(game.slug || game.name)]));
    return products.reduce<Record<string, number>>((acc, product) => {
      const slug = gameSlugById.get(product.game_id);
      if (slug) acc[slug] = (acc[slug] || 0) + 1;
      return acc;
    }, {});
  }, [games, products]);

  useEffect(() => {
    const requestedSlug = normalizeSlug(searchParams.get("game") || "");
    if (requestedSlug && categories.some((category) => category.slug === requestedSlug)) {
      if (requestedSlug !== selectedSlug) setSelectedSlug(requestedSlug);
      return;
    }

    if (!loading && categories.length > 0 && !categories.some((category) => category.slug === selectedSlug)) {
      const preferred = categories.find((category) => category.slug === "valorant") || categories[0];
      setSelectedSlug(preferred?.slug || null);
    }
  }, [categories, loading, searchParams, selectedSlug]);

  const activateCategory = (category: HomeCategoryConfig) => {
    setSelectedSlug(category.slug);
    navigate(category.action.destination);
  };

  const featuredItems = useMemo<FeaturedCarouselItem[]>(
    () =>
      products
        .filter((product) => product.is_new === true)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((product) => ({
          id: product.id,
          title: product.name,
          subtitle: product.description || "Confira os planos disponíveis para este produto.",
          image: product.image_url,
          badge: "NOVO",
        })),
    [products],
  );

  return (
    <main className="crazy-home">
      <section className="crazy-hero" aria-labelledby="crazy-home-title">
        <HudDecoration />

        <div className="crazy-hero__center">
          <h1 id="crazy-home-title" className="sr-only">Crazzy Project</h1>
          <CrazyLogo />
          {loading ? (
            <motion.div
              className="crazy-hero__loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Sincronizando catálogo
            </motion.div>
          ) : null}
        </div>

        <CategoryCloud
          categories={categories}
          productCounts={productCounts}
          selectedSlug={selectedSlug}
          onActivate={activateCategory}
        />

        {loading || featuredItems.length > 0 ? (
          <section className="crazy-home-featured" aria-label="Produtos novos em destaque">
            <FeaturedCarousel
              items={featuredItems}
              loading={loading}
              onOpen={(productId) => navigate(`/produto/${productId}`)}
            />
          </section>
        ) : null}

        <HeroTrustBar />
        <HeroFooter />
        <FuturisticPlatform />

        <motion.button
          type="button"
          className="crazy-hero__explore"
          onClick={() => navigate("/produtos")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <span>Explorar catálogo</span>
          <ArrowDown className="h-4 w-4" />
        </motion.button>
      </section>
    </main>
  );
}

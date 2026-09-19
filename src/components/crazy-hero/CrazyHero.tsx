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
import { CategoryProductDock, type HeroProduct } from "./CategoryProductDock";
import { CrazyLogo } from "./CrazyLogo";
import { FuturisticBackground } from "./FuturisticBackground";
import { FuturisticPlatform } from "./FuturisticPlatform";
import { HudDecoration } from "./HudDecoration";
import { HeroTrustBar } from "./HeroTrustBar";
import { HeroFooter } from "./HeroFooter";

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
          .select("id,game_id,name,description,image_url,status,status_label,product_plans(id,name,price,active,sort_order)")
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

  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === selectedSlug) || null,
    [categories, selectedSlug],
  );

  const selectedGame = useMemo(
    () => games.find((game) => normalizeSlug(game.slug || game.name) === selectedSlug) || null,
    [games, selectedSlug],
  );

  const selectedProducts = useMemo(() => {
    if (!selectedGame) return [];
    return products.filter((product) => product.game_id === selectedGame.id);
  }, [products, selectedGame]);

  const activateCategory = (category: HomeCategoryConfig) => {
    if (category.action.type === "product") {
      navigate(category.action.destination);
      return;
    }

    setSelectedSlug(category.slug);
    const next = new URLSearchParams(searchParams);
    next.set("game", category.slug);
    setSearchParams(next, { replace: true });
  };

  const closeCategory = () => {
    setSelectedSlug(null);
    const next = new URLSearchParams(searchParams);
    next.delete("game");
    setSearchParams(next, { replace: true });
  };

  return (
    <main className="crazy-home">
      <section className={`crazy-hero ${selectedCategory ? "crazy-hero--with-dock" : ""}`} aria-labelledby="crazy-home-title">
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

        <CategoryProductDock
          categoryName={selectedCategory?.name || null}
          categoryImage={selectedGame?.image_url}
          products={selectedProducts}
          loading={loading}
          onClose={closeCategory}
          onOpenProduct={(productId) => navigate(`/produto/${productId}`)}
          onOpenAll={() => selectedCategory && navigate(selectedCategory.action.destination)}
        />

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

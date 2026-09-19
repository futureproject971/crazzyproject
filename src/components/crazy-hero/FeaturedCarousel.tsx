import { CSSProperties, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type FeaturedCarouselItem = {
  id: string;
  title: string;
  subtitle: string;
  image: string | null;
  badge?: string | null;
};

const PLACEHOLDERS: FeaturedCarouselItem[] = [
  { id: "ph-1", title: "Seu produto em destaque", subtitle: "Marque um produto como NOVO no admin", image: null },
  { id: "ph-2", title: "Novidades", subtitle: "Os produtos novos aparecem aqui", image: null },
  { id: "ph-3", title: "Destaques", subtitle: "Navegue entre eles e clique para abrir", image: null },
];

interface Props {
  /** When provided, shows exactly these items (dock/category mode). */
  items?: FeaturedCarouselItem[];
  loading?: boolean;
  /** Called with the product id when a card is opened. */
  onOpen?: (id: string) => void;
  emptyText?: string;
}

export function FeaturedCarousel({ items, loading = false, onOpen, emptyText }: Props) {
  const navigate = useNavigate();
  const controlled = items !== undefined;
  const [fetched, setFetched] = useState<FeaturedCarouselItem[]>(PLACEHOLDERS);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (controlled) return;
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id,name,description,image_url")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .limit(8);
        if (!mounted || error || !data || data.length === 0) return;
        setFetched(
          data.map((p: { id: string; name: string; description: string | null; image_url: string | null }) => ({
            id: p.id,
            title: p.name,
            subtitle: p.description || "Novidade na loja",
            image: p.image_url,
          })),
        );
      } catch {
        /* offline */
      }
    })();
    return () => {
      mounted = false;
    };
  }, [controlled]);

  const slides = controlled ? (items as FeaturedCarouselItem[]) : fetched;

  useEffect(() => {
    setActive(0);
  }, [controlled, slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setActive((a) => (a + 1) % slides.length), 5200);
    return () => clearInterval(t);
  }, [slides.length]);

  if (loading) return <div className="crazy-featured__none">Carregando produtos...</div>;
  if (controlled && slides.length === 0) {
    return <div className="crazy-featured__none">{emptyText || "Nenhum produto ativo nesta categoria no momento."}</div>;
  }

  const go = (i: number) => setActive(((i % slides.length) + slides.length) % slides.length);
  const openSlide = (slide: FeaturedCarouselItem) => {
    if (onOpen) return onOpen(slide.id);
    if (slide.id.startsWith("ph-")) return navigate("/produtos");
    navigate(`/produto/${slide.id}`);
  };
  const onCardClick = (i: number, slide: FeaturedCarouselItem) => {
    if (i !== active) return go(i);
    openSlide(slide);
  };

  return (
    <div className="crazy-featured" aria-label="Destaques">
      <div className="crazy-featured__stage">
        {slides.map((slide, i) => {
          const n = slides.length;
          let offset = i - active;
          if (offset > n / 2) offset -= n;
          if (offset < -n / 2) offset += n;
          const abs = Math.abs(offset);
          const visible = abs <= 2;
          const scale = offset === 0 ? 1 : Math.max(0.6, 0.82 - (abs - 1) * 0.1);
          const style: CSSProperties = {
            transform: `translateX(calc(-50% + ${offset * 52}%)) scale(${scale}) rotateY(${offset === 0 ? 0 : offset > 0 ? -22 : 22}deg)`,
            opacity: visible ? (offset === 0 ? 1 : abs === 1 ? 0.72 : 0.38) : 0,
            zIndex: 20 - abs,
            pointerEvents: visible ? "auto" : "none",
          };
          return (
            <button
              key={slide.id}
              type="button"
              className={`crazy-featured__card ${offset === 0 ? "is-active" : ""}`}
              style={style}
              onClick={() => onCardClick(i, slide)}
              aria-hidden={!visible}
              tabIndex={offset === 0 ? 0 : -1}
            >
              <div
                className="crazy-featured__media"
                style={slide.image ? { backgroundImage: `url(${slide.image})` } : undefined}
              />
              <div className="crazy-featured__shade" />
              {offset === 0 ? (
                <>
                  <span className="crazy-featured__fav" aria-hidden="true"><Heart /></span>
                  <div className="crazy-featured__content">
                    {slide.badge ? (
                      <span
                        style={{
                          alignSelf: "flex-start",
                          padding: "2px 10px",
                          borderRadius: 999,
                          background: "#1e6fff",
                          fontSize: ".6rem",
                          fontWeight: 800,
                          letterSpacing: ".08em",
                          marginBottom: ".5rem",
                        }}
                      >
                        {slide.badge}
                      </span>
                    ) : null}
                    <h3>{slide.title}</h3>
                    <p>{slide.subtitle}</p>
                    <div className="crazy-featured__actions">
                      <span className="crazy-featured__cta">VER AGORA</span>
                      <span className="crazy-featured__play" aria-hidden="true"><Play /></span>
                    </div>
                  </div>
                </>
              ) : null}
            </button>
          );
        })}
      </div>
      {slides.length > 1 ? (
        <div className="crazy-featured__dots">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={i === active ? "is-active" : ""}
              onClick={() => go(i)}
              aria-label={`Ir para o destaque ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

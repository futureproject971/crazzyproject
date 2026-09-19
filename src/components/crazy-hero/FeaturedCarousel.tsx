import { CSSProperties, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Slide = { id: string; title: string; subtitle: string; image: string | null; href: string | null };

// Neutral placeholders shown while offline or with no featured products yet.
const PLACEHOLDERS: Slide[] = [
  { id: "ph-1", title: "Seu produto em destaque", subtitle: "Marque um produto como NOVO no admin", image: null, href: null },
  { id: "ph-2", title: "Novidades", subtitle: "Os produtos novos aparecem aqui", image: null, href: null },
  { id: "ph-3", title: "Destaques", subtitle: "Navegue entre eles e clique para abrir", image: null, href: null },
  { id: "ph-4", title: "Lançamentos", subtitle: "Em destaque na loja", image: null, href: null },
  { id: "ph-5", title: "Coleção", subtitle: "Em breve", image: null, href: null },
];

export function FeaturedCarousel() {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<Slide[]>(PLACEHOLDERS);
  const [active, setActive] = useState(0);

  // Load featured products from the backend when it is connected.
  useEffect(() => {
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
        setSlides(
          data.map((p: { id: string; name: string; description: string | null; image_url: string | null }) => ({
            id: p.id,
            title: p.name,
            subtitle: p.description || "Novidade na loja",
            image: p.image_url,
            href: `/produto/${p.id}`,
          })),
        );
        setActive(0);
      } catch {
        /* offline: keep neutral placeholders */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setActive((a) => (a + 1) % slides.length), 5200);
    return () => clearInterval(t);
  }, [slides.length]);

  const go = (i: number) => setActive(((i % slides.length) + slides.length) % slides.length);

  const onCardClick = (i: number, slide: Slide) => {
    if (i !== active) return go(i);
    navigate(slide.href || "/produtos");
  };

  return (
    <div className="crazy-featured" aria-label="Produtos em destaque">
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
    </div>
  );
}

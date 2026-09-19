import { CSSProperties, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

export interface FeaturedCarouselItem {
  id: string;
  title: string;
  subtitle: string;
  image: string | null;
  badge?: string | null;
}

interface FeaturedCarouselProps {
  items: FeaturedCarouselItem[];
  loading?: boolean;
  onOpen: (productId: string) => void;
}

export function FeaturedCarousel({ items, loading = false, onOpen }: FeaturedCarouselProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(0, items.length - 1)));
  }, [items.length]);

  // Autoplay exists already; task 6 will refine timing/pause semantics.
  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % items.length),
      5200,
    );
    return () => window.clearInterval(timer);
  }, [items.length]);

  if (loading) {
    return <div className="crazy-featured crazy-featured--empty">Carregando produtos...</div>;
  }

  if (items.length === 0) {
    return <div className="crazy-featured crazy-featured--empty">Nenhum produto ativo nesta categoria no momento.</div>;
  }

  const go = (index: number) => setActive(((index % items.length) + items.length) % items.length);

  const onCardClick = (index: number, item: FeaturedCarouselItem) => {
    if (index !== active) {
      go(index);
      return;
    }
    onOpen(item.id);
  };

  return (
    <div className="crazy-featured" aria-label="Produtos da categoria em destaque">
      <div className="crazy-featured__stage">
        {items.map((item, index) => {
          const count = items.length;
          let offset = index - active;
          if (offset > count / 2) offset -= count;
          if (offset < -count / 2) offset += count;
          const distance = Math.abs(offset);
          const visible = distance <= 2;
          const scale = offset === 0 ? 1 : Math.max(0.62, 0.82 - (distance - 1) * 0.1);
          const style: CSSProperties = {
            transform: `translateX(calc(-50% + ${offset * 52}%)) scale(${scale}) rotateY(${offset === 0 ? 0 : offset > 0 ? -22 : 22}deg)`,
            opacity: visible ? (offset === 0 ? 1 : distance === 1 ? 0.72 : 0.38) : 0,
            zIndex: 20 - distance,
            pointerEvents: visible ? "auto" : "none",
          };

          return (
            <button
              key={item.id}
              type="button"
              className={`crazy-featured__card ${offset === 0 ? "is-active" : ""}`}
              style={style}
              onClick={() => onCardClick(index, item)}
              aria-hidden={!visible}
              tabIndex={offset === 0 ? 0 : -1}
            >
              <div
                className="crazy-featured__media"
                style={item.image ? { backgroundImage: `url(${item.image})` } : undefined}
              />
              <div className="crazy-featured__shade" />
              {offset === 0 ? (
                <div className="crazy-featured__content">
                  {item.badge ? <span className="crazy-featured__badge">{item.badge}</span> : null}
                  <h3>{item.title}</h3>
                  <p>{item.subtitle}</p>
                  <div className="crazy-featured__actions">
                    <span className="crazy-featured__cta">Ver agora</span>
                    <span className="crazy-featured__play" aria-hidden="true"><Play /></span>
                  </div>
                </div>
              ) : null}
            </button>
          );
        })}

        {items.length > 1 ? (
          <>
            <button
              type="button"
              className="crazy-featured__arrow crazy-featured__arrow--left"
              onClick={() => go(active - 1)}
              aria-label="Produto anterior"
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              className="crazy-featured__arrow crazy-featured__arrow--right"
              onClick={() => go(active + 1)}
              aria-label="Próximo produto"
            >
              <ChevronRight />
            </button>
          </>
        ) : null}
      </div>

      {items.length > 1 ? (
        <div className="crazy-featured__dots">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === active ? "is-active" : ""}
              onClick={() => go(index)}
              aria-label={`Ir para o produto ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

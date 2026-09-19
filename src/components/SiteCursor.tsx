import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "[role='button']",
  "[data-cursor='interactive']",
  "input[type='checkbox']",
  "input[type='radio']",
  "input[type='range']",
  "select",
].join(",");

const TEXT_SELECTOR = [
  "input:not([type])",
  "input[type='text']",
  "input[type='email']",
  "input[type='password']",
  "input[type='search']",
  "input[type='url']",
  "input[type='tel']",
  "input[type='number']",
  "textarea",
  "[contenteditable='true']",
].join(",");

/**
 * Cursor visual exclusivo do site CRAZZY PROJECT.
 *
 * - Só ativa em dispositivos com ponteiro fino (mouse/trackpad).
 * - Não interfere com toque.
 * - Em campos de texto mantém o cursor nativo de digitação.
 * - O desenho pode ser trocado depois sem alterar a lógica de rastreamento.
 */
export function SiteCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const finePointer = window.matchMedia("(pointer: fine)");
    if (!cursor || !finePointer.matches) return;

    const root = document.documentElement;
    root.classList.add("crazy-custom-cursor-enabled");

    let raf = 0;
    let x = -100;
    let y = -100;

    const paint = () => {
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      raf = 0;
    };

    const schedulePaint = () => {
      if (!raf) raf = window.requestAnimationFrame(paint);
    };

    const updateTargetState = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      const overText = Boolean(element?.closest(TEXT_SELECTOR));
      const interactive = Boolean(element?.closest(INTERACTIVE_SELECTOR));

      cursor.classList.toggle("is-text", overText);
      cursor.classList.toggle("is-interactive", interactive && !overText);
    };

    const onMove = (event: MouseEvent) => {
      x = event.clientX;
      y = event.clientY;
      cursor.classList.add("is-visible");
      updateTargetState(event.target);
      schedulePaint();
    };

    const hide = () => {
      cursor.classList.remove("is-visible");
    };

    const onPointerModeChange = () => {
      if (!finePointer.matches) {
        root.classList.remove("crazy-custom-cursor-enabled");
        hide();
      } else {
        root.classList.add("crazy-custom-cursor-enabled");
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("blur", hide);
    document.addEventListener("mouseleave", hide);
    finePointer.addEventListener?.("change", onPointerModeChange);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      root.classList.remove("crazy-custom-cursor-enabled");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("blur", hide);
      document.removeEventListener("mouseleave", hide);
      finePointer.removeEventListener?.("change", onPointerModeChange);
    };
  }, []);

  return (
    <div ref={cursorRef} className="crazy-site-cursor" aria-hidden="true">
      <span className="crazy-site-cursor__ring" />
      <span className="crazy-site-cursor__dot" />
    </div>
  );
}

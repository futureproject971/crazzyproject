export function HudDecoration() {
  return (
    <div className="crazy-hud" aria-hidden="true">
      <div className="crazy-hud__copy crazy-hud__copy--tl">
        <span>GAMES</span>
        <span>PERFORMANCE</span>
        <span>LIBERDADE</span>
        <span>SEM LIMITES</span>
      </div>
      <div className="crazy-hud__copy crazy-hud__copy--br">
        <span>JOGUE</span>
        <span>MAIS</span>
        <span>VIVA</span>
        <span>LIVRE</span>
      </div>
      <div className="crazy-hud__line crazy-hud__line--left" />
      <div className="crazy-hud__line crazy-hud__line--right" />
    </div>
  );
}

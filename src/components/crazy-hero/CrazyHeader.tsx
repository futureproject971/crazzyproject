import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CircleHelp, Grid2X2, Home, Menu, Search, ShieldAlert, ShoppingCart, Star, UserRound, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import AuthModal from "@/components/AuthModal";
import CartSheet from "@/components/CartSheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

const links = [
  { label: "Início", to: "/", icon: Home },
  { label: "Produtos", to: "/produtos", icon: Grid2X2 },
  { label: "Contas", to: "/contas", icon: Grid2X2 },
  { label: "Status", to: "/status", icon: CircleHelp },
  { label: "Avaliações", to: "/avaliacoes", icon: Star },
];

export function CrazyHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const { totalItems, cartOpen, setCartOpen, requiresAuth, clearRequiresAuth } = useCart();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (requiresAuth) {
      setAuthOpen(true);
      clearRequiresAuth();
    }
  }, [requiresAuth, clearRequiresAuth]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const isActive = (to: string) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/produtos?q=${encodeURIComponent(value)}` : "/produtos");
    setMenuOpen(false);
  };

  const goTo = (to: string) => {
    navigate(to);
    setMenuOpen(false);
  };

  const openAccount = () => {
    if (user) navigate("/dashboard");
    else setAuthOpen(true);
    setMenuOpen(false);
  };

  return (
    <>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab="login" />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />

      <header className="crazy-site-header">
        <div className="crazy-site-header__inner">
          <Link to="/" className="crazy-site-header__brand" aria-label="CRAZZY PROJECT - Início">
            <span>CRAZZY</span>
            <strong>PROJECT</strong>
          </Link>

          <nav className="crazy-site-header__nav" aria-label="Navegação principal">
            {links.map(({ label, to, icon: Icon }) => (
              <button key={label} type="button" onClick={() => goTo(to)} className={isActive(to) ? "is-active" : ""}>
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <form className="crazy-site-header__search" onSubmit={submitSearch} role="search">
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar jogos, produtos..."
              aria-label="Buscar produtos"
            />
          </form>

          <div className="crazy-site-header__actions">
            <ThemeToggle />
            {isAdmin ? (
              <button
                type="button"
                className="crazy-site-header__account"
                onClick={() => goTo("/admin")}
                title="Painel Admin"
              >
                <ShieldAlert aria-hidden="true" />
                <span>Admin</span>
              </button>
            ) : null}
            <button type="button" className="crazy-site-header__account" onClick={openAccount}>
              <UserRound aria-hidden="true" />
              <span>{user ? "Conta" : "Login"}</span>
            </button>
            <button type="button" className="crazy-site-header__cart" onClick={() => setCartOpen(true)}>
              <ShoppingCart aria-hidden="true" />
              <span>Carrinho</span>
              <b>{totalItems}</b>
            </button>
            <button
              type="button"
              className="crazy-site-header__menu"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            className="crazy-mobile-nav"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <form className="crazy-mobile-nav__search" onSubmit={submitSearch}>
              <Search aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produtos..." />
            </form>
            {links.map(({ label, to, icon: Icon }) => (
              <button key={label} type="button" onClick={() => goTo(to)}>
                <Icon aria-hidden="true" /> {label}
              </button>
            ))}
            <button type="button" onClick={openAccount}>
              <UserRound aria-hidden="true" /> {user ? "Minha Conta" : "Entrar / Criar conta"}
            </button>
            {isAdmin ? (
              <button type="button" onClick={() => goTo("/admin")}>
                <ShieldAlert aria-hidden="true" /> Painel Admin
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

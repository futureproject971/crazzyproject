import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CircleHelp, Grid2X2, Home, Menu, Search, ShoppingCart, UserRound, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import AuthModal from "@/components/AuthModal";
import CartSheet from "@/components/CartSheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

const links = [
  { label: "Início", to: "/", icon: Home },
  { label: "Categorias", to: "#categorias", icon: Grid2X2 },
  { label: "Produtos", to: "/produtos", icon: Grid2X2 },
  { label: "FAQ", to: "#faq", icon: CircleHelp },
];

export function CrazyHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/produtos?q=${encodeURIComponent(value)}` : "/produtos");
    setMenuOpen(false);
  };

  const goTo = (to: string) => {
    if (to.startsWith("#")) {
      document.querySelector(to)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setMenuOpen(false);
      return;
    }
    navigate(to);
    setMenuOpen(false);
  };

  return (
    <>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab="login" />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />

      <header className="crazy-site-header">
        <div className="crazy-site-header__inner">
          <Link to="/" className="crazy-site-header__brand" aria-label="CRAZZY PROJET - Início">
            <span>CRAZZY</span>
            <strong>PROJET</strong>
          </Link>

          <nav className="crazy-site-header__nav" aria-label="Navegação principal">
            {links.map(({ label, to, icon: Icon }) => (
              <button key={label} type="button" onClick={() => goTo(to)} className={label === "Início" ? "is-active" : ""}>
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
            <button
              type="button"
              className="crazy-site-header__account"
              onClick={() => user ? navigate("/dashboard") : setAuthOpen(true)}
            >
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
            transition={{ duration: .2 }}
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

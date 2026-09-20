import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CircleHelp, Gift, Grid2X2, Home, Menu, Search, ShieldAlert, ShoppingCart, Star, UserRound, X } from "lucide-react";
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
  { label: "Rewards", to: "/rewards", icon: Star },
  { label: "Extras", to: "/extras", icon: Gift },
  { label: "FAQ", to: "/faq", icon: CircleHelp },
];

const mobileExtraLinks = [
  { label: "Meus Pedidos", to: "/meus-pedidos", icon: Grid2X2 },
];

export function CrazyHeader({ categories = [], storeLayout = false }: { categories?: { id: string; name: string; slug: string }[]; storeLayout?: boolean }) {
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

  const openCategories = () => {
    setMenuOpen(false);
    if (location.pathname === "/") {
      document.getElementById("categorias")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    navigate("/#categorias");
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

      {storeLayout ? (
        <>
          <aside className="store-desktop-sidebar" aria-label="Navegação da loja">
            <Link to="/" className="store-desktop-sidebar__brand" aria-label="CRAZZY PROJECT - Início">
              <span>CRAZZY</span>
              <strong>PROJECT</strong>
            </Link>

            <nav className="store-desktop-sidebar__nav" aria-label="Navegação principal">
              <button type="button" onClick={() => goTo("/")} className={isActive("/") ? "is-active" : ""}>
                <Home aria-hidden="true" />
                <span>Início</span>
              </button>
              <button type="button" onClick={openCategories}>
                <Grid2X2 aria-hidden="true" />
                <span>Categorias</span>
              </button>
              {links.filter((item) => item.to !== "/").map(({ label, to, icon: Icon }) => (
                <button key={label} type="button" onClick={() => goTo(to)} className={isActive(to) ? "is-active" : ""}>
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>

            {categories.length > 0 ? (
              <nav className="store-desktop-sidebar__categories" aria-label="Categorias da loja">
                <span>CATEGORIAS</span>
                {categories.map((category) => (
                  <Link key={category.id} to={`/produtos?game=${encodeURIComponent(category.slug)}`}>
                    <Grid2X2 aria-hidden="true" />
                    {category.name}
                  </Link>
                ))}
              </nav>
            ) : null}
          </aside>

          <header className="store-desktop-topbar">
            <form className="store-desktop-topbar__search" onSubmit={submitSearch} role="search">
              <Search aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar jogos, produtos..."
                aria-label="Buscar produtos"
              />
            </form>

            <div className="store-desktop-topbar__actions">
              <ThemeToggle />
              {isAdmin ? (
                <button type="button" className="store-desktop-topbar__button" onClick={() => goTo("/admin")} title="Painel Admin">
                  <ShieldAlert aria-hidden="true" />
                  <span>Admin</span>
                </button>
              ) : null}
              <button type="button" className="store-desktop-topbar__button" onClick={openAccount}>
                <UserRound aria-hidden="true" />
                <span>{user ? "Conta" : "Login"}</span>
              </button>
              <button type="button" className="store-desktop-topbar__cart" onClick={() => setCartOpen(true)}>
                <ShoppingCart aria-hidden="true" />
                <span>Carrinho</span>
                <b>{totalItems}</b>
              </button>
            </div>
          </header>
        </>
      ) : null}

      <header className={`crazy-site-header ${storeLayout ? "crazy-site-header--store-mobile" : ""}`}>
        <div className="crazy-site-header__inner">
          <Link to="/" className="crazy-site-header__brand" aria-label="CRAZZY PROJECT - Início">
            <span>CRAZZY</span>
            <strong>PROJECT</strong>
          </Link>

          <nav className="crazy-site-header__nav" aria-label="Navegação principal">
            <button type="button" onClick={() => goTo("/")} className={isActive("/") ? "is-active" : ""}>
              <Home aria-hidden="true" />
              <span>Início</span>
            </button>
            <button type="button" onClick={openCategories}>
              <Grid2X2 aria-hidden="true" />
              <span>Categorias</span>
            </button>
            {links.filter((item) => item.to !== "/").map(({ label, to, icon: Icon }) => (
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

          {categories.length > 0 && <nav className="store-sidebar-categories" aria-label="Categorias da loja">
            <span>CATEGORIAS</span>
            {categories.map(category => <Link key={category.id} to={`/produtos?game=${encodeURIComponent(category.slug)}`}><Grid2X2 aria-hidden="true" />{category.name}</Link>)}
          </nav>}
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
            <button type="button" onClick={openCategories}>
              <Grid2X2 aria-hidden="true" /> Categorias
            </button>
            {links.map(({ label, to, icon: Icon }) => (
              <button key={label} type="button" onClick={() => goTo(to)}>
                <Icon aria-hidden="true" /> {label}
              </button>
            ))}
            {mobileExtraLinks.map(({ label, to, icon: Icon }) => (
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

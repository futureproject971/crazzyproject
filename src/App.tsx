import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FuturisticBackground } from "@/components/crazy-hero/FuturisticBackground";
import { SiteCursor } from "@/components/SiteCursor";
import SupportHub from "@/components/SupportHub";
import Index from "./pages/Index";

const Produtos = lazy(() => import("./pages/Produtos"));
const ProdutoDetalhes = lazy(() => import("./pages/ProdutoDetalhes"));
const Contas = lazy(() => import("./pages/Contas"));
const ContaDetalhes = lazy(() => import("./pages/ContaDetalhes"));
const LolDetalhes = lazy(() => import("./pages/LolDetalhes"));
const FortniteDetalhes = lazy(() => import("./pages/FortniteDetalhes"));
const MinecraftDetalhes = lazy(() => import("./pages/MinecraftDetalhes"));
const Status = lazy(() => import("./pages/Status"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Avaliacoes = lazy(() => import("./pages/Avaliacoes"));
const MeusPedidos = lazy(() => import("./pages/MeusPedidos"));
const PedidoChat = lazy(() => import("./pages/PedidoChat"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Carrinho = lazy(() => import("./pages/Carrinho"));
const Rewards = lazy(() => import("./pages/Rewards"));
const Experiencias = lazy(() => import("./pages/Experiencias"));
const Faq = lazy(() => import("./pages/Faq"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({});

function RouteFallback() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center" role="status" aria-live="polite">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Carregando
      </span>
    </div>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <FuturisticBackground />
            <SiteCursor />
            <SupportHub />
            <BrowserRouter>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/produtos" element={<Produtos />} />
                  <Route path="/produto/:id" element={<ProdutoDetalhes />} />
                  <Route path="/contas" element={<Contas />} />
                  <Route path="/conta/:id" element={<ContaDetalhes />} />
                  <Route path="/lol/:id" element={<LolDetalhes />} />
                  <Route path="/fortnite/:id" element={<FortniteDetalhes />} />
                  <Route path="/minecraft/:id" element={<MinecraftDetalhes />} />
                  <Route path="/status" element={<Status />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/avaliacoes" element={<Avaliacoes />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/meus-pedidos" element={<MeusPedidos />} />
                  <Route path="/pedido/:id" element={<PedidoChat />} />
                  <Route path="/carrinho" element={<Carrinho />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/rewards" element={<Rewards />} />
                  <Route path="/extras" element={<Experiencias />} />
                  <Route path="/faq" element={<Faq />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

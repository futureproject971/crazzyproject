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
import Index from "./pages/Index";
import Produtos from "./pages/Produtos";
import ProdutoDetalhes from "./pages/ProdutoDetalhes";
import Contas from "./pages/Contas";
import ContaDetalhes from "./pages/ContaDetalhes";
import LolDetalhes from "./pages/LolDetalhes";
import FortniteDetalhes from "./pages/FortniteDetalhes";
import MinecraftDetalhes from "./pages/MinecraftDetalhes";
import Status from "./pages/Status";
import AdminPanel from "./pages/AdminPanel";
import Dashboard from "./pages/Dashboard";
import Avaliacoes from "./pages/Avaliacoes";
import MeusPedidos from "./pages/MeusPedidos";
import PedidoChat from "./pages/PedidoChat";
import Checkout from "./pages/Checkout";
import Carrinho from "./pages/Carrinho";
import Rewards from "./pages/Rewards";
import Faq from "./pages/Faq";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({});

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
          <BrowserRouter>
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
              <Route path="/faq" element={<Faq />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

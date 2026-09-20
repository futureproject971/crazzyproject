import { useEffect, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Trash2, Tag, Loader2, X, Shield, Zap, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface AppliedCoupon {
  id: string;
  code: string;
  subtotal: number;
  discount: number;
  final: number;
}

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CartSheet = ({ open, onOpenChange }: CartSheetProps) => {
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const cartSignature = items
    .map((item) => item.productId + ":" + item.planId + ":" + item.quantity)
    .join("|");

  useEffect(() => {
    setAppliedCoupon(null);
  }, [cartSignature]);

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    if (!user) {
      toast({ title: "Faça login para usar cupons", variant: "destructive" });
      return;
    }

    setCouponLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Entre novamente.");

      const cartSnapshot = items.map((item) => ({
        productId: item.productId,
        planId: item.planId,
        quantity: item.quantity,
        type: item.type,
        lztItemId: item.lztItemId,
        lztPrice: item.lztPrice,
        lztCurrency: item.lztCurrency,
        lztGame: item.lztGame,
        productName: item.productName,
        productImage: item.productImage,
        planName: item.planName,
        price: item.price,
        skinsCount: item.skinsCount,
      }));

      const response = await fetch(
        import.meta.env.VITE_SUPABASE_URL + "/functions/v1/coupon-validate",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + session.access_token,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, cart_snapshot: cartSnapshot }),
        },
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Cupom inválido ou indisponível");
      }

      const subtotal = Number(result.authoritativeSubtotalCents || 0) / 100;
      const discount = Number(result.authoritativeDiscountCents || 0) / 100;
      const final = Number(result.authoritativeTotalCents || 0) / 100;
      setAppliedCoupon({
        id: result.coupon.id,
        code: result.coupon.code,
        subtotal,
        discount,
        final,
      });
      toast({
        title: "Cupom aplicado!",
        description: result.coupon.code + " · desconto de R$ " + discount.toFixed(2),
      });
    } catch (error: any) {
      setAppliedCoupon(null);
      toast({
        title: "Cupom não aplicado",
        description: error?.message || "Não foi possível validar o cupom.",
        variant: "destructive",
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const discountAmount = appliedCoupon?.discount ?? 0;
  const finalPrice = appliedCoupon?.final ?? totalPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 border-border overflow-hidden gap-0 rounded-2xl [&>button:last-child]:hidden">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-10 rounded-full w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex min-h-[520px]">
          {/* Left side - Summary & Info */}
          <div className="hidden md:flex flex-col w-[45%] bg-card relative overflow-hidden">
            <div className="relative z-10 flex flex-col h-full p-10">
              <div className="flex items-center gap-3 mb-8">
                <span className="text-xl font-bold tracking-[0.14em]" style={{ fontFamily: "'Valorant', sans-serif" }}>
                  <span className="text-foreground">CRAZZY</span> <span className="text-success">PROJECT</span>
                </span>
              </div>

              <div className="flex flex-col gap-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Entrega Instantânea</p>
                    <p className="text-xs text-muted-foreground">Receba seu produto em segundos após a compra</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Pagamento Seguro</p>
                    <p className="text-xs text-muted-foreground">Seus dados protegidos em todas as transações</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Garantia de Troca</p>
                    <p className="text-xs text-muted-foreground">Suporte 24h caso tenha qualquer problema</p>
                  </div>
                </div>
              </div>

              {/* Order summary on left */}
              <div className="flex-1 flex flex-col justify-end">
                <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo do Pedido</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{totalItems} {totalItems === 1 ? "item" : "itens"}</span>
                      <span className="text-foreground font-medium">R$ {totalPrice.toFixed(2)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-sm">
                        <span className="text-success">Desconto ({appliedCoupon.code})</span>
                        <span className="text-success font-medium">- R$ {discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border pt-3 flex items-end justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Total</span>
                    <span className="text-2xl font-bold text-success">R$ {finalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative glow */}
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-success/5 rounded-full blur-3xl" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-success/5 rounded-full blur-3xl" />
          </div>

          {/* Right side - Cart items */}
          <div className="flex-1 flex flex-col bg-background">
            <div className="px-6 pt-6 pb-3 border-b border-border md:hidden">
              <h2 className="flex items-center gap-2 text-foreground font-bold text-lg">
                <ShoppingCart className="h-5 w-5 text-success" />
                <span style={{ fontFamily: "'Valorant', sans-serif" }} className="tracking-wider">
                  <span className="text-success">MEU</span> CARRINHO
                </span>
                {totalItems > 0 && (
                  <span className="ml-auto rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-bold text-success">
                    {totalItems}
                  </span>
                )}
              </h2>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-5 py-12">
                <ShoppingCart className="h-14 w-14 text-muted-foreground/15" />
                <p className="mt-3 text-sm font-semibold text-muted-foreground">Seu carrinho está vazio</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Adicione produtos para continuar</p>
                <button
                  onClick={() => { onOpenChange(false); navigate("/produtos"); }}
                  className="mt-5 rounded-lg bg-success px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-success-foreground transition-all hover:shadow-[0_0_24px_hsl(var(--success)/0.4)]"
                  style={{ fontFamily: "'Valorant', sans-serif" }}
                >
                  VER PRODUTOS
                </button>
              </div>
            ) : (
              <>
                {/* Items */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5 max-h-[350px]">
                  <AnimatePresence mode="popLayout">
                    {items.map((item, idx) => (
                      <motion.div
                        key={`${item.productId}-${item.planId}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-success/30"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary/50">
                          {item.productImage ? (
                            <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ShoppingCart className="h-5 w-5 text-muted-foreground/20" />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col justify-between min-w-0">
                          <div>
                            <h3 className="text-xs font-bold text-foreground truncate">{item.productName}</h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{item.planName}</p>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <button
                              onClick={() => updateQuantity(item.productId, item.planId, item.quantity - 1)}
                              className="flex h-5 w-5 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-success hover:text-success"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.planId, item.quantity + 1)}
                              className="flex h-5 w-5 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-success hover:text-success"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between">
                          <button
                            onClick={() => removeItem(item.productId, item.planId)}
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <div className="text-right">
                            <span className="text-xs font-bold text-success">
                              R$ {(item.price * item.quantity).toFixed(2)}
                            </span>
                            {item.quantity > 1 && (
                              <p className="text-[9px] text-muted-foreground">R$ {item.price.toFixed(2)} /un</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <button
                    onClick={clearCart}
                    className="mt-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Limpar carrinho
                  </button>
                </div>

                {/* Footer - coupon & checkout */}
                <div className="border-t border-border bg-card/50 px-5 py-4 space-y-3">
                  {/* Coupon */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Tag className="h-2.5 w-2.5" /> Cupom de Desconto
                    </p>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 px-3 py-1.5">
                        <div>
                          <span className="text-[10px] font-bold text-success">{appliedCoupon.code}</span>
                          <span className="ml-2 text-[10px] text-muted-foreground">
                            -R$ {appliedCoupon.discount.toFixed(2)}
                          </span>
                        </div>
                        <button onClick={() => setAppliedCoupon(null)} className="text-muted-foreground hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase().slice(0, 20))}
                          placeholder="CÓDIGO"
                          className="flex-1 rounded-lg border border-border bg-secondary/50 px-2.5 py-1.5 text-[10px] font-medium text-foreground uppercase placeholder:text-muted-foreground outline-none focus:border-success/50"
                        />
                        <button
                          onClick={applyCoupon}
                          disabled={couponLoading || !couponCode.trim()}
                          className="rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-[10px] font-bold text-success transition-colors hover:bg-success/20 disabled:opacity-50"
                        >
                          {couponLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aplicar"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mobile total */}
                  <div className="md:hidden space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground font-medium">R$ {totalPrice.toFixed(2)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-success">Desconto</span>
                        <span className="text-success font-medium">- R$ {discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-end justify-between pt-2 border-t border-border">
                      <span className="text-xs font-medium text-muted-foreground">Total</span>
                      <span className="text-xl font-bold text-success">R$ {finalPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!user) { toast({ title: "Faça login para comprar", variant: "destructive" }); return; }
                      onOpenChange(false);
                      const params = new URLSearchParams();
                      if (appliedCoupon) {
                        params.set("coupon_id", appliedCoupon.id);
                      }
                      navigate(`/checkout${params.toString() ? `?${params.toString()}` : ""}`);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3 text-xs font-bold uppercase tracking-wider text-success-foreground transition-all hover:shadow-[0_0_24px_hsl(var(--success)/0.4)]"
                    style={{ fontFamily: "'Valorant', sans-serif" }}
                  >
                    <Zap className="h-4 w-4" />
                    FINALIZAR COMPRA
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CartSheet;

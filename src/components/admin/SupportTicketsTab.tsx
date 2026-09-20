import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Hash,
  Headphones,
  Loader2,
  Search,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type TicketStatus = "open" | "waiting_staff" | "waiting_user" | "resolved" | "closed";

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  username?: string;
  avatar_url?: string | null;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: "user" | "staff";
  message: string;
  created_at: string;
}

const categories: Record<string, string> = {
  general: "Dúvida geral",
  pre_sale: "Pré-venda",
  payment: "Pagamento",
  product: "Produto",
  technical: "Técnico",
  order: "Pedido",
};

const statusMeta: Record<TicketStatus, { label: string; dot: string; className: string }> = {
  open: { label: "Aberto", dot: "bg-blue-400", className: "border-blue-400/20 bg-blue-400/10 text-blue-300" },
  waiting_staff: { label: "Aguardando suporte", dot: "bg-amber-400", className: "border-amber-400/20 bg-amber-400/10 text-amber-300" },
  waiting_user: { label: "Aguardando cliente", dot: "bg-emerald-400", className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" },
  resolved: { label: "Resolvido", dot: "bg-violet-400", className: "border-violet-400/20 bg-violet-400/10 text-violet-300" },
  closed: { label: "Encerrado", dot: "bg-zinc-500", className: "border-border bg-muted text-muted-foreground" },
};

const shortId = (id: string) => id.replace(/-/g, "").slice(0, 6).toLowerCase();

export default function SupportTicketsTab() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | TicketStatus>("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar suporte", description: error.message, variant: "destructive" });
      setLoadingTickets(false);
      return;
    }

    const rows = (data || []) as SupportTicket[];
    const userIds = [...new Set(rows.map((ticket) => ticket.user_id))];
    let profiles: { user_id: string; username: string | null; avatar_url: string | null }[] = [];

    if (userIds.length) {
      const profileResult = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);
      profiles = profileResult.data || [];
    }

    const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
    const hydrated = rows.map((ticket) => {
      const profile = profileMap.get(ticket.user_id);
      return {
        ...ticket,
        username: profile?.username || "Cliente",
        avatar_url: profile?.avatar_url || null,
      };
    });

    setTickets(hydrated);
    setSelectedTicket((current) => current ? hydrated.find((ticket) => ticket.id === current.id) || null : current);
    setLoadingTickets(false);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", selectedTicket.id)
        .order("created_at", { ascending: true });

      if (!cancelled) {
        if (error) {
          toast({ title: "Erro ao carregar conversa", description: error.message, variant: "destructive" });
        } else {
          setMessages((data || []) as SupportMessage[]);
        }
        setLoadingMessages(false);
      }
    };

    loadMessages();

    const channel = supabase
      .channel(`support-admin-${selectedTicket.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        (payload) => {
          const incoming = payload.new as SupportMessage;
          setMessages((prev) => prev.some((message) => message.id === incoming.id) ? prev : [...prev, incoming]);
          fetchTickets();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_tickets",
          filter: `id=eq.${selectedTicket.id}`,
        },
        (payload) => {
          const incoming = payload.new as SupportTicket;
          setSelectedTicket((current) => current ? { ...current, ...incoming } : incoming);
          fetchTickets();
        },
      )
      .subscribe();

    const poll = window.setInterval(loadMessages, 7000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [selectedTicket?.id, fetchTickets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!user || !selectedTicket || sending) return;
    const text = newMessage.trim();
    if (!text) return;

    setSending(true);
    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: selectedTicket.id,
        sender_id: user.id,
        sender_role: "staff",
        message: text,
      })
      .select("*")
      .single();

    if (error) {
      toast({ title: "Erro ao responder", description: error.message, variant: "destructive" });
    } else if (data) {
      setMessages((prev) => prev.some((message) => message.id === data.id) ? prev : [...prev, data as SupportMessage]);
      setNewMessage("");
      await fetchTickets();
    }
    setSending(false);
  };

  const updateStatus = async (status: TicketStatus) => {
    if (!selectedTicket || updatingStatus) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("support_tickets")
      .update({
        status,
        closed_at: status === "closed" ? new Date().toISOString() : null,
      })
      .eq("id", selectedTicket.id);

    if (error) {
      toast({ title: "Erro ao alterar status", description: error.message, variant: "destructive" });
    } else {
      setSelectedTicket((current) => current ? { ...current, status, closed_at: status === "closed" ? new Date().toISOString() : null } : current);
      await fetchTickets();
    }
    setUpdatingStatus(false);
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (filter !== "all" && ticket.status !== filter) return false;
      if (!needle) return true;
      return [
        ticket.subject,
        ticket.username,
        ticket.id,
        categories[ticket.category],
      ].some((value) => value?.toLowerCase().includes(needle));
    });
  }, [tickets, filter, query]);

  const waitingCount = tickets.filter((ticket) => ticket.status === "waiting_staff" || ticket.status === "open").length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#5865F2]">Support Hub</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">Atendimento estilo Discord</h2>
          <p className="mt-1 text-xs text-muted-foreground">{waitingCount} ticket(s) aguardando a equipe.</p>
        </div>
        <button
          type="button"
          onClick={fetchTickets}
          className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Atualizar fila
        </button>
      </div>

      <div className="grid min-h-[620px] overflow-hidden rounded-xl border border-border bg-[#111318] text-zinc-100 lg:grid-cols-[310px_1fr]">
        <aside className="border-r border-white/10 bg-[#17191f]">
          <div className="border-b border-white/10 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar ticket ou cliente..."
                className="h-10 w-full rounded-md bg-[#1e1f22] pl-9 pr-3 text-xs outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-[#5865F2]"
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {([
                ["all", "Todos"],
                ["waiting_staff", "Fila"],
                ["waiting_user", "Cliente"],
                ["resolved", "Resolvidos"],
                ["closed", "Fechados"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded px-2 py-1 text-[10px] font-bold transition ${filter === value ? "bg-[#5865F2] text-white" : "bg-white/5 text-zinc-400 hover:text-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[540px] overflow-y-auto p-2">
            {loadingTickets ? (
              <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-center text-xs text-zinc-500">Nenhum ticket nesta fila.</p>
            ) : (
              filtered.map((ticket) => {
                const meta = statusMeta[ticket.status];
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicket(ticket)}
                    className={`mb-1 w-full rounded-lg p-3 text-left transition ${selectedTicket?.id === ticket.id ? "bg-[#404249]" : "hover:bg-white/5"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 shrink-0 text-zinc-500" />
                      <span className="min-w-0 flex-1 truncate text-xs font-bold">ticket-{shortId(ticket.id)}</span>
                      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    </div>
                    <p className="mt-1 truncate pl-6 text-[11px] text-zinc-400">{ticket.subject}</p>
                    <div className="mt-2 flex items-center justify-between pl-6 text-[10px] text-zinc-500">
                      <span className="truncate">{ticket.username}</span>
                      <span>{new Date(ticket.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-col bg-[#313338]">
          {!selectedTicket ? (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5865F2]">
                <Headphones className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-lg font-black">Selecione um ticket</h3>
              <p className="mt-2 max-w-sm text-sm text-zinc-400">A fila do lado esquerdo funciona como a lista de canais do Discord.</p>
            </div>
          ) : (
            <>
              <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-black/20 px-4 py-3">
                <Hash className="h-5 w-5 text-zinc-400" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold">ticket-{shortId(selectedTicket.id)}</h3>
                  <p className="truncate text-[11px] text-zinc-400">
                    {selectedTicket.username} · {categories[selectedTicket.category] || selectedTicket.category} · {selectedTicket.subject}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusMeta[selectedTicket.status].className}`}>
                  {statusMeta[selectedTicket.status].label}
                </span>
                <select
                  value={selectedTicket.status}
                  onChange={(event) => updateStatus(event.target.value as TicketStatus)}
                  disabled={updatingStatus}
                  className="rounded-md border border-white/10 bg-[#1e1f22] px-2 py-1.5 text-[11px] font-semibold outline-none"
                >
                  <option value="open">Aberto</option>
                  <option value="waiting_staff">Aguardando suporte</option>
                  <option value="waiting_user">Aguardando cliente</option>
                  <option value="resolved">Resolvido</option>
                  <option value="closed">Encerrado</option>
                </select>
              </header>

              <div className="flex-1 overflow-y-auto px-4 py-5">
                <div className="mb-7">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5865F2] text-xl font-black">#</div>
                  <h3 className="mt-4 text-xl font-black">#ticket-{shortId(selectedTicket.id)}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{selectedTicket.subject}</p>
                </div>

                {loadingMessages && messages.length === 0 ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
                ) : messages.length === 0 ? (
                  <p className="py-12 text-center text-sm text-zinc-500">Conversa vazia.</p>
                ) : (
                  <div className="space-y-1">
                    {messages.map((message) => {
                      const staff = message.sender_role === "staff";
                      return (
                        <div key={message.id} className="flex gap-3 rounded-md px-2 py-2 hover:bg-black/10">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black ${staff ? "bg-emerald-500" : "bg-[#5865F2]"}`}>
                            {staff ? "CP" : <UserRound className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className={`text-sm font-bold ${staff ? "text-emerald-300" : "text-white"}`}>
                                {staff ? "Suporte CRAZZY" : selectedTicket.username || "Cliente"}
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                {new Date(message.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-200">{message.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-black/20 p-3">
                {selectedTicket.status === "closed" ? (
                  <div className="flex items-center justify-center gap-2 rounded-lg bg-black/20 px-4 py-3 text-xs font-semibold text-zinc-400">
                    <XCircle className="h-4 w-4" /> Ticket encerrado
                  </div>
                ) : (
                  <div className="flex items-end gap-2 rounded-lg bg-[#383a40] p-2">
                    <textarea
                      value={newMessage}
                      onChange={(event) => setNewMessage(event.target.value.slice(0, 4000))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          sendMessage();
                        }
                      }}
                      rows={1}
                      placeholder="Responder como Suporte CRAZZY..."
                      className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5865F2] text-white disabled:opacity-30"
                      aria-label="Enviar resposta"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-600">
                  <span>Enter envia · Shift + Enter quebra linha</span>
                  {selectedTicket.status === "resolved" ? (
                    <span className="flex items-center gap-1 text-violet-300"><CheckCircle2 className="h-3 w-3" /> Resolvido</span>
                  ) : (
                    <span className="flex items-center gap-1"><Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" /> Realtime + fallback</span>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

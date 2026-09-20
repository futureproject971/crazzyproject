import { useCallback, useEffect, useRef, useState } from "react";
import {
  Circle,
  Hash,
  Headphones,
  Loader2,
  LockKeyhole,
  MessageCircle,
  Plus,
  Send,
  X,
} from "lucide-react";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: "user" | "staff";
  message: string;
  created_at: string;
}

const categories = [
  { value: "general", label: "Dúvida geral" },
  { value: "pre_sale", label: "Antes de comprar" },
  { value: "payment", label: "Pagamento" },
  { value: "product", label: "Produto" },
  { value: "technical", label: "Suporte técnico" },
  { value: "order", label: "Pedido" },
] as const;

const statusMeta: Record<TicketStatus, { label: string; dot: string }> = {
  open: { label: "Aberto", dot: "bg-blue-400" },
  waiting_staff: { label: "Aguardando suporte", dot: "bg-amber-400" },
  waiting_user: { label: "Aguardando você", dot: "bg-emerald-400" },
  resolved: { label: "Resolvido", dot: "bg-violet-400" },
  closed: { label: "Encerrado", dot: "bg-zinc-500" },
};

const shortId = (id: string) => id.replace(/-/g, "").slice(0, 6).toLowerCase();

export default function SupportHub() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [resumeAfterAuth, setResumeAfterAuth] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [creating, setCreating] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [firstMessage, setFirstMessage] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.username || user?.user_metadata?.username || user?.user_metadata?.full_name || "Você";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setLoadingTickets(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Não foi possível carregar seus tickets.");
    } else {
      const rows = (data || []) as SupportTicket[];
      setTickets(rows);
      setSelectedTicket((current) => current ? rows.find((t) => t.id === current.id) || null : current);
    }
    setLoadingTickets(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const pendingOAuthReturn =
      window.sessionStorage.getItem("crazzy:open-support-after-auth") === "1";

    if (resumeAfterAuth || pendingOAuthReturn) {
      window.sessionStorage.removeItem("crazzy:open-support-after-auth");
      setAuthOpen(false);
      setOpen(true);
      setCreating(true);
      setSelectedTicket(null);
      setResumeAfterAuth(false);
    }
  }, [resumeAfterAuth, user]);

  useEffect(() => {
    if (open && user) fetchTickets();
  }, [open, user, fetchTickets]);

  useEffect(() => {
    if (!selectedTicket || !user) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", selectedTicket.id)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        if (error) toast.error("Não foi possível carregar a conversa.");
        else setMessages((data || []) as SupportMessage[]);
        setLoadingMessages(false);
      }
    };

    load();

    const channel = supabase
      .channel(`support-user-${selectedTicket.id}-${Date.now()}`)
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
          setMessages((prev) => prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]);
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
          setSelectedTicket(incoming);
          setTickets((prev) => prev.map((ticket) => ticket.id === incoming.id ? incoming : ticket));
        },
      )
      .subscribe();

    const poll = window.setInterval(load, 7000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [selectedTicket?.id, user, fetchTickets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openSupport = () => {
    if (!user) {
      window.sessionStorage.setItem("crazzy:open-support-after-auth", "1");
      setResumeAfterAuth(true);
      setAuthOpen(true);
      return;
    }
    setOpen(true);
  };

  const createTicket = async () => {
    if (!user || creatingTicket) return;
    const cleanSubject = subject.trim();
    const cleanMessage = firstMessage.trim();

    if (cleanSubject.length < 3) {
      toast.error("Escreva um assunto com pelo menos 3 caracteres.");
      return;
    }
    if (!cleanMessage) {
      toast.error("Conte rapidamente como podemos ajudar.");
      return;
    }

    setCreatingTicket(true);
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject: cleanSubject,
        category,
      })
      .select("*")
      .single();

    if (error || !ticket) {
      toast.error(error?.message || "Não foi possível abrir o ticket.");
      setCreatingTicket(false);
      return;
    }

    const { error: messageError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_role: "user",
        message: cleanMessage,
      });

    if (messageError) {
      toast.error("Ticket criado, mas a primeira mensagem não foi enviada.");
    } else {
      toast.success("Ticket aberto. O suporte já pode responder.");
    }

    setSubject("");
    setCategory("general");
    setFirstMessage("");
    setCreating(false);
    setSelectedTicket(ticket as SupportTicket);
    await fetchTickets();
    setCreatingTicket(false);
  };

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
        sender_role: "user",
        message: text,
      })
      .select("*")
      .single();

    if (error) {
      toast.error(error.message);
    } else if (data) {
      setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data as SupportMessage]);
      setNewMessage("");
      await fetchTickets();
    }
    setSending(false);
  };

  const selectedStatus = selectedTicket ? statusMeta[selectedTicket.status] : null;
  const mobileShowSidebar = !creating && !selectedTicket;
  const openCount = tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status)).length;

  return (
    <>
      <AuthModal open={authOpen} onOpenChange={(value) => {
        setAuthOpen(value);
        if (!value && !user) {
          window.sessionStorage.removeItem("crazzy:open-support-after-auth");
          setResumeAfterAuth(false);
        }
      }} defaultTab="login" />

      <button
        type="button"
        onClick={openSupport}
        className="fixed bottom-5 right-5 z-[80] flex h-14 items-center gap-2 rounded-full border border-blue-400/30 bg-[#5865F2] px-4 text-sm font-bold text-white shadow-[0_12px_40px_rgba(50,70,180,.45)] transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/30"
        aria-label="Abrir central de suporte"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">Suporte</span>
        {user && openCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-[#5865F2]">
            {openCount > 9 ? "9+" : openCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90] bg-black/55 p-0 backdrop-blur-sm sm:p-5" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section
            role="dialog"
            aria-modal="true"
            className="ml-auto flex h-full w-full overflow-hidden border border-white/10 bg-[#111318] text-zinc-100 shadow-2xl sm:h-[min(720px,calc(100vh-40px))] sm:max-w-[940px] sm:rounded-2xl"
            aria-label="Central de suporte CRAZZY PROJECT"
          >
            <aside className={`${mobileShowSidebar ? "flex" : "hidden"} w-full shrink-0 flex-col border-r border-white/10 bg-[#17191f] sm:flex sm:w-[245px]`}>
              <div className="border-b border-white/10 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.2em] text-blue-300">CRAZZY PROJECT</p>
                    <h2 className="mt-1 text-sm font-black">Central de Suporte</h2>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white sm:hidden" aria-label="Fechar suporte">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400">
                  <Circle className="h-2.5 w-2.5 fill-emerald-400 text-emerald-400" />
                  Atendimento online
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-3">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Canais</p>
                <button
                  type="button"
                  onClick={() => { setCreating(true); setSelectedTicket(null); }}
                  className={`mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-semibold transition ${creating ? "bg-[#404249] text-white" : "text-zinc-300 hover:bg-white/5 hover:text-white"}`}
                >
                  <Plus className="h-4 w-4" />
                  abrir-ticket
                </button>

                <p className="mt-5 px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Meus tickets
                </p>

                {loadingTickets ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-zinc-500" /></div>
                ) : tickets.length === 0 ? (
                  <p className="px-2 py-4 text-xs leading-relaxed text-zinc-500">Nenhum ticket ainda. Abra um canal de suporte quando precisar.</p>
                ) : (
                  <div className="mt-1 space-y-0.5">
                    {tickets.map((ticket) => {
                      const meta = statusMeta[ticket.status];
                      return (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => { setCreating(false); setSelectedTicket(ticket); }}
                          className={`group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition ${selectedTicket?.id === ticket.id && !creating ? "bg-[#404249] text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"}`}
                        >
                          <Hash className="h-4 w-4 shrink-0 text-zinc-500" />
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold">ticket-{shortId(ticket.id)}</span>
                          <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} title={meta.label} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 border-t border-white/10 bg-[#202225] px-3 py-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5865F2] text-xs font-black">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{displayName}</p>
                  <p className="truncate text-[10px] text-zinc-500">Logado no suporte</p>
                </div>
              </div>
            </aside>

            <main className={`${mobileShowSidebar ? "hidden" : "flex"} min-w-0 flex-1 flex-col bg-[#313338] sm:flex`}>
              <div className="flex h-14 items-center gap-3 border-b border-black/20 px-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => { setSelectedTicket(null); setCreating(false); }}
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white sm:hidden"
                  aria-label="Voltar aos tickets"
                >
                  <Hash className="h-4 w-4" />
                </button>

                {creating || !selectedTicket ? (
                  <>
                    <Plus className="h-5 w-5 text-zinc-400" />
                    <div>
                      <h3 className="text-sm font-bold">abrir-ticket</h3>
                      <p className="text-[11px] text-zinc-400">Fale diretamente com a equipe CRAZZY PROJECT</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Hash className="h-5 w-5 text-zinc-400" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold">ticket-{shortId(selectedTicket.id)}</h3>
                      <p className="truncate text-[11px] text-zinc-400">{selectedTicket.subject}</p>
                    </div>
                    {selectedStatus ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-bold text-zinc-300">
                        <span className={`h-2 w-2 rounded-full ${selectedStatus.dot}`} />
                        {selectedStatus.label}
                      </span>
                    ) : null}
                  </>
                )}

                <button type="button" onClick={() => setOpen(false)} className="ml-auto hidden rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white sm:block" aria-label="Fechar suporte">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {creating || !selectedTicket ? (
                <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                  <div className="mx-auto max-w-xl">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5865F2] shadow-lg">
                      <Headphones className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="mt-5 text-2xl font-black">Como podemos ajudar?</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      Abra um ticket privado. Só você e a equipe de suporte conseguem ver a conversa.
                    </p>

                    <div className="mt-7">
                      <label className="text-xs font-bold uppercase tracking-wide text-zinc-400">Categoria</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {categories.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setCategory(item.value)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${category === item.value ? "border-[#5865F2] bg-[#5865F2]/20 text-white" : "border-white/10 bg-white/[.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"}`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-zinc-400">Assunto</label>
                    <input
                      value={subject}
                      onChange={(event) => setSubject(event.target.value.slice(0, 120))}
                      placeholder="Ex: dúvida antes de comprar"
                      className="mt-2 h-11 w-full rounded-lg border border-black/30 bg-[#1e1f22] px-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-[#5865F2]"
                    />

                    <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-zinc-400">Mensagem</label>
                    <textarea
                      value={firstMessage}
                      onChange={(event) => setFirstMessage(event.target.value.slice(0, 4000))}
                      placeholder="Explique o que você precisa..."
                      rows={5}
                      className="mt-2 w-full resize-none rounded-lg border border-black/30 bg-[#1e1f22] p-3 text-sm leading-relaxed outline-none transition placeholder:text-zinc-600 focus:border-[#5865F2]"
                    />

                    <button
                      type="button"
                      onClick={createTicket}
                      disabled={creatingTicket}
                      className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#5865F2] text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                    >
                      {creatingTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Abrir ticket privado
                    </button>

                    <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
                      <LockKeyhole className="h-3.5 w-3.5" />
                      A conversa não é pública e não aparece no Google.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                    <div className="mb-8">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5865F2] text-2xl font-black text-white">
                        #
                      </div>
                      <h3 className="mt-4 text-xl font-black">Início de #ticket-{shortId(selectedTicket.id)}</h3>
                      <p className="mt-1 text-sm text-zinc-400">{selectedTicket.subject}</p>
                    </div>

                    {loadingMessages && messages.length === 0 ? (
                      <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
                    ) : messages.length === 0 ? (
                      <p className="py-10 text-center text-sm text-zinc-500">Ainda não há mensagens.</p>
                    ) : (
                      <div className="space-y-1">
                        {messages.map((message) => {
                          const staff = message.sender_role === "staff";
                          return (
                            <div key={message.id} className="group flex gap-3 rounded-md px-2 py-2 hover:bg-black/10">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black ${staff ? "bg-emerald-500 text-white" : "bg-[#5865F2] text-white"}`}>
                                {staff ? "CP" : displayName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-2">
                                  <span className={`text-sm font-bold ${staff ? "text-emerald-300" : "text-white"}`}>
                                    {staff ? "Suporte CRAZZY" : displayName}
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

                  <div className="border-t border-black/20 p-3 sm:p-4">
                    {selectedTicket.status === "closed" ? (
                      <div className="rounded-lg bg-black/20 px-4 py-3 text-center text-xs font-semibold text-zinc-400">
                        Este ticket foi encerrado.
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
                          placeholder={`Mensagem em #ticket-${shortId(selectedTicket.id)}`}
                          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={sendMessage}
                          disabled={sending || !newMessage.trim()}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5865F2] text-white transition hover:brightness-110 disabled:opacity-30"
                          aria-label="Enviar mensagem"
                        >
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
                    <p className="mt-2 text-center text-[10px] text-zinc-600">Enter envia · Shift + Enter quebra linha</p>
                  </div>
                </>
              )}
            </main>
          </section>
        </div>
      ) : null}
    </>
  );
}

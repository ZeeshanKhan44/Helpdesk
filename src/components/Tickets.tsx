import { useEffect, useState, useRef } from 'react';
import {
  Send,
  Plus,
  Bot,
  User,
  Cog,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Search,
  ShieldAlert,
} from 'lucide-react';
import type { Ticket, TicketMessage } from '@/types';
import {
  fetchTickets,
  createTicket,
  fetchMessages,
  triageTicket,
  chatWithAgent,
  resolveTicket,
  escalateTicket,
} from '@/lib/agent';
import { PriorityBadge, StatusBadge, TierBadge, PhaseTracker } from './Badges';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function timeRemaining(deadline: string | null): { text: string; urgent: boolean; breached: boolean } {
  if (!deadline) return { text: 'No SLA set', urgent: false, breached: false };
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) return { text: 'SLA Breached', urgent: true, breached: true };
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return { text: `${hours}h ${mins}m remaining`, urgent: diff < 3600000, breached: false };
  return { text: `${mins}m remaining`, urgent: true, breached: false };
}

interface TicketsProps {
  selectedTicketId: string | null;
  onSelectTicket: (id: string | null) => void;
}

export function Tickets({ selectedTicketId, onSelectTicket }: TicketsProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await fetchTickets();
        if (active) {
          setTickets(data || []);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const filtered = tickets.filter((t) =>
    search ? t.title.toLowerCase().includes(search.toLowerCase()) || (t.category || '').includes(search.toLowerCase()) : true,
  );

  if (selectedTicketId) {
    return <TicketDetail ticketId={selectedTicketId} onBack={() => onSelectTicket(null)} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">Tickets</h2>
          <p className="text-sm text-neutral-500 mt-1">All helpdesk issues across L1 and L2 tiers</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search by title or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {showNew && (
        <NewTicketForm
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            onSelectTicket(id);
          }}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3">
            <Cog className="w-7 h-7 text-neutral-400" />
          </div>
          <p className="text-sm font-medium text-neutral-600">No tickets found</p>
          <p className="text-xs text-neutral-400 mt-1">Create a new ticket to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => {
            const sla = timeRemaining(ticket.sla_deadline);
            return (
              <button
                key={ticket.id}
                onClick={() => onSelectTicket(ticket.id)}
                className="w-full card p-4 hover:border-primary-300 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <TierBadge tier={ticket.tier} />
                      <PriorityBadge priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                      {ticket.category && (
                        <span className="badge bg-neutral-100 text-neutral-500 capitalize">{ticket.category}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-neutral-800 group-hover:text-primary-700 truncate">
                      {ticket.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{ticket.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-xs font-semibold ${
                        sla.breached ? 'text-error-600' : sla.urgent ? 'text-warning-600' : 'text-neutral-500'
                      }`}
                    >
                      {sla.text}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">{timeAgo(ticket.created_at)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── New Ticket Form ───────────────────────────────────────────────────

function NewTicketForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!title.trim()) {
      setError('Please enter a title for your issue');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const ticket = await createTicket(title.trim(), description.trim());
      await triageTicket(ticket.id, title.trim(), description.trim());
      onCreated(ticket.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create ticket');
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-neutral-800">Create New Ticket</h3>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors">
          <XCircle className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Issue Title</label>
          <input
            type="text"
            placeholder="e.g. Cannot connect to VPN from home"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Describe the Issue</label>
          <textarea
            placeholder="Provide as much detail as possible. The AI agent will use this to triage and assist you."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="input-field resize-none"
            disabled={submitting}
          />
        </div>
        {error && (
          <p className="text-sm text-error-600 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> {error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating & triaging...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Submit Ticket
              </>
            )}
          </button>
          <button onClick={onClose} disabled={submitting} className="btn-secondary">
            Cancel
          </button>
        </div>
        <p className="text-xs text-neutral-400">
          The AI agent will automatically triage your ticket, assign priority, tier, and SLA, then start assisting you.
        </p>
      </div>
    </div>
  );
}

// ─── Ticket Detail with Chat ───────────────────────────────────────────

function TicketDetail({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const t = await fetchTickets();
        const found = t?.find((tk) => tk.id === ticketId) || null;
        const m = await fetchMessages(ticketId);
        if (active) {
          setTicket(found);
          setMessages(m || []);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [ticketId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !ticket || sending) return;
    const userMsg = input.trim();
    setInput('');
    setSending(true);
    try {
      await chatWithAgent(ticket.id, userMsg);
      const m = await fetchMessages(ticket.id);
      setMessages(m || []);
      const t = await fetchTickets();
      const found = t?.find((tk) => tk.id === ticket.id) || null;
      setTicket(found);
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  async function handleResolve() {
    if (!ticket) return;
    setSending(true);
    try {
      await resolveTicket(ticket.id, 'Resolved via agent interaction');
      const t = await fetchTickets();
      const found = t?.find((tk) => tk.id === ticket.id) || null;
      setTicket(found);
      const m = await fetchMessages(ticket.id);
      setMessages(m || []);
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  async function handleEscalate() {
    if (!ticket) return;
    setSending(true);
    try {
      await escalateTicket(ticket.id, 'User requested escalation');
      const t = await fetchTickets();
      const found = t?.find((tk) => tk.id === ticket.id) || null;
      setTicket(found);
      const m = await fetchMessages(ticket.id);
      setMessages(m || []);
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-neutral-500">Ticket not found</p>
        <button onClick={onBack} className="btn-secondary mt-4">
          Back to tickets
        </button>
      </div>
    );
  }

  const sla = timeRemaining(ticket.sla_deadline);
  const canChat = ticket.status !== 'resolved' && ticket.status !== 'closed';

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={onBack}
          className="text-sm text-neutral-500 hover:text-neutral-700 font-medium flex items-center gap-1.5 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to tickets
        </button>
        <div className="card p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-neutral-800">{ticket.title}</h2>
              {ticket.description && (
                <p className="text-sm text-neutral-500 mt-1.5">{ticket.description}</p>
              )}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <TierBadge tier={ticket.tier} />
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} />
                {ticket.category && (
                  <span className="badge bg-neutral-100 text-neutral-500 capitalize">{ticket.category}</span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p
                className={`text-sm font-semibold ${
                  sla.breached ? 'text-error-600' : sla.urgent ? 'text-warning-600' : 'text-neutral-600'
                }`}
              >
                {sla.text}
              </p>
              <p className="text-xs text-neutral-400 mt-1">{timeAgo(ticket.created_at)}</p>
            </div>
          </div>

          {/* Phase tracker */}
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <p className="text-xs font-semibold text-neutral-500 mb-2">Maintenance Phase</p>
            <PhaseTracker currentPhase={ticket.phase} />
          </div>

          {/* Resolution banner */}
          {ticket.resolution && (
            <div className="mt-4 p-3 rounded-xl bg-success-50 border border-success-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-success-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-success-700">Resolved</p>
                <p className="text-xs text-success-600 mt-0.5">{ticket.resolution}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="card flex flex-col" style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}>
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-semibold text-neutral-700">Agent Conversation</span>
          <span className="ml-auto text-xs text-neutral-400">The agent answers basic questions directly and proposes technical changes for your approval</span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-400">Start a conversation with the agent</p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-neutral-400">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        {canChat ? (
          <div className="px-4 py-3 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Describe your issue or ask a question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={sending}
                className="input-field flex-1"
              />
              <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-primary shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={handleResolve}
                disabled={sending}
                className="text-xs font-medium text-success-600 hover:text-success-700 flex items-center gap-1 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
              </button>
              <span className="text-neutral-300">|</span>
              <button
                onClick={handleEscalate}
                disabled={sending}
                className="text-xs font-medium text-warning-600 hover:text-warning-700 flex items-center gap-1 transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Escalate to Human
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-neutral-100 text-center">
            <p className="text-sm text-neutral-400">This ticket is {ticket.status}. Start a new ticket if you need further assistance.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Message Bubble ────────────────────────────────────────────────────

function MessageBubble({ message }: { message: TicketMessage }) {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isActionProposed = message.message_type === 'action_proposed';
  const isResolution = message.message_type === 'resolution';
  const isEscalation = message.message_type === 'escalation';

  if (isSystem) {
    return (
      <div className="flex justify-center animate-slide-up">
        <div
          className={`max-w-[80%] px-4 py-2.5 rounded-xl text-xs flex items-start gap-2 ${
            isActionProposed
              ? 'bg-warning-50 text-warning-700 border border-warning-200'
              : message.message_type === 'action_approved'
              ? 'bg-success-50 text-success-700 border border-success-200'
              : message.message_type === 'action_rejected'
              ? 'bg-error-50 text-error-700 border border-error-200'
              : 'bg-neutral-100 text-neutral-600'
          }`}
        >
          <Cog className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="whitespace-pre-wrap">{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2.5 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? 'bg-neutral-200' : isResolution ? 'bg-success-100' : isEscalation ? 'bg-warning-100' : 'bg-primary-100'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-neutral-600" />
        ) : (
          <Bot className={`w-4 h-4 ${isResolution ? 'text-success-600' : isEscalation ? 'text-warning-600' : 'text-primary-600'}`} />
        )}
      </div>
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
            isUser
              ? 'bg-primary-600 text-white rounded-tr-md'
              : isActionProposed
              ? 'bg-warning-50 text-neutral-700 border border-warning-200 rounded-tl-md'
              : isResolution
              ? 'bg-success-50 text-neutral-700 border border-success-200 rounded-tl-md'
              : isEscalation
              ? 'bg-warning-50 text-neutral-700 border border-warning-200 rounded-tl-md'
              : 'bg-neutral-100 text-neutral-700 rounded-tl-md'
          }`}
        >
          {isActionProposed && (
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-warning-700">
              <ShieldAlert className="w-4 h-4" /> Human Approval Required
            </div>
          )}
          {message.content}
        </div>
        <span className="text-[11px] text-neutral-400 mt-1 px-1">
          {timeAgo(message.created_at)}
        </span>
      </div>
    </div>
  );
}

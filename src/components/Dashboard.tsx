import { useEffect, useState } from 'react';
import {
  Ticket as TicketIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Bot,
  ArrowRight,
} from 'lucide-react';
import type { Ticket } from '@/types';
import { fetchTickets } from '@/lib/agent';
import { PriorityBadge, StatusBadge, TierBadge } from './Badges';

interface DashboardProps {
  onNavigate: (view: 'tickets' | 'approvals') => void;
  onOpenTicket: (id: string) => void;
}

function timeRemaining(deadline: string | null): { text: string; urgent: boolean; breached: boolean } {
  if (!deadline) return { text: 'No SLA', urgent: false, breached: false };
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) return { text: 'Breached', urgent: true, breached: true };
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return { text: `${hours}h ${mins}m left`, urgent: diff < 3600000, breached: false };
  return { text: `${mins}m left`, urgent: true, breached: false };
}

export function Dashboard({ onNavigate, onOpenTicket }: DashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await fetchTickets();
        if (active) setTickets(data || []);
      } catch {
        /* ignore */
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const open = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed');
  const resolved = tickets.filter((t) => t.status === 'resolved');
  const breaches = tickets.filter((t) => t.sla_breach);
  const awaiting = tickets.filter((t) => t.status === 'awaiting_approval');
  const escalated = tickets.filter((t) => t.status === 'escalated');
  const l1 = open.filter((t) => t.tier === 'L1');
  const l2 = open.filter((t) => t.tier === 'L2');

  const stats = [
    { label: 'Open Tickets', value: open.length, icon: TicketIcon, color: 'primary', sub: `${l1.length} L1 / ${l2.length} L2` },
    { label: 'SLA Breaches', value: breaches.length, icon: AlertTriangle, color: 'error', sub: breaches.length === 0 ? 'All within SLA' : 'Needs attention' },
    { label: 'Awaiting Approval', value: awaiting.length, icon: Clock, color: 'warning', sub: awaiting.length === 0 ? 'No pending actions' : 'Human review needed' },
    { label: 'Resolved', value: resolved.length, icon: CheckCircle2, color: 'success', sub: `${tickets.length > 0 ? Math.round((resolved.length / tickets.length) * 100) : 0}% resolution rate` },
  ];

  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    error: 'bg-error-50 text-error-600',
    warning: 'bg-warning-50 text-warning-600',
    success: 'bg-success-50 text-success-600',
  };

  const recentTickets = open.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">Dashboard</h2>
          <p className="text-sm text-neutral-500 mt-1">Real-time overview of your helpdesk operations</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-5 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorMap[stat.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-neutral-800 mt-3">{stat.value}</p>
              <p className="text-sm font-medium text-neutral-600 mt-0.5">{stat.label}</p>
              <p className="text-xs text-neutral-400 mt-1">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Open Tickets */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-neutral-800">Active Tickets</h3>
            <button
              onClick={() => onNavigate('tickets')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-neutral-100 animate-pulse" />
              ))}
            </div>
          ) : recentTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-success-50 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-success-600" />
              </div>
              <p className="text-sm font-medium text-neutral-600">All tickets resolved</p>
              <p className="text-xs text-neutral-400 mt-1">Create a new ticket to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTickets.map((ticket) => {
                const sla = timeRemaining(ticket.sla_deadline);
                return (
                  <button
                    key={ticket.id}
                    onClick={() => onOpenTicket(ticket.id)}
                    className="w-full flex items-center gap-4 p-3.5 rounded-xl border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all text-left group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-800 truncate group-hover:text-primary-700">
                        {ticket.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <TierBadge tier={ticket.tier} />
                        <PriorityBadge priority={ticket.priority} />
                        <StatusBadge status={ticket.status} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-xs font-semibold ${
                          sla.breached ? 'text-error-600' : sla.urgent ? 'text-warning-600' : 'text-neutral-500'
                        }`}
                      >
                        {sla.text}
                      </p>
                      {ticket.category && (
                        <p className="text-xs text-neutral-400 mt-0.5 capitalize">{ticket.category}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Agent Status */}
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-800">AI Agent Status</h3>
                <p className="text-xs text-success-600 font-medium">Active & Monitoring</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Tickets triaged</span>
                <span className="text-sm font-semibold text-neutral-700">{tickets.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Auto-resolved (self-service)</span>
                <span className="text-sm font-semibold text-success-600">{resolved.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Escalated to human</span>
                <span className="text-sm font-semibold text-warning-600">{escalated.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Awaiting human approval</span>
                <span className="text-sm font-semibold text-warning-600">{awaiting.length}</span>
              </div>
            </div>
          </div>

          {awaiting.length > 0 && (
            <div className="card p-5 border-warning-200 bg-warning-50/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-neutral-800">Action Required</p>
                  <p className="text-xs text-neutral-600 mt-1">
                    {awaiting.length} technical action{awaiting.length > 1 ? 's' : ''} proposed by the agent need your approval.
                  </p>
                  <button
                    onClick={() => onNavigate('approvals')}
                    className="mt-3 text-xs font-semibold text-warning-700 hover:text-warning-800 flex items-center gap-1 transition-colors"
                  >
                    Review now <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-neutral-800">SLA Performance</h3>
            </div>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-500">Within SLA</span>
                  <span className="font-semibold text-success-600">
                    {tickets.length > 0 ? tickets.length - breaches.length : 0}/{tickets.length}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className="h-full bg-success-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${tickets.length > 0 ? ((tickets.length - breaches.length) / tickets.length) * 100 : 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-500">Breached</span>
                  <span className="font-semibold text-error-600">{breaches.length}</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className="h-full bg-error-500 rounded-full transition-all duration-500"
                    style={{ width: `${tickets.length > 0 ? (breaches.length / tickets.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  BookOpen,
  ClipboardList,
  ScrollText,
  Bot,
  AlertCircle,
} from 'lucide-react';
import { fetchPendingActions } from '@/lib/agent';

export type View = 'dashboard' | 'tickets' | 'knowledge' | 'runbooks' | 'approvals' | 'audit';

interface SidebarProps {
  view: View;
  onViewChange: (v: View) => void;
}

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tickets', label: 'Tickets', icon: TicketIcon },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
  { id: 'runbooks', label: 'Runbooks', icon: ClipboardList },
  { id: 'approvals', label: 'Approvals', icon: AlertCircle },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
];

export function Sidebar({ view, onViewChange }: SidebarProps) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const actions = await fetchPendingActions();
        if (active) setPendingCount(actions.length);
      } catch {
        /* ignore */
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="px-5 py-5 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-neutral-800 truncate">HelpDesk Agent</h1>
            <p className="text-xs text-neutral-500">L1 & L2 Automation</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-primary-600' : 'text-neutral-400'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'approvals' && pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-error-500 text-white text-xs font-semibold min-w-[20px] text-center">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-neutral-200">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-neutral-50">
          <div className="w-8 h-8 rounded-full bg-success-500 flex items-center justify-center shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse-soft" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-neutral-700">Agent Online</p>
            <p className="text-[11px] text-neutral-500">Monitoring SLA timers</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

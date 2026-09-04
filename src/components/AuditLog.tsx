import { useEffect, useState } from 'react';
import { ScrollText, Info, AlertTriangle, ShieldAlert, Bot, User } from 'lucide-react';
import type { AuditLogEntry } from '@/types';
import { fetchAuditLog } from '@/lib/agent';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const severityConfig = {
  info: { icon: Info, class: 'bg-primary-50 text-primary-600', label: 'Info' },
  warning: { icon: AlertTriangle, class: 'bg-warning-50 text-warning-600', label: 'Warning' },
  critical: { icon: ShieldAlert, class: 'bg-error-50 text-error-600', label: 'Critical' },
};

export function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'info' | 'warning' | 'critical'>('all');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await fetchAuditLog();
        if (active) {
          setEntries(data || []);
          setLoading(false);
        }
      } catch {
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

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.severity === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-neutral-800">Audit Log</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Complete record of all agent actions, decisions, and technical changes
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'info', 'warning', 'critical'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
              filter === f ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {f === 'all' ? 'All Events' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3">
            <ScrollText className="w-7 h-7 text-neutral-400" />
          </div>
          <p className="text-sm font-medium text-neutral-600">No audit entries</p>
          <p className="text-xs text-neutral-400 mt-1">Agent actions and decisions will appear here</p>
        </div>
      ) : (
        <div className="card divide-y divide-neutral-100">
          {filtered.map((entry) => {
            const sev = severityConfig[entry.severity];
            const SevIcon = sev.icon;
            const isAgent = entry.actor === 'AI Agent';
            return (
              <div key={entry.id} className="flex items-start gap-3.5 p-4 hover:bg-neutral-50/50 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sev.class}`}>
                  <SevIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-neutral-700">{entry.description}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                    <span className="flex items-center gap-1">
                      {isAgent ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {entry.actor}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${sev.class.split(' ')[1].replace('text', 'bg')}`} />
                      {sev.label}
                    </span>
                    <span>{timeAgo(entry.created_at)}</span>
                    {entry.event_type && (
                      <span className="badge bg-neutral-100 text-neutral-500 text-[10px]">{entry.event_type}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

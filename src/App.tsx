import { useState } from 'react';
import { Sidebar, type View } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { Tickets } from '@/components/Tickets';
import { KnowledgeBase } from '@/components/KnowledgeBase';
import { Runbooks } from '@/components/Runbooks';
import { Approvals } from '@/components/Approvals';
import { AuditLog } from '@/components/AuditLog';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  function handleNavigate(v: View) {
    setView(v);
    setSelectedTicketId(null);
  }

  function handleOpenTicket(id: string) {
    setSelectedTicketId(id);
    setView('tickets');
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar view={view} onViewChange={handleNavigate} />
      <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          {view === 'dashboard' && <Dashboard onNavigate={handleNavigate} onOpenTicket={handleOpenTicket} />}
          {view === 'tickets' && (
            <Tickets selectedTicketId={selectedTicketId} onSelectTicket={setSelectedTicketId} />
          )}
          {view === 'knowledge' && <KnowledgeBase />}
          {view === 'runbooks' && <Runbooks />}
          {view === 'approvals' && <Approvals />}
          {view === 'audit' && <AuditLog />}
        </div>
      </main>
    </div>
  );
}

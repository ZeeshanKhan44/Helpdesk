import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Bot,
  Loader2,
  Clock,
  Server,
} from 'lucide-react';
import type { AgentAction } from '@/types';
import { fetchAgentActions, approveAction, rejectAction } from '@/lib/agent';
import { RiskBadge, ApprovalBadge } from './Badges';

export function Approvals() {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await fetchAgentActions();
        if (active) {
          setActions(data || []);
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

  async function handleApprove(action: AgentAction) {
    setProcessingId(action.id);
    try {
      await approveAction(action.id, notes || undefined);
      const data = await fetchAgentActions();
      setActions(data || []);
    } catch {
      /* ignore */
    } finally {
      setProcessingId(null);
      setShowNotes(null);
      setNotes('');
    }
  }

  async function handleReject(action: AgentAction) {
    setProcessingId(action.id);
    try {
      await rejectAction(action.id, notes || undefined);
      const data = await fetchAgentActions();
      setActions(data || []);
    } catch {
      /* ignore */
    } finally {
      setProcessingId(null);
      setShowNotes(null);
      setNotes('');
    }
  }

  const pending = actions.filter((a) => a.approval_status === 'pending');
  const decided = actions.filter((a) => a.approval_status !== 'pending');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-neutral-800">Approvals</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Technical actions proposed by the AI agent that require human review before execution
        </p>
      </div>

      {pending.length > 0 && (
        <div className="card p-4 bg-warning-50/50 border-warning-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-neutral-800">
                {pending.length} action{pending.length > 1 ? 's' : ''} awaiting your approval
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                The agent has proposed technical changes. Review each one carefully — approved actions are executed
                automatically and logged in the audit trail.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending actions */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : pending.length === 0 && decided.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-success-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 text-success-600" />
          </div>
          <p className="text-sm font-medium text-neutral-600">No actions to review</p>
          <p className="text-xs text-neutral-400 mt-1">
            When the agent proposes technical changes, they will appear here for your approval
          </p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning-600" /> Pending Review ({pending.length})
              </h3>
              {pending.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  onApprove={() => setShowNotes(action.id)}
                  onReject={() => setShowNotes(action.id)}
                  processing={processingId === action.id}
                  showNotes={showNotes === action.id}
                  notes={notes}
                  onNotesChange={setNotes}
                  onConfirmApprove={() => handleApprove(action)}
                  onConfirmReject={() => handleReject(action)}
                  onCancelNotes={() => {
                    setShowNotes(null);
                    setNotes('');
                  }}
                />
              ))}
            </div>
          )}

          {decided.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-400" /> History ({decided.length})
              </h3>
              {decided.map((action) => (
                <div key={action.id} className="card p-4 opacity-90">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <ApprovalBadge status={action.approval_status} />
                        <RiskBadge risk={action.risk_level} />
                        {action.affected_system && (
                          <span className="badge bg-neutral-100 text-neutral-500 flex items-center gap-1">
                            <Server className="w-3 h-3" /> {action.affected_system}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-neutral-700">{action.title}</h4>
                      <p className="text-xs text-neutral-500 mt-1">{action.description}</p>
                      {action.approver_notes && (
                        <p className="text-xs text-neutral-400 mt-2 italic">
                          Reviewer: "{action.approver_notes}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ActionCard({
  action,
  onApprove,
  onReject,
  processing,
  showNotes,
  notes,
  onNotesChange,
  onConfirmApprove,
  onConfirmReject,
  onCancelNotes,
}: {
  action: AgentAction;
  onApprove: () => void;
  onReject: () => void;
  processing: boolean;
  showNotes: boolean;
  notes: string;
  onNotesChange: (v: string) => void;
  onConfirmApprove: () => void;
  onConfirmReject: () => void;
  onCancelNotes: () => void;
}) {
  return (
    <div className="card p-5 border-warning-200 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-warning-100 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-warning-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <ApprovalBadge status={action.approval_status} />
            <RiskBadge risk={action.risk_level} />
            {action.affected_system && (
              <span className="badge bg-neutral-100 text-neutral-500 flex items-center gap-1">
                <Server className="w-3 h-3" /> {action.affected_system}
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-neutral-800">{action.title}</h4>
          <p className="text-sm text-neutral-600 mt-1">{action.description}</p>

          {action.agent_reasoning && (
            <div className="mt-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <p className="text-xs font-semibold text-neutral-500 mb-1">Agent Reasoning</p>
              <p className="text-xs text-neutral-600">{action.agent_reasoning}</p>
            </div>
          )}

          {action.proposed_changes && Object.keys(action.proposed_changes).length > 0 && (
            <div className="mt-2 p-3 rounded-xl bg-primary-50/50 border border-primary-100">
              <p className="text-xs font-semibold text-primary-600 mb-1">Proposed Changes</p>
              <pre className="text-xs text-neutral-600 font-mono whitespace-pre-wrap">
                {JSON.stringify(action.proposed_changes, null, 2)}
              </pre>
            </div>
          )}

          {showNotes ? (
            <div className="mt-4 space-y-3 animate-slide-up">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                  Reviewer Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Add context for your decision..."
                  rows={2}
                  className="input-field resize-none text-sm"
                  disabled={processing}
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onConfirmApprove} disabled={processing} className="btn-success">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirm Approve
                </button>
                <button onClick={onConfirmReject} disabled={processing} className="btn-danger">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Confirm Reject
                </button>
                <button onClick={onCancelNotes} disabled={processing} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-4">
              <button onClick={onApprove} disabled={processing} className="btn-success">
                <CheckCircle2 className="w-4 h-4" /> Approve & Execute
              </button>
              <button onClick={onReject} disabled={processing} className="btn-danger">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import type { Priority, TicketStatus, Tier, RiskLevel, Phase, ApprovalStatus } from '@/types';

const priorityConfig: Record<Priority, { label: string; class: string; dot: string }> = {
  low: { label: 'Low', class: 'bg-neutral-100 text-neutral-600', dot: 'bg-neutral-400' },
  medium: { label: 'Medium', class: 'bg-warning-100 text-warning-700', dot: 'bg-warning-500' },
  high: { label: 'High', class: 'bg-error-100 text-error-700', dot: 'bg-error-500' },
  critical: { label: 'Critical', class: 'bg-error-500 text-white', dot: 'bg-error-700' },
};

const statusConfig: Record<TicketStatus, { label: string; class: string }> = {
  open: { label: 'Open', class: 'bg-primary-100 text-primary-700' },
  in_progress: { label: 'In Progress', class: 'bg-warning-100 text-warning-700' },
  awaiting_approval: { label: 'Awaiting Approval', class: 'bg-warning-500 text-white' },
  resolved: { label: 'Resolved', class: 'bg-success-100 text-success-700' },
  escalated: { label: 'Escalated', class: 'bg-error-100 text-error-700' },
  closed: { label: 'Closed', class: 'bg-neutral-100 text-neutral-500' },
};

const tierConfig: Record<Tier, { label: string; class: string }> = {
  L1: { label: 'L1', class: 'bg-primary-100 text-primary-700' },
  L2: { label: 'L2', class: 'bg-warning-100 text-warning-700' },
  L3: { label: 'L3', class: 'bg-error-100 text-error-700' },
};

const riskConfig: Record<RiskLevel, { label: string; class: string }> = {
  low: { label: 'Low Risk', class: 'bg-success-100 text-success-700' },
  medium: { label: 'Medium Risk', class: 'bg-warning-100 text-warning-700' },
  high: { label: 'High Risk', class: 'bg-error-100 text-error-700' },
  critical: { label: 'Critical Risk', class: 'bg-error-500 text-white' },
};

const approvalConfig: Record<ApprovalStatus, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-warning-100 text-warning-700' },
  approved: { label: 'Approved', class: 'bg-success-100 text-success-700' },
  rejected: { label: 'Rejected', class: 'bg-error-100 text-error-700' },
  executed: { label: 'Executed', class: 'bg-success-500 text-white' },
  cancelled: { label: 'Cancelled', class: 'bg-neutral-100 text-neutral-500' },
};

const phaseLabels: Record<Phase, string> = {
  intake: 'Intake',
  triage: 'Triage',
  diagnosis: 'Diagnosis',
  resolution: 'Resolution',
  verification: 'Verification',
  closure: 'Closure',
};

const phaseOrder: Phase[] = ['intake', 'triage', 'diagnosis', 'resolution', 'verification', 'closure'];

export function PriorityBadge({ priority }: { priority: Priority }) {
  const c = priorityConfig[priority];
  return (
    <span className={`badge ${c.class}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const c = statusConfig[status];
  return <span className={`badge ${c.class}`}>{c.label}</span>;
}

export function TierBadge({ tier }: { tier: Tier }) {
  const c = tierConfig[tier];
  return <span className={`badge ${c.class}`}>{c.label}</span>;
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const c = riskConfig[risk];
  return <span className={`badge ${c.class}`}>{c.label}</span>;
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const c = approvalConfig[status];
  return <span className={`badge ${c.class}`}>{c.label}</span>;
}

export function PhaseTracker({ currentPhase }: { currentPhase: Phase }) {
  const currentIndex = phaseOrder.indexOf(currentPhase);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {phaseOrder.map((phase, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <div key={phase} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : isDone
                  ? 'bg-success-100 text-success-700'
                  : 'bg-neutral-100 text-neutral-400'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isActive ? 'bg-white/20' : isDone ? 'bg-success-500 text-white' : 'bg-neutral-300'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </span>
              {phaseLabels[phase]}
            </div>
            {i < phaseOrder.length - 1 && (
              <div className={`w-4 h-0.5 mx-0.5 ${isDone ? 'bg-success-300' : 'bg-neutral-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export { phaseLabels, phaseOrder };

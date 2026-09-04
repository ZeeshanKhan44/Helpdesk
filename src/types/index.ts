export type Tier = 'L1' | 'L2' | 'L3';
export type TicketStatus = 'open' | 'in_progress' | 'awaiting_approval' | 'resolved' | 'escalated' | 'closed';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Phase = 'intake' | 'triage' | 'diagnosis' | 'resolution' | 'verification' | 'closure';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'cancelled';
export type Sender = 'user' | 'agent' | 'system';
export type MessageType = 'text' | 'action_proposed' | 'action_approved' | 'action_rejected' | 'resolution' | 'escalation';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  tier: Tier;
  status: TicketStatus;
  priority: Priority;
  phase: Phase;
  category: string | null;
  assigned_agent: string;
  sla_deadline: string | null;
  sla_breach: boolean;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender: Sender;
  content: string;
  message_type: MessageType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  views: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface RunbookStep {
  step: number;
  title: string;
  detail: string;
}

export interface Runbook {
  id: string;
  title: string;
  tier: Tier;
  category: string;
  description: string;
  steps: RunbookStep[];
  estimated_time_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface AgentAction {
  id: string;
  ticket_id: string;
  action_type: string;
  title: string;
  description: string;
  risk_level: RiskLevel;
  affected_system: string | null;
  proposed_changes: Record<string, unknown>;
  approval_status: ApprovalStatus;
  approver_notes: string | null;
  agent_reasoning: string | null;
  created_at: string;
  decided_at: string | null;
  executed_at: string | null;
}

export interface AuditLogEntry {
  id: string;
  ticket_id: string | null;
  action_id: string | null;
  event_type: string;
  description: string;
  actor: string;
  severity: 'info' | 'warning' | 'critical';
  metadata: Record<string, unknown>;
  created_at: string;
}

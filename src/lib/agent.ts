import { supabase } from './supabase';

const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/helpdesk-agent`;

const headers = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function callAgent(action: string, payload: Record<string, unknown>) {
  const res = await fetch(functionUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Agent request failed (${res.status})`);
  }
  return res.json();
}

export async function triageTicket(ticket_id: string, title: string, description: string) {
  return callAgent('triage', { ticket_id, title, description });
}

export async function chatWithAgent(ticket_id: string, message: string) {
  return callAgent('chat', { ticket_id, message });
}

export async function approveAction(action_id: string, notes?: string) {
  return callAgent('approve_action', { action_id, notes });
}

export async function rejectAction(action_id: string, notes?: string) {
  return callAgent('reject_action', { action_id, notes });
}

export async function resolveTicket(ticket_id: string, resolution?: string) {
  return callAgent('resolve', { ticket_id, resolution });
}

export async function escalateTicket(ticket_id: string, reason?: string) {
  return callAgent('escalate', { ticket_id, reason });
}

// ─── Database queries ─────────────────────────────────────────────────

export async function fetchTickets() {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchTicket(id: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMessages(ticketId: string) {
  const { data, error } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createTicket(title: string, description: string) {
  const { data, error } = await supabase
    .from('tickets')
    .insert({ title, description, status: 'open', phase: 'intake' })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchKnowledgeArticles() {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .select('*')
    .order('views', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchRunbooks() {
  const { data, error } = await supabase
    .from('runbooks')
    .select('*')
    .order('tier', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchAgentActions() {
  const { data, error } = await supabase
    .from('agent_actions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchPendingActions() {
  const { data, error } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchAuditLog() {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

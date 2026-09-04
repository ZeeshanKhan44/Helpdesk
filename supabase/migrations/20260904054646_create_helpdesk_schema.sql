/*
# IT Helpdesk Agentic AI — Schema

## Purpose
Tracks IT helpdesk tickets across L1 and L2 support tiers, an agentic AI that triages and
resolves tickets, a knowledge base for self-service answers, runbooks for maintenance
procedures, and an audit log of all technical changes the agent proposes (with human
approval gates).

## Tables
1. `tickets` — each helpdesk issue, with tier (L1/L2), current phase, SLA deadlines,
   priority, status, and AI-generated triage info.
2. `ticket_messages` — chat-style conversation on each ticket (user messages and agent
   responses, including proposed actions awaiting approval).
3. `knowledge_articles` — self-service KB articles (how-tos, explanations).
4. `runbooks` — step-by-step maintenance procedures for L1/L2 phases.
5. `audit_log` — every technical action the agent proposes, with approval status and
   approver notes.
6. `agent_actions` — structured proposed actions (e.g. "restart service", "modify config")
   linked to a ticket, with approval state machine.

## Security
- Single-tenant app (no auth screen). RLS enabled on all tables with `TO anon, authenticated`
  policies so the anon-key frontend can read and write its own data.
*/

-- ===== TICKETS =====
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  tier text NOT NULL DEFAULT 'L1' CHECK (tier IN ('L1','L2','L3')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','awaiting_approval','resolved','escalated','closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  phase text NOT NULL DEFAULT 'intake' CHECK (phase IN ('intake','triage','diagnosis','resolution','verification','closure')),
  category text,
  assigned_agent text DEFAULT 'AI Agent',
  sla_deadline timestamptz,
  sla_breach boolean NOT NULL DEFAULT false,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_tickets" ON tickets;
CREATE POLICY "anon_select_tickets" ON tickets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tickets" ON tickets;
CREATE POLICY "anon_insert_tickets" ON tickets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tickets" ON tickets;
CREATE POLICY "anon_update_tickets" ON tickets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tickets" ON tickets;
CREATE POLICY "anon_delete_tickets" ON tickets FOR DELETE TO anon, authenticated USING (true);

-- ===== TICKET MESSAGES =====
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user','agent','system')),
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','action_proposed','action_approved','action_rejected','resolution','escalation')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_messages" ON ticket_messages;
CREATE POLICY "anon_select_messages" ON ticket_messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_messages" ON ticket_messages;
CREATE POLICY "anon_insert_messages" ON ticket_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_messages" ON ticket_messages;
CREATE POLICY "anon_update_messages" ON ticket_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_messages" ON ticket_messages;
CREATE POLICY "anon_delete_messages" ON ticket_messages FOR DELETE TO anon, authenticated USING (true);

-- ===== KNOWLEDGE ARTICLES =====
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  views integer NOT NULL DEFAULT 0,
  helpful_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_kb" ON knowledge_articles;
CREATE POLICY "anon_select_kb" ON knowledge_articles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_kb" ON knowledge_articles;
CREATE POLICY "anon_insert_kb" ON knowledge_articles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_kb" ON knowledge_articles;
CREATE POLICY "anon_update_kb" ON knowledge_articles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_kb" ON knowledge_articles;
CREATE POLICY "anon_delete_kb" ON knowledge_articles FOR DELETE TO anon, authenticated USING (true);

-- ===== RUNBOOKS =====
CREATE TABLE IF NOT EXISTS runbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  tier text NOT NULL DEFAULT 'L1' CHECK (tier IN ('L1','L2','L3')),
  category text NOT NULL DEFAULT 'general',
  description text NOT NULL DEFAULT '',
  steps jsonb NOT NULL DEFAULT '[]',
  estimated_time_minutes integer DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE runbooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_runbooks" ON runbooks;
CREATE POLICY "anon_select_runbooks" ON runbooks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_runbooks" ON runbooks;
CREATE POLICY "anon_insert_runbooks" ON runbooks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_runbooks" ON runbooks;
CREATE POLICY "anon_update_runbooks" ON runbooks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_runbooks" ON runbooks;
CREATE POLICY "anon_delete_runbooks" ON runbooks FOR DELETE TO anon, authenticated USING (true);

-- ===== AGENT ACTIONS (proposed technical changes needing approval) =====
CREATE TABLE IF NOT EXISTS agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
  affected_system text,
  proposed_changes jsonb DEFAULT '{}',
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected','executed','cancelled')),
  approver_notes text,
  agent_reasoning text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  executed_at timestamptz
);

ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_actions" ON agent_actions;
CREATE POLICY "anon_select_actions" ON agent_actions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_actions" ON agent_actions;
CREATE POLICY "anon_insert_actions" ON agent_actions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_actions" ON agent_actions;
CREATE POLICY "anon_update_actions" ON agent_actions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_actions" ON agent_actions;
CREATE POLICY "anon_delete_actions" ON agent_actions FOR DELETE TO anon, authenticated USING (true);

-- ===== AUDIT LOG =====
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  action_id uuid REFERENCES agent_actions(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  description text NOT NULL,
  actor text NOT NULL DEFAULT 'AI Agent',
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_audit" ON audit_log;
CREATE POLICY "anon_select_audit" ON audit_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_audit" ON audit_log;
CREATE POLICY "anon_insert_audit" ON audit_log FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_audit" ON audit_log;
CREATE POLICY "anon_update_audit" ON audit_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_audit" ON audit_log;
CREATE POLICY "anon_delete_audit" ON audit_log FOR DELETE TO anon, authenticated USING (true);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_tier ON tickets(tier);
CREATE INDEX IF NOT EXISTS idx_tickets_sla ON tickets(sla_deadline);
CREATE INDEX IF NOT EXISTS idx_messages_ticket ON ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_actions_ticket ON agent_actions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON agent_actions(approval_status);
CREATE INDEX IF NOT EXISTS idx_audit_ticket ON audit_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- ===== SEED: KNOWLEDGE BASE =====
INSERT INTO knowledge_articles (title, category, content, tags) VALUES
('How to Change Your Password', 'account',
'1. Press Ctrl+Alt+Delete and select "Change a password".\n2. Enter your current password, then your new password twice.\n3. Choose a strong password: at least 12 characters with a mix of upper and lower case, numbers, and symbols.\n4. Click the arrow to confirm.\n\nYour new password takes effect immediately. You may need to re-enter it on your phone and email apps.',
ARRAY['password','account','security','credentials']),
('How Does the VPN Work?', 'network',
'The VPN (Virtual Private Network) creates a secure encrypted tunnel between your computer and the company network. When connected:\n\n- Your internet traffic is encrypted and routed through the company server.\n- You can access internal systems as if you were in the office.\n- Your data is protected even on public Wi-Fi.\n\nTo connect: open the VPN client from your taskbar, select the office location, and click Connect. Enter your domain credentials when prompted.',
ARRAY['vpn','network','security','remote']),
('How to Use the Office Printer', 'hardware',
'1. Ensure you are on the same network as the printer.\n2. Open the document and press Ctrl+P.\n3. Select the printer from the dropdown (look for the floor number in the name).\n4. Choose color or black and white, single or double-sided.\n5. Click Print.\n\nFor scanning: place your document face-up in the feeder, press the Scan button on the printer panel, select your email, and press Start.',
ARRAY['printer','hardware','scan','print']),
('How to Navigate the Company Portal', 'software',
'The company portal has a top navigation bar with these sections:\n\n- Home: your dashboard with announcements and quick links.\n- Tickets: create and track your IT support requests.\n- Knowledge Base: search for how-to articles and guides.\n- Runbooks: step-by-step procedures for common maintenance tasks.\n- Audit Log: a record of all technical changes made by the AI agent.\n\nUse the search bar at the top to find anything quickly.',
ARRAY['portal','navigation','ui','software']),
('How to Connect a Second Monitor', 'hardware',
'1. Plug the monitor into power and connect the cable (HDMI or DisplayPort) to your laptop dock or desktop.\n2. Right-click the desktop and select "Display settings".\n3. Click "Detect" if the monitor does not appear.\n4. Choose "Extend these displays" to use it as a second screen.\n5. Drag the displays to match your physical setup and click Apply.',
ARRAY['monitor','hardware','display','dock']),
('Resetting Email Password on Mobile', 'account',
'After changing your domain password, your phone email app will stop syncing.\n\n1. Open Settings > Mail > Accounts.\n2. Tap your work account.\n3. Re-enter your new password.\n4. Save and wait a minute for mail to sync.\n\nIf it still fails, remove the account and re-add it with the new password.',
ARRAY['email','mobile','password','account'])
ON CONFLICT DO NOTHING;

-- ===== SEED: RUNBOOKS =====
INSERT INTO runbooks (title, tier, category, description, estimated_time_minutes, steps) VALUES
('Password Reset Request', 'L1', 'account', 'Standard procedure for handling user password reset requests.', 10,
'[
  {"step": 1, "title": "Verify User Identity", "detail": "Confirm the user''s identity via employee ID, manager confirmation, or security questions."},
  {"step": 2, "title": "Check Reset Eligibility", "detail": "Verify the account is not locked due to security policy violations."},
  {"step": 3, "title": "Generate Temporary Password", "detail": "Create a temporary password that meets complexity requirements. The user must change it at next login."},
  {"step": 4, "title": "Communicate Securely", "detail": "Provide the temporary password via a secure channel (in-person or encrypted message). Never email it."},
  {"step": 5, "title": "Confirm Reset", "detail": "Verify the user can log in with the temporary password and has changed it."},
  {"step": 6, "title": "Document & Close", "detail": "Record the reset in the ticketing system and close the ticket."}]'::jsonb),
('VPN Connectivity Issues', 'L1', 'network', 'Troubleshooting VPN connection failures.', 15,
'[
  {"step": 1, "title": "Check Internet Connection", "detail": "Confirm the user has working internet by loading a public website."},
  {"step": 2, "title": "Verify VPN Client", "detail": "Ensure the VPN client is updated to the latest version. Restart the client if needed."},
  {"step": 3, "title": "Check Credentials", "detail": "Confirm the user is entering correct domain credentials. Test with a password reset if uncertain."},
  {"step": 4, "title": "Review Firewall/Antivirus", "detail": "Temporarily check if local firewall or antivirus is blocking the VPN port."},
  {"step": 5, "title": "Try Alternate Gateway", "detail": "Switch to a backup VPN gateway if the primary is unreachable."},
  {"step": 6, "title": "Escalate if Unresolved", "detail": "If all steps fail, escalate to L2 with diagnostic logs attached."}]'::jsonb),
('Application Performance Degradation', 'L2', 'performance', 'Diagnosing and resolving slow application performance.', 30,
'[
  {"step": 1, "title": "Gather Metrics", "detail": "Collect CPU, memory, disk, and network metrics from the affected server. Check APM dashboards for anomalies."},
  {"step": 2, "title": "Identify Bottleneck", "detail": "Analyze metrics to find the bottleneck — high CPU, memory pressure, disk I/O, or network latency."},
  {"step": 3, "title": "Review Recent Changes", "detail": "Check the audit log and deployment history for recent code or config changes that may have caused the issue."},
  {"step": 4, "title": "Propose Remediation", "detail": "Based on root cause, propose a remediation: scale resources, revert a change, fix a query, or restart a service. Requires human approval before executing."},
  {"step": 5, "title": "Execute Approved Fix", "detail": "Apply the approved remediation. Monitor closely for 15 minutes after."},
  {"step": 6, "title": "Verify Resolution", "detail": "Confirm performance metrics return to baseline. Document root cause and fix in the ticket."}]'::jsonb),
('Database Connection Failure', 'L2', 'database', 'Resolving database connectivity and connection pool exhaustion issues.', 25,
'[
  {"step": 1, "title": "Verify Database Status", "detail": "Check if the database server is running and reachable from the application server."},
  {"step": 2, "title": "Check Connection Pool", "detail": "Review active connections vs. max pool size. Look for connection leaks in application logs."},
  {"step": 3, "title": "Review Credentials", "detail": "Confirm database credentials are valid and not expired. Check for recent password rotations."},
  {"step": 4, "title": "Inspect Firewall Rules", "detail": "Verify network ACLs and firewall rules allow traffic on the database port."},
  {"step": 5, "title": "Propose Action", "detail": "If a restart or config change is needed, propose it as an agent action for human approval."},
  {"step": 6, "title": "Execute & Verify", "detail": "After approval, execute the change and verify application can connect. Document in ticket."}]'::jsonb),
('Device Enrollment and Setup', 'L1', 'hardware', 'Onboarding a new device for a user.', 20,
'[
  {"step": 1, "title": "Unbox & Inspect", "detail": "Verify the device and all accessories are present and undamaged."},
  {"step": 2, "title": "Power On & Run OS Setup", "detail": "Complete the initial OS setup wizard. Connect to the provisioning network."},
  {"step": 3, "title": "Enroll in MDM", "detail": "Enroll the device in the mobile device management system. Wait for policies to apply."},
  {"step": 4, "title": "Install Standard Software", "detail": "Verify the standard software suite installs automatically via MDM. Install any additional approved apps."},
  {"step": 5, "title": "Configure Email & VPN", "detail": "Set up the user''s email account and VPN client. Test both."},
  {"step": 6, "title": "Hand Over to User", "detail": "Provide a brief orientation. Document the device serial number and assignee in the asset system."}]'::jsonb),
('Security Incident Containment', 'L2', 'security', 'Containing and investigating a suspected security incident.', 45,
'[
  {"step": 1, "title": "Identify Scope", "detail": "Determine which systems, accounts, or data are affected. Quarantine affected endpoints immediately."},
  {"step": 2, "title": "Preserve Evidence", "detail": "Capture memory dumps, disk images, and relevant logs before making changes. Store evidence securely."},
  {"step": 3, "title": "Block Indicators", "detail": "Block malicious IPs, domains, and file hashes at the firewall and endpoint protection. This action requires human approval."},
  {"step": 4, "title": "Reset Compromised Accounts", "detail": "Force password resets and revoke active sessions for all affected accounts. Requires human approval."},
  {"step": 5, "title": "Investigate Root Cause", "detail": "Analyze evidence to determine the entry vector and timeline. Document findings."},
  {"step": 6, "title": "Remediate & Report", "detail": "Apply permanent fixes, verify containment, and produce an incident report for stakeholders."}]'::jsonb)
ON CONFLICT DO NOTHING;
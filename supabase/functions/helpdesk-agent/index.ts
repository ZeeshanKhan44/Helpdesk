import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface TicketRow {
  id: string;
  title: string;
  description: string;
  tier: string;
  status: string;
  priority: string;
  phase: string;
  category: string | null;
  sla_deadline: string | null;
  sla_breach: boolean;
}

interface ActionRow {
  id: string;
  ticket_id: string;
  action_type: string;
  title: string;
  description: string;
  risk_level: string;
  affected_system: string | null;
  proposed_changes: Record<string, unknown>;
  approval_status: string;
  agent_reasoning: string | null;
}

// ─── Knowledge base for self-service answers ────────────────────────────
const KNOWLEDGE: Record<string, { answer: string; category: string }> = {
  password: {
    answer:
      "Here is how to change your password:\n\n1. Press Ctrl+Alt+Delete and select \"Change a password\".\n2. Enter your current password, then your new password twice.\n3. Use at least 12 characters with a mix of upper/lower case, numbers, and symbols.\n4. Click the arrow to confirm.\n\nYour new password takes effect immediately. You may need to re-enter it on your phone and email apps.",
    category: "account",
  },
  vpn: {
    answer:
      "The VPN creates a secure encrypted tunnel between your computer and the company network:\n\n- Your internet traffic is encrypted and routed through the company server.\n- You can access internal systems as if you were in the office.\n- Your data is protected even on public Wi-Fi.\n\nTo connect: open the VPN client from your taskbar, select the office location, and click Connect. Enter your domain credentials when prompted.",
    category: "network",
  },
  printer: {
    answer:
      "To use the office printer:\n\n1. Ensure you are on the same network as the printer.\n2. Open your document and press Ctrl+P.\n3. Select the printer from the dropdown (look for the floor number in the name).\n4. Choose color or black and white, single or double-sided.\n5. Click Print.\n\nFor scanning: place your document face-up in the feeder, press the Scan button on the printer panel, select your email, and press Start.",
    category: "hardware",
  },
  email: {
    answer:
      "To set up or fix your email:\n\n1. Open your email app and add a new account.\n2. Enter your work email address.\n3. Choose Exchange or Office 365 as the account type.\n4. Sign in with your domain credentials.\n5. Wait for sync to complete.\n\nIf email stopped syncing after a password change, go to Settings > Mail > Accounts, tap your work account, and re-enter your new password.",
    category: "account",
  },
  monitor: {
    answer:
      "To connect a second monitor:\n\n1. Plug the monitor into power and connect the cable (HDMI or DisplayPort) to your laptop dock or desktop.\n2. Right-click the desktop and select \"Display settings\".\n3. Click \"Detect\" if the monitor does not appear.\n4. Choose \"Extend these displays\" to use it as a second screen.\n5. Drag the displays to match your physical setup and click Apply.",
    category: "hardware",
  },
  wifi: {
    answer:
      "To connect to the office Wi-Fi:\n\n1. Click the Wi-Fi icon in your taskbar.\n2. Select the company network (usually named \"Company-Staff\").\n3. Enter the Wi-Fi password. If you don't know it, ask your manager or check the welcome packet.\n4. Click Connect.\n\nIf the connection drops, try forgetting the network and reconnecting. If it still fails, there may be a network outage — check the status page.",
    category: "network",
  },
  "two factor": {
    answer:
      "Two-factor authentication (2FA) adds a second layer of security beyond your password:\n\n1. After entering your password, you will be prompted for a second factor.\n2. This is usually a code from an authenticator app on your phone.\n3. Open the app (e.g. Microsoft Authenticator) and enter the 6-digit code.\n4. The code refreshes every 30 seconds.\n\nIf you get a new phone, contact IT to reset your 2FA before you lose access to the old device.",
    category: "security",
  },
  "clear cache": {
    answer:
      "To clear your browser cache:\n\n1. Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac).\n2. Set the time range to \"All time\".\n3. Check \"Cached images and files\".\n4. Click \"Clear data\".\n5. Reload the page.\n\nThis often fixes pages that load incorrectly or show old content.",
    category: "software",
  },
  "slow computer": {
    answer:
      "If your computer is running slowly:\n\n1. Close unused applications and browser tabs.\n2. Restart your computer — this fixes most slowdowns.\n3. Check for Windows/OS updates and install them.\n4. Run a virus scan if you suspect malware.\n\nIf it is still slow after these steps, there may be a hardware issue or a resource-heavy process. Submit a ticket and the AI agent will diagnose it.",
    category: "hardware",
  },
  "file share": {
    answer:
      "To access the company file share:\n\n1. Open File Explorer.\n2. In the address bar, type \\\\company-files\\shared and press Enter.\n3. Navigate to your department folder.\n4. You can drag files in and out like any folder.\n\nIf you get an access denied error, you may not have permission for that folder. Submit a ticket requesting access, and specify which folder you need.",
    category: "network",
  },
};

// ─── Keyword matching for self-service queries ──────────────────────────
function findKnowledgeAnswer(text: string): { answer: string; category: string } | null {
  const lower = text.toLowerCase();
  for (const [keyword, entry] of Object.entries(KNOWLEDGE)) {
    if (lower.includes(keyword)) return entry;
  }
  return null;
}

// ─── Triage logic: classify severity, tier, category, SLA ───────────────
function triageTicket(title: string, description: string): {
  priority: string;
  tier: string;
  category: string;
  slaMinutes: number;
} {
  const text = (title + " " + description).toLowerCase();

  // Priority detection
  let priority = "low";
  if (/outage|down|critical|cannot work|production|all users|everyone/.test(text)) {
    priority = "critical";
  } else if (/urgent|asap|blocked|deadline|meeting|vip|executive/.test(text)) {
    priority = "high";
  } else if (/slow|intermittent|sometimes|occasional|minor|annoying/.test(text)) {
    priority = "medium";
  }

  // Tier detection
  let tier = "L1";
  if (/database|server|production|deploy|code|config|security|breach|malware|infrastructure|api/.test(text)) {
    tier = "L2";
  }
  if (priority === "critical") tier = "L2";

  // Category detection
  let category = "general";
  if (/password|login|account|credential/.test(text)) category = "account";
  else if (/vpn|network|wifi|internet|connect/.test(text)) category = "network";
  else if (/printer|monitor|laptop|desktop|hardware|device|dock|keyboard|mouse/.test(text)) category = "hardware";
  else if (/email|outlook|calendar|teams|slack/.test(text)) category = "software";
  else if (/slow|performance|cpu|memory|disk/.test(text)) category = "performance";
  else if (/security|malware|virus|phishing|breach/.test(text)) category = "security";

  // SLA: critical=1h, high=4h, medium=8h, low=24h
  const slaMinutes = priority === "critical" ? 60 : priority === "high" ? 240 : priority === "medium" ? 480 : 1440;

  return { priority, tier, category, slaMinutes };
}

// ─── Determine if a query needs human approval ──────────────────────────
function requiresApproval(text: string): {
  needsApproval: boolean;
  actionType: string;
  title: string;
  description: string;
  riskLevel: string;
  affectedSystem: string;
  proposedChanges: Record<string, unknown>;
  reasoning: string;
} | null {
  const lower = text.toLowerCase();

  if (/restart.*service|restart.*server|reboot.*server/.test(lower)) {
    return {
      needsApproval: true,
      actionType: "service_restart",
      title: "Restart Affected Service",
      description: "The agent proposes restarting the affected service to clear a transient failure. This will cause a brief interruption for all users of that service.",
      riskLevel: "medium",
      affectedSystem: "application server",
      proposedChanges: { action: "restart", target: "service", impact: "brief interruption" },
      reasoning: "Restarting the service is the fastest way to clear transient failures. The agent identified error patterns consistent with a hung process or memory leak that a restart resolves.",
    };
  }

  if (/modify.*config|change.*config|update.*config|edit.*config/.test(lower)) {
    return {
      needsApproval: true,
      actionType: "config_change",
      title: "Modify System Configuration",
      description: "The agent proposes changing a configuration setting to resolve the issue. Incorrect configuration can affect system stability.",
      riskLevel: "high",
      affectedSystem: "configuration",
      proposedChanges: { action: "config_update", impact: "system behavior change" },
      reasoning: "The current configuration is misaligned with the expected state. The agent identified the specific setting causing the issue and proposes correcting it.",
    };
  }

  if (/deploy|push.*code|release|rollout|update.*application/.test(lower)) {
    return {
      needsApproval: true,
      actionType: "deployment",
      title: "Deploy Code Change",
      description: "The agent proposes deploying a code fix. This affects the production environment and all its users.",
      riskLevel: "high",
      affectedSystem: "production application",
      proposedChanges: { action: "deploy", impact: "production change" },
      reasoning: "A code fix has been prepared that addresses the root cause. Deployment to production requires human approval per policy.",
    };
  }

  if (/block.*ip|block.*domain|firewall.*rule|quarantine/.test(lower)) {
    return {
      needsApproval: true,
      actionType: "security_block",
      title: "Block Malicious Indicator",
      description: "The agent proposes blocking a malicious IP, domain, or file hash at the firewall. This prevents further attack but may block legitimate traffic if the indicator is shared.",
      riskLevel: "high",
      affectedSystem: "firewall / endpoint protection",
      proposedChanges: { action: "block_indicator", impact: "network traffic blocked" },
      reasoning: "A malicious indicator was identified during triage. Blocking it contains the threat and protects other systems.",
    };
  }

  if (/reset.*password|unlock.*account|disable.*account|revoke.*session/.test(lower)) {
    return {
      needsApproval: true,
      actionType: "account_action",
      title: "Account Password Reset or Lock Change",
      description: "The agent proposes resetting a password, unlocking, or disabling an account. This affects user access.",
      riskLevel: "medium",
      affectedSystem: "identity provider",
      proposedChanges: { action: "account_change", impact: "user access affected" },
      reasoning: "The account may be compromised or the user has lost access. The agent proposes a secure reset following identity verification.",
    };
  }

  if (/delete.*data|drop.*table|remove.*record|purge/.test(lower)) {
    return {
      needsApproval: true,
      actionType: "data_modification",
      title: "Delete or Modify Data",
      description: "The agent proposes deleting or modifying data. This is irreversible and must be approved by a human.",
      riskLevel: "critical",
      affectedSystem: "database",
      proposedChanges: { action: "data_delete", impact: "irreversible data change" },
      reasoning: "Data deletion is irreversible. The agent identified the specific records but requires human confirmation before proceeding.",
    };
  }

  return null;
}

// ─── Generate agent response based on ticket context ────────────────────
function generateAgentResponse(
  message: string,
  ticket: TicketRow,
  isSelfService: boolean,
): { response: string; newPhase: string; newStatus: string; escalate: boolean } {
  const lower = message.toLowerCase();

  // Self-service: answer directly
  if (isSelfService) {
    return {
      response: "",
      newPhase: ticket.phase,
      newStatus: ticket.status,
      escalate: false,
    };
  }

  // Greeting / thanks
  if (/^(hi|hello|hey|thanks|thank you|ok|okay|got it)\b/.test(lower) && lower.length < 30) {
    return {
      response: "I am here to help. Could you describe the issue you are experiencing in more detail so I can assist you?",
      newPhase: ticket.phase,
      newStatus: ticket.status,
      escalate: false,
    };
  }

  // Escalation request
  if (/escalate|human|manager|supervisor|speak to.*person/.test(lower)) {
    return {
      response: "I am escalating this ticket to a human technician. A support specialist will contact you shortly. I will keep monitoring the ticket and assist where I can.",
      newPhase: "triage",
      newStatus: "escalated",
      escalate: true,
    };
  }

  // Resolution confirmation
  if (/resolved|fixed|working now|solved|all good|it works/.test(lower)) {
    return {
      response: "I am glad the issue is resolved. I will close this ticket. If you experience the problem again, please submit a new ticket and I will pick it up right away.",
      newPhase: "closure",
      newStatus: "resolved",
      escalate: false,
    };
  }

  // Diagnostic questions based on category
  const category = ticket.category || "general";
  let response = "";
  let newPhase = ticket.phase;
  let newStatus = ticket.status;

  switch (category) {
    case "account":
      response =
        "I can help with account issues. To proceed securely:\n\n1. Can you confirm your username or employee ID?\n2. When did you last have access?\n3. Have you recently changed your password?\n\nIf this is a simple password change, I can guide you through it. If an account reset is needed, I will propose it for human approval.";
      newPhase = "diagnosis";
      newStatus = "in_progress";
      break;

    case "network":
      response =
        "Let me help with your network issue. A few quick checks:\n\n1. Can you load any website at all?\n2. Are you on Wi-Fi or a wired connection?\n3. Is this happening on one device or multiple?\n4. Have you restarted your router or VPN client?\n\nBased on your answers, I will either guide you through a fix or propose a network change for approval.";
      newPhase = "diagnosis";
      newStatus = "in_progress";
      break;

    case "hardware":
      response =
        "I can assist with hardware issues. Let me ask a few questions:\n\n1. What device are you using (laptop, desktop, printer, monitor)?\n2. Is the device powered on and connected?\n3. When did the issue start?\n4. Have you tried restarting the device?\n\nIf this is a setup or usage question, I will guide you through it. If hardware replacement is needed, I will escalate to L2.";
      newPhase = "diagnosis";
      newStatus = "in_progress";
      break;

    case "software":
      response =
        "Let me help with your software issue:\n\n1. Which application is affected?\n2. What happens when you try to use it (error message, crash, blank screen)?\n3. When did it start?\n4. Have you tried clearing the cache or restarting the app?\n\nIf a reinstall or configuration change is needed, I will propose it for human approval.";
      newPhase = "diagnosis";
      newStatus = "in_progress";
      break;

    case "performance":
      response =
        "I will help diagnose the performance issue. Let me gather some information:\n\n1. Which application or system is slow?\n2. Is it consistently slow or intermittent?\n3. When did you first notice the slowdown?\n4. Are other users affected too?\n\nI will analyze the data and propose a remediation. Any system-level changes will require human approval before I execute them.";
      newPhase = "diagnosis";
      newStatus = "in_progress";
      break;

    case "security":
      response =
        "This may be a security matter and I take it seriously. Please tell me:\n\n1. What did you observe (suspicious email, unexpected pop-up, account lockout)?\n2. Did you click any links or download anything?\n3. Is your device behaving unexpectedly?\n\nI will begin containment procedures. Any security actions (blocking indicators, resetting accounts) will require human approval before execution.";
      newPhase = "diagnosis";
      newStatus = "in_progress";
      break;

    default:
      response =
        "I have received your message. To help me diagnose this efficiently, please tell me:\n\n1. What exactly is happening?\n2. When did it start?\n3. What have you already tried?\n4. Is this affecting your ability to work?\n\nI will use this information to triage the issue and propose next steps.";
      newPhase = ticket.phase === "intake" ? "triage" : ticket.phase;
      newStatus = "in_progress";
      break;
  }

  return { response, newPhase, newStatus, escalate: false };
}

// ─── Main handler ───────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();

    // ── TRIAGE: classify a new ticket ───────────────────────────────
    if (action === "triage") {
      const { ticket_id, title, description } = payload;
      const triage = triageTicket(title, description);
      const slaDeadline = new Date(Date.now() + triage.slaMinutes * 60 * 1000).toISOString();

      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          priority: triage.priority,
          tier: triage.tier,
          category: triage.category,
          phase: "triage",
          status: "in_progress",
          sla_deadline: slaDeadline,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket_id);

      if (updateError) throw updateError;

      // Agent intro message
      const agentMsg = `I have triaged your ticket and here is my assessment:\n\n- Priority: ${triage.priority.toUpperCase()}\n- Support Tier: ${triage.tier}\n- Category: ${triage.category}\n- SLA Target: ${triage.slaMinutes >= 60 ? Math.floor(triage.slaMinutes / 60) + " hour(s)" : triage.slaMinutes + " minutes"}\n\n${triage.tier === "L2" ? "Because this may involve system-level changes, some actions will require human approval before I execute them. " : ""}Please describe your issue in detail and I will help you resolve it.`;

      await supabase.from("ticket_messages").insert({
        ticket_id,
        sender: "agent",
        content: agentMsg,
        message_type: "text",
      });

      await supabase.from("audit_log").insert({
        ticket_id,
        event_type: "triage",
        description: `Agent triaged ticket: priority=${triage.priority}, tier=${triage.tier}, category=${triage.category}`,
        actor: "AI Agent",
        severity: "info",
        metadata: { triage },
      });

      return new Response(
        JSON.stringify({ success: true, triage, slaDeadline }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── CHAT: process a user message on a ticket ────────────────────
    if (action === "chat") {
      const { ticket_id, message } = payload;

      // Fetch ticket
      const { data: ticket, error: tErr } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticket_id)
        .maybeSingle() as { data: TicketRow | null; error: any };

      if (tErr || !ticket) throw new Error("Ticket not found");

      // Save user message
      await supabase.from("ticket_messages").insert({
        ticket_id,
        sender: "user",
        content: message,
        message_type: "text",
      });

      // Check if this is a self-service query
      const knowledge = findKnowledgeAnswer(message);

      if (knowledge) {
        // Answer directly — no approval needed
        await supabase.from("ticket_messages").insert({
          ticket_id,
          sender: "agent",
          content: knowledge.answer,
          message_type: "text",
        });

        // Check if we should propose an action too
        const approval = requiresApproval(message);
        if (approval && approval.needsApproval) {
          const { data: actionRow } = await supabase.from("agent_actions").insert({
            ticket_id,
            action_type: approval.actionType,
            title: approval.title,
            description: approval.description,
            risk_level: approval.riskLevel,
            affected_system: approval.affectedSystem,
            proposed_changes: approval.proposedChanges,
            agent_reasoning: approval.reasoning,
            approval_status: "pending",
          }).select("*").maybeSingle() as { data: ActionRow | null; error: any };

          if (actionRow) {
            await supabase.from("ticket_messages").insert({
              ticket_id,
              sender: "agent",
              content: `I have proposed a technical action that requires human approval:\n\n**${approval.title}**\n${approval.description}\n\nRisk Level: ${approval.riskLevel.toUpperCase()}\nAffected System: ${approval.affectedSystem}\n\nMy reasoning: ${approval.reasoning}\n\nPlease review and approve or reject this action in the Approval Panel.`,
              message_type: "action_proposed",
              metadata: { action_id: actionRow.id },
            });

            await supabase.from("tickets").update({
              status: "awaiting_approval",
              updated_at: new Date().toISOString(),
            }).eq("id", ticket_id);

            await supabase.from("audit_log").insert({
              ticket_id,
              action_id: actionRow.id,
              event_type: "action_proposed",
              description: `Agent proposed: ${approval.title} (risk: ${approval.riskLevel})`,
              actor: "AI Agent",
              severity: approval.riskLevel === "critical" || approval.riskLevel === "high" ? "warning" : "info",
              metadata: { action_type: approval.actionType },
            });
          }
        } else {
          // Check for general approval needs even without knowledge match
          const approvalCheck = requiresApproval(message);
          if (approvalCheck) {
            const { data: actionRow } = await supabase.from("agent_actions").insert({
              ticket_id,
              action_type: approvalCheck.actionType,
              title: approvalCheck.title,
              description: approvalCheck.description,
              risk_level: approvalCheck.riskLevel,
              affected_system: approvalCheck.affectedSystem,
              proposed_changes: approvalCheck.proposedChanges,
              agent_reasoning: approvalCheck.reasoning,
              approval_status: "pending",
            }).select("*").maybeSingle() as { data: ActionRow | null; error: any };

            if (actionRow) {
              await supabase.from("ticket_messages").insert({
                ticket_id,
                sender: "agent",
                content: `I have proposed a technical action that requires human approval:\n\n**${approvalCheck.title}**\n${approvalCheck.description}\n\nRisk Level: ${approvalCheck.riskLevel.toUpperCase()}\nAffected System: ${approvalCheck.affectedSystem}\n\nMy reasoning: ${approvalCheck.reasoning}\n\nPlease review and approve or reject this action in the Approval Panel.`,
                message_type: "action_proposed",
                metadata: { action_id: actionRow.id },
              });

              await supabase.from("tickets").update({
                status: "awaiting_approval",
                updated_at: new Date().toISOString(),
              }).eq("id", ticket_id);

              await supabase.from("audit_log").insert({
                ticket_id,
                action_id: actionRow.id,
                event_type: "action_proposed",
                description: `Agent proposed: ${approvalCheck.title} (risk: ${approvalCheck.riskLevel})`,
                actor: "AI Agent",
                severity: approvalCheck.riskLevel === "critical" || approvalCheck.riskLevel === "high" ? "warning" : "info",
                metadata: { action_type: approvalCheck.actionType },
              });

              return new Response(
                JSON.stringify({ success: true, self_service: false, action_proposed: true, action_id: actionRow.id }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }
          }
        }

        await supabase.from("audit_log").insert({
          ticket_id,
          event_type: "self_service_answer",
          description: `Agent answered self-service query: category=${knowledge.category}`,
          actor: "AI Agent",
          severity: "info",
          metadata: { category: knowledge.category },
        });

        return new Response(
          JSON.stringify({ success: true, self_service: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Not self-service — generate diagnostic response
      const result = generateAgentResponse(message, ticket, false);

      await supabase.from("ticket_messages").insert({
        ticket_id,
        sender: "agent",
        content: result.response,
        message_type: result.escalate ? "escalation" : "text",
      });

      // Update ticket phase/status
      const updateData: Record<string, unknown> = {
        phase: result.newPhase,
        status: result.newStatus,
        updated_at: new Date().toISOString(),
      };

      // Check SLA breach
      if (ticket.sla_deadline) {
        const slaTime = new Date(ticket.sla_deadline).getTime();
        if (Date.now() > slaTime && ticket.status !== "resolved") {
          updateData.sla_breach = true;
        }
      }

      await supabase.from("tickets").update(updateData).eq("id", ticket_id);

      if (result.escalate) {
        await supabase.from("audit_log").insert({
          ticket_id,
          event_type: "escalation",
          description: "Agent escalated ticket to human technician per user request",
          actor: "AI Agent",
          severity: "warning",
        });
      }

      // Check if approval is needed based on the message
      const approval = requiresApproval(message);
      if (approval) {
        const { data: actionRow } = await supabase.from("agent_actions").insert({
          ticket_id,
          action_type: approval.actionType,
          title: approval.title,
          description: approval.description,
          risk_level: approval.riskLevel,
          affected_system: approval.affectedSystem,
          proposed_changes: approval.proposedChanges,
          agent_reasoning: approval.reasoning,
          approval_status: "pending",
        }).select("*").maybeSingle() as { data: ActionRow | null; error: any };

        if (actionRow) {
          await supabase.from("ticket_messages").insert({
            ticket_id,
            sender: "agent",
            content: `I have proposed a technical action that requires human approval:\n\n**${approval.title}**\n${approval.description}\n\nRisk Level: ${approval.riskLevel.toUpperCase()}\nAffected System: ${approval.affectedSystem}\n\nMy reasoning: ${approval.reasoning}\n\nPlease review and approve or reject this action in the Approval Panel.`,
            message_type: "action_proposed",
            metadata: { action_id: actionRow.id },
          });

          await supabase.from("tickets").update({
            status: "awaiting_approval",
            updated_at: new Date().toISOString(),
          }).eq("id", ticket_id);

          await supabase.from("audit_log").insert({
            ticket_id,
            action_id: actionRow.id,
            event_type: "action_proposed",
            description: `Agent proposed: ${approval.title} (risk: ${approval.riskLevel})`,
            actor: "AI Agent",
            severity: approval.riskLevel === "critical" || approval.riskLevel === "high" ? "warning" : "info",
            metadata: { action_type: approval.actionType },
          });

          return new Response(
            JSON.stringify({ success: true, self_service: false, action_proposed: true, action_id: actionRow.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, self_service: false, escalated: result.escalate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── APPROVE: human approves an agent action ─────────────────────
    if (action === "approve_action") {
      const { action_id, notes } = payload;

      const { data: act } = await supabase
        .from("agent_actions")
        .select("*")
        .eq("id", action_id)
        .maybeSingle() as { data: ActionRow | null; error: any };

      if (!act) throw new Error("Action not found");

      await supabase.from("agent_actions").update({
        approval_status: "executed",
        approver_notes: notes || "Approved by human reviewer",
        decided_at: new Date().toISOString(),
        executed_at: new Date().toISOString(),
      }).eq("id", action_id);

      await supabase.from("ticket_messages").insert({
        ticket_id: act.ticket_id,
        sender: "system",
        content: `Action approved and executed: ${act.title}\n\nApprover notes: ${notes || "Approved by human reviewer"}`,
        message_type: "action_approved",
        metadata: { action_id },
      });

      await supabase.from("tickets").update({
        status: "in_progress",
        phase: "resolution",
        updated_at: new Date().toISOString(),
      }).eq("id", act.ticket_id);

      await supabase.from("audit_log").insert({
        ticket_id: act.ticket_id,
        action_id: action_id,
        event_type: "action_approved",
        description: `Human approved action: ${act.title}`,
        actor: "Human Reviewer",
        severity: act.risk_level === "critical" ? "warning" : "info",
        metadata: { notes },
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── REJECT: human rejects an agent action ───────────────────────
    if (action === "reject_action") {
      const { action_id, notes } = payload;

      const { data: act } = await supabase
        .from("agent_actions")
        .select("*")
        .eq("id", action_id)
        .maybeSingle() as { data: ActionRow | null; error: any };

      if (!act) throw new Error("Action not found");

      await supabase.from("agent_actions").update({
        approval_status: "rejected",
        approver_notes: notes || "Rejected by human reviewer",
        decided_at: new Date().toISOString(),
      }).eq("id", action_id);

      await supabase.from("ticket_messages").insert({
        ticket_id: act.ticket_id,
        sender: "system",
        content: `Action rejected: ${act.title}\n\nReviewer notes: ${notes || "Rejected by human reviewer"}`,
        message_type: "action_rejected",
        metadata: { action_id },
      });

      await supabase.from("tickets").update({
        status: "in_progress",
        updated_at: new Date().toISOString(),
      }).eq("id", act.ticket_id);

      await supabase.from("audit_log").insert({
        ticket_id: act.ticket_id,
        action_id: action_id,
        event_type: "action_rejected",
        description: `Human rejected action: ${act.title}`,
        actor: "Human Reviewer",
        severity: "warning",
        metadata: { notes },
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── RESOLVE: mark ticket as resolved ─────────────────────────────
    if (action === "resolve") {
      const { ticket_id, resolution } = payload;

      await supabase.from("tickets").update({
        status: "resolved",
        phase: "closure",
        resolution: resolution || "Resolved by AI agent",
        updated_at: new Date().toISOString(),
      }).eq("id", ticket_id);

      await supabase.from("ticket_messages").insert({
        ticket_id,
        sender: "agent",
        content: `This ticket has been marked as resolved.\n\nResolution: ${resolution || "Resolved by AI agent"}\n\nIf you experience this issue again, please submit a new ticket.`,
        message_type: "resolution",
      });

      await supabase.from("audit_log").insert({
        ticket_id,
        event_type: "resolved",
        description: `Ticket resolved: ${resolution || "Resolved by AI agent"}`,
        actor: "AI Agent",
        severity: "info",
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── ESCALATE: escalate ticket to human ──────────────────────────
    if (action === "escalate") {
      const { ticket_id, reason } = payload;

      await supabase.from("tickets").update({
        status: "escalated",
        tier: "L2",
        updated_at: new Date().toISOString(),
      }).eq("id", ticket_id);

      await supabase.from("ticket_messages").insert({
        ticket_id,
        sender: "agent",
        content: `This ticket has been escalated to a human L2 technician.\n\nReason: ${reason || "Escalated per agent assessment"}\n\nA specialist will contact you shortly. I will continue to assist where I can.`,
        message_type: "escalation",
      });

      await supabase.from("audit_log").insert({
        ticket_id,
        event_type: "escalation",
        description: `Ticket escalated: ${reason || "Agent escalation"}`,
        actor: "AI Agent",
        severity: "warning",
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

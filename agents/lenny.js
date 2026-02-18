import { registerAgent } from '../core/scheduler.js';
import { askClaude } from '../core/claude.js';
import { sendDM } from '../core/slack.js';
import { getMemory, setMemory } from '../core/memory.js';
import {
	getMyIssues,
	getIssueDetails,
	addComment,
	createChildIssue,
	getTeams,
} from '../core/linear.js';

const AGENT_NAME = 'Lenny';

const SYSTEM_PROMPT = `You are Lenny, a Linear ticket analysis assistant for a Front End Engineer at FantasyPros, a fantasy sports website.
Your job is to read Linear tickets and break them down into clear, actionable steps a developer can follow.
You understand frontend development, Vue.js, accessibility work, UI/UX improvements, and fantasy sports domain context.
Always respond in valid JSON only — no markdown fences, no extra text, just the raw JSON object.`;

const ANALYSIS_PROMPT = (ticket) => `Analyze this Linear ticket and break it down into actionable development steps.

Ticket ID: ${ticket.id}
Title: ${ticket.title}
Description: ${ticket.description || 'No description provided'}
Current State: ${ticket.state}
Priority: ${ticket.priority}

Respond with a JSON object in exactly this format:
{
  "needsSubIssues": true or false,
  "reasoning": "brief explanation of why sub-issues are or aren't needed",
  "summary": "2-3 sentence overview of what this ticket requires",
  "steps": [
    {
      "title": "Step title",
      "details": "Detailed explanation of what to do",
      "checklist": ["item 1", "item 2", "item 3"]
    }
  ],
  "subIssues": [
    {
      "title": "Sub-issue title",
      "description": "Full markdown description with checklist for this sub-issue"
    }
  ]
}

If needsSubIssues is false, subIssues should be an empty array.
If needsSubIssues is true, steps should still be filled out as an overview, and subIssues should contain the breakdown.`;

function buildCommentMarkdown(analysis, ticket) {
	const lines = [
		`## 🤖 Lenny's Breakdown — ${ticket.id}`,
		``,
		`> ${analysis.summary}`,
		``,
		`**Complexity:** ${analysis.needsSubIssues ? '🔴 High — sub-issues created' : '🟢 Standard — steps below'}`,
		`**Reasoning:** ${analysis.reasoning}`,
		``,
		`---`,
		``,
		`## Steps`,
		``,
	];

	analysis.steps.forEach((step, i) => {
		lines.push(`### ${i + 1}. ${step.title}`);
		lines.push(``);
		lines.push(step.details);
		lines.push(``);
		step.checklist.forEach((item) => {
			lines.push(`- [ ] ${item}`);
		});
		lines.push(``);
	});

	return lines.join('\n');
}

function hasLennysComment(comments) {
	return comments.some((c) => c.body.includes('🤖 Lenny\'s Breakdown'));
}

export async function processTicket(ticketId) {
	console.log(`[${AGENT_NAME}] Processing ticket: ${ticketId}`);

	const ticket = await getIssueDetails(AGENT_NAME, ticketId);

	if (hasLennysComment(ticket.comments)) {
		console.log(`[${AGENT_NAME}] ${ticketId} already processed — skipping`);
		return;
	}

	const raw = await askClaude({
		agentName: AGENT_NAME,
		systemPrompt: SYSTEM_PROMPT,
		userMessage: ANALYSIS_PROMPT(ticket),
		maxTokens: 4096,
	});

	let analysis;
	try {
		analysis = JSON.parse(raw);
		analysis.needsSubIssues = false; // Temporarily disabled
	} catch (e) {
		console.error(`[${AGENT_NAME}] Failed to parse Claude response for ${ticketId}:`, raw);
		return;
	}

	const comment = buildCommentMarkdown(analysis, ticket);
	await addComment(AGENT_NAME, ticketId, comment);

	if (analysis.needsSubIssues && analysis.subIssues.length > 0) {
		const teams = await getTeams(AGENT_NAME);
		const prefix = ticketId.split('-')[0];
		const team = teams.find((t) => t.key === prefix) || teams[0];

		for (const sub of analysis.subIssues) {
			await createChildIssue(AGENT_NAME, {
				title: sub.title,
				description: sub.description,
				parentId: ticket.id,
				teamId: team.id,
			});
		}

		console.log(`[${AGENT_NAME}] Created ${analysis.subIssues.length} sub-issues for ${ticketId}`);
	}

	const memory = getMemory(AGENT_NAME);
	const processed = memory.processedTickets || [];
	processed.push(ticketId);
	setMemory(AGENT_NAME, { processedTickets: processed });

	console.log(`[${AGENT_NAME}] ✅ Done with ${ticketId}`);
	return analysis;
}

async function processAllActive() {
	console.log(`[${AGENT_NAME}] Scanning all active tickets...`);
	const issues = await getMyIssues(AGENT_NAME);
	const memory = getMemory(AGENT_NAME);
	const processed = memory.processedTickets || [];

	const unprocessed = issues.filter((i) => !processed.includes(i.id));
	console.log(`[${AGENT_NAME}] Found ${unprocessed.length} unprocessed tickets`);

	await sendDM(AGENT_NAME, `🎟️ *Lenny here!* Found *${unprocessed.length}* unprocessed tickets. Starting breakdown now...`);

	for (const issue of unprocessed) {
		await processTicket(issue.id);
		// Small delay to avoid rate limiting
		await new Promise((r) => setTimeout(r, 1500));
	}

	await sendDM(AGENT_NAME, `✅ *Lenny done!* Processed *${unprocessed.length}* tickets. Check your Linear for comments and sub-issues!`);
}

async function pollForNewTickets() {
	console.log(`[${AGENT_NAME}] Polling for newly assigned tickets...`);
	const { getMyRecentlyAssigned } = await import('../core/linear.js');
	const recent = await getMyRecentlyAssigned(AGENT_NAME, 30);
	const memory = getMemory(AGENT_NAME);
	const processed = memory.processedTickets || [];

	const newTickets = recent.filter((i) => !processed.includes(i.id));

	if (newTickets.length === 0) {
		console.log(`[${AGENT_NAME}] No new tickets found`);
		return;
	}

	await sendDM(AGENT_NAME, `🆕 *Lenny here!* Found *${newTickets.length}* newly assigned ticket(s). Breaking them down now...`);

	for (const issue of newTickets) {
		await processTicket(issue.id);
		await new Promise((r) => setTimeout(r, 1500));
	}
}

export default function lenny() {
	// Poll for newly assigned tickets every 30 minutes
	registerAgent({
		name: AGENT_NAME,
		schedule: '*/30 * * * *',
		handler: pollForNewTickets,
	});

	// Process all active unprocessed tickets on startup
	console.log(`[${AGENT_NAME}] Running initial scan on startup...`);
	processAllActive();
}

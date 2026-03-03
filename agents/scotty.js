import { registerAgent } from '../core/scheduler.js';
import { askClaude } from '../core/claude.js';
import { sendDM } from '../core/slack.js';
import { getMyIssues } from '../core/linear.js';
import { getMemory, setMemory } from '../core/memory.js';

const AGENT_NAME = 'Scotty';

const SYSTEM_PROMPT = `You are Scotty, a friendly and efficient weekly planning assistant for a Front End Engineer at a fantasy sports website called FantasyPros.
You help build structured weekly ToDo lists every Monday based on Linear tickets and provide a focused daily task list each morning.
Keep your tone warm, concise, and motivating. Format your responses clearly using emojis to make them easy to read in Slack.
Always prioritize tasks by urgency and importance. You are aware the engineer works across two teams: ProdDev and CoreFP.`;

export async function buildWeeklyList() {
	console.log(`[${AGENT_NAME}] Building weekly ToDo list...`);

	const issues = await getMyIssues(AGENT_NAME);

	const issueText = issues.map((issue) =>
		`- [${issue.id}] ${issue.title} | Priority: ${issue.priority} | State: ${issue.state}`
	).join('\n');

	const message = await askClaude({
		agentName: AGENT_NAME,
		systemPrompt: SYSTEM_PROMPT,
		userMessage: `Today is Monday. Please build a structured weekly ToDo list based on these active Linear tickets.
Group them by priority and suggest which days to tackle each task. Keep it motivating!

Active Linear Tickets:
${issueText}`,
		maxTokens: 1024,
	});

	// Save the weekly list to memory
	setMemory(AGENT_NAME, {
		weeklyList: message,
		weekStart: new Date().toISOString(),
		issues,
	});

	await sendDM(AGENT_NAME, `*🗓 Good morning! Here's your week ahead:*\n\n${message}`);
}

export async function sendDailyDigest() {
	console.log(`[${AGENT_NAME}] Sending daily digest...`);

	const memory = getMemory(AGENT_NAME);

	if (!memory.weeklyList) {
		await sendDM(AGENT_NAME, `⚠️ Scotty here — I don't have a weekly list saved yet. I'll generate one now!`);
		await buildWeeklyList();
		return;
	}

	const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

	const message = await askClaude({
		agentName: AGENT_NAME,
		systemPrompt: SYSTEM_PROMPT,
		userMessage: `Today is ${today}. Based on this weekly plan, what are the most important tasks to focus on today?
Keep it to 3-5 tasks max. Be concise and motivating!

Weekly Plan:
${memory.weeklyList}`,
		maxTokens: 512,
	});

	await sendDM(AGENT_NAME, `*☀️ Good morning! Here's your focus for ${today}:*\n\n${message}`);
}

export default function scotty() {
	// Every Monday at 8:00 AM
	registerAgent({
		name: AGENT_NAME,
		schedule: '0 8 * * 1',
		handler: buildWeeklyList,
	});

	// Tuesday-Friday at 8:00 AM
	registerAgent({
		name: AGENT_NAME,
		schedule: '0 8 * * 2-5',
		handler: sendDailyDigest,
	});
}


import { registerAgent } from '../core/agent-registry.js';
import { askClaude } from '../core/claude.js';
import { sendDM } from '../core/slack.js';
import { getMyIssues } from '../core/linear.js';
import { saveWeeklyPlan, getLatestWeeklyPlan, saveDailyDigest, getSetting } from '../src/main/db.js';

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

	saveWeeklyPlan(new Date().toISOString(), message, JSON.stringify(issues));

	if (getSetting('slack_enabled') === 'true') {
		await sendDM(AGENT_NAME, `*🗓 Good morning! Here's your week ahead:*\n\n${message}`);
	}

	return message;
}

export async function sendDailyDigest() {
	console.log(`[${AGENT_NAME}] Sending daily digest...`);

	const plan = getLatestWeeklyPlan();

	if (!plan) {
		if (getSetting('slack_enabled') === 'true') {
			await sendDM(AGENT_NAME, `⚠️ Scotty here — I don't have a weekly list saved yet. I'll generate one now!`);
		}
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
${plan.plan_text}`,
		maxTokens: 512,
	});

	saveDailyDigest(new Date().toISOString(), message);

	if (getSetting('slack_enabled') === 'true') {
		await sendDM(AGENT_NAME, `*☀️ Good morning! Here's your focus for ${today}:*\n\n${message}`);
	}

	return message;
}

// Register with the agent registry for dynamic UI rendering
registerAgent({
	name: AGENT_NAME,
	description: 'Weekly Planner — builds weekly ToDo lists and daily digests from Linear tickets',
	actions: [
		{ key: 'weekly', label: 'Build Weekly Plan', handler: buildWeeklyList },
		{ key: 'daily', label: 'Send Daily Digest', handler: sendDailyDigest },
	],
	schedules: [
		{ key: 'weekly', label: 'Monday 8am', cron: '0 8 * * 1' },
		{ key: 'daily', label: 'Tue–Fri 8am', cron: '0 8 * * 2-5' },
	],
});

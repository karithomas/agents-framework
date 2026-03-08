import cron from 'node-cron';
import { getRegisteredAgents, getAgent } from '../../core/agent-registry.js';
import { isAgentEnabled, logRunStart, logRunEnd, getSetting, setSetting } from './db.js';

const jobs = new Map();
const running = new Set();

// --- Cron ↔ Config conversion helpers ---

/**
 * Convert a UI-friendly config object to a cron expression.
 * Calendar: { days: [1,2,3], hour: 8, minute: 0 } → "0 8 * * 1,2,3"
 * Interval: { intervalMinutes: 30 } → "* /30 * * * *" (no space)
 */
export function configToCron(config) {
	if (config.intervalMinutes) {
		return `*/${config.intervalMinutes} * * * *`;
	}
	return `${config.minute} ${config.hour} * * ${config.days.join(',')}`;
}

/**
 * Parse a simple cron expression into a UI-friendly config object.
 * Only handles the patterns this app generates.
 */
export function cronToConfig(cronExpr) {
	const parts = cronExpr.split(' ');

	// Interval pattern: "*/N * * * *"
	if (parts[0].startsWith('*/')) {
		return { intervalMinutes: parseInt(parts[0].slice(2), 10) };
	}

	// Calendar pattern: "M H * * D" where D can be "1", "1,2,3", or "2-5"
	const minute = parseInt(parts[0], 10);
	const hour = parseInt(parts[1], 10);
	const dayPart = parts[4];

	let days;
	if (dayPart.includes('-')) {
		const [start, end] = dayPart.split('-').map(Number);
		days = [];
		for (let d = start; d <= end; d++) days.push(d);
	} else {
		days = dayPart.split(',').map(Number);
	}

	return { days, hour, minute };
}

// --- Override lookup ---

function settingsKey(agentName, scheduleKey) {
	return `schedule:${agentName.toLowerCase()}:${scheduleKey}`;
}

function getEffectiveCron(agentName, scheduleKey, defaultCron) {
	const key = settingsKey(agentName, scheduleKey);
	const saved = getSetting(key);
	if (saved) {
		try {
			return configToCron(JSON.parse(saved));
		} catch {
			// Invalid saved config — fall back to default
		}
	}
	return defaultCron;
}

// --- Scheduled action runner ---

async function runScheduledAction(agentName, actionKey) {
	const runKey = `${agentName}:${actionKey}`;

	if (!isAgentEnabled(agentName)) {
		console.log(`[Scheduler] Skipping ${runKey} (disabled)`);
		return;
	}

	if (running.has(runKey)) {
		console.log(`[Scheduler] Skipping ${runKey} (already running)`);
		return;
	}

	const agent = getAgent(agentName);
	const action = agent?.actions.find((a) => a.key === actionKey);
	if (!action) return;

	running.add(runKey);
	const runId = logRunStart(agentName, actionKey);
	console.log(`[Scheduler] Running ${runKey}`);

	try {
		const output = await action.handler();
		const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
		logRunEnd(runId, 'success', outputStr);
		console.log(`[Scheduler] Completed ${runKey}`);
	} catch (error) {
		logRunEnd(runId, 'error', null, error.message);
		console.error(`[Scheduler] Error in ${runKey}:`, error.message);
	} finally {
		running.delete(runKey);
	}
}

// --- Scheduler lifecycle ---

export function startScheduler() {
	const agents = getRegisteredAgents();

	for (const agent of agents) {
		if (!agent.schedules) continue;

		for (const schedule of agent.schedules) {
			const key = `${agent.name}:${schedule.key}`;
			const cronExpr = getEffectiveCron(agent.name, schedule.key, schedule.cron);
			const task = cron.schedule(cronExpr, () => {
				runScheduledAction(agent.name, schedule.key);
			});
			jobs.set(key, task);
			console.log(`[Scheduler] Scheduled ${key} (${cronExpr})`);
		}
	}
}

export function stopScheduler() {
	for (const [key, task] of jobs) {
		task.stop();
		console.log(`[Scheduler] Stopped ${key}`);
	}
	jobs.clear();
}

/**
 * Hot-restart a single schedule. Creates the new job first,
 * then stops the old one only after success.
 */
export function restartSchedule(agentName, scheduleKey) {
	const key = `${agentName}:${scheduleKey}`;

	// Find the default cron from the agent's registration
	const agent = getAgent(agentName);
	const schedule = agent?.schedules?.find((s) => s.key === scheduleKey);
	if (!schedule) throw new Error(`Unknown schedule: ${key}`);

	const cronExpr = getEffectiveCron(agentName, scheduleKey, schedule.cron);

	// Create new job first — if this throws, old job is untouched
	const newTask = cron.schedule(cronExpr, () => {
		runScheduledAction(agentName, scheduleKey);
	});

	// Success — now stop the old job and replace
	const oldTask = jobs.get(key);
	if (oldTask) oldTask.stop();
	jobs.set(key, newTask);

	console.log(`[Scheduler] Restarted ${key} (${cronExpr})`);
}

// --- Status & config queries ---

export function getSchedulerStatus() {
	const agents = getRegisteredAgents();
	const result = [];

	for (const agent of agents) {
		if (!agent.schedules) continue;

		const enabled = isAgentEnabled(agent.name);

		for (const schedule of agent.schedules) {
			const key = settingsKey(agent.name, schedule.key);
			const saved = getSetting(key);
			const customConfig = saved ? JSON.parse(saved) : null;

			result.push({
				agentName: agent.name,
				scheduleKey: schedule.key,
				scheduleLabel: schedule.label,
				defaultCron: schedule.cron,
				activeCron: getEffectiveCron(agent.name, schedule.key, schedule.cron),
				enabled,
			});
		}
	}

	return result;
}

export function getScheduleConfigs() {
	const agents = getRegisteredAgents();
	const result = [];

	for (const agent of agents) {
		if (!agent.schedules) continue;

		for (const schedule of agent.schedules) {
			const key = settingsKey(agent.name, schedule.key);
			const saved = getSetting(key);
			const defaultConfig = cronToConfig(schedule.cron);
			const config = saved ? JSON.parse(saved) : defaultConfig;

			result.push({
				agentName: agent.name,
				scheduleKey: schedule.key,
				displayName: `${agent.name} — ${schedule.label}`,
				config,
				defaultConfig,
				isCustom: !!saved,
			});
		}
	}

	return result;
}

export function setScheduleConfig(agentName, scheduleKey, config) {
	const key = settingsKey(agentName, scheduleKey);
	setSetting(key, JSON.stringify(config));
	restartSchedule(agentName, scheduleKey);
}

export function resetScheduleConfig(agentName, scheduleKey) {
	const key = settingsKey(agentName, scheduleKey);
	// Delete the override by setting to empty string
	setSetting(key, '');
	restartSchedule(agentName, scheduleKey);
}

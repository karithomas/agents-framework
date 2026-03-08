import cron from 'node-cron';
import { getRegisteredAgents, getAgent } from '../../core/agent-registry.js';
import { isAgentEnabled, logRunStart, logRunEnd } from './db.js';

const jobs = new Map();
const running = new Set();

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

export function startScheduler() {
	const agents = getRegisteredAgents();

	for (const agent of agents) {
		if (!agent.schedules) continue;

		for (const schedule of agent.schedules) {
			const key = `${agent.name}:${schedule.key}`;
			const task = cron.schedule(schedule.cron, () => {
				runScheduledAction(agent.name, schedule.key);
			});
			jobs.set(key, task);
			console.log(`[Scheduler] Scheduled ${key} (${schedule.cron})`);
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

export function getSchedulerStatus() {
	const agents = getRegisteredAgents();
	const result = [];

	for (const agent of agents) {
		if (!agent.schedules) continue;

		const enabled = isAgentEnabled(agent.name);

		for (const schedule of agent.schedules) {
			result.push({
				agentName: agent.name,
				scheduleKey: schedule.key,
				scheduleLabel: schedule.label,
				cron: schedule.cron,
				enabled,
			});
		}
	}

	return result;
}

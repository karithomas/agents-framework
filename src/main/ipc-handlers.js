import { ipcMain } from 'electron';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import {
	getRecentRuns,
	logRunStart,
	logRunEnd,
	getLatestWeeklyPlan,
	getWeeklyPlanHistory,
	getLatestDailyDigest,
	getTicketBreakdowns,
	setTicketCompleted,
	getSetting,
	setSetting,
	isOnboarded,
	isAgentEnabled,
	setAgentEnabled,
	getAgentSettings,
} from './db.js';
import { getAgent, getAgentsSummary } from '../../core/agent-registry.js';
import { getViewer } from '../../core/linear.js';

export function registerIpcHandlers() {
	// --- Agent Registry ---
	ipcMain.handle('get-agents', () => {
		return getAgentsSummary();
	});

	// --- Agent Runs ---
	ipcMain.handle('get-recent-runs', (_event, limit) => {
		return getRecentRuns(limit);
	});

	ipcMain.handle('run-agent', async (_event, agentName, actionKey) => {
		const agent = getAgent(agentName);
		if (!agent) throw new Error(`Unknown agent: ${agentName}`);

		const action = agent.actions.find((a) => a.key === actionKey);
		if (!action) throw new Error(`Unknown action: ${actionKey} for agent ${agentName}`);

		if (!isAgentEnabled(agentName)) {
			throw new Error(`${agentName} is disabled`);
		}

		const runId = logRunStart(agentName, actionKey);

		try {
			const output = await action.handler();
			const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
			logRunEnd(runId, 'success', outputStr);
			return { status: 'success', output: outputStr };
		} catch (error) {
			logRunEnd(runId, 'error', null, error.message);
			return { status: 'error', error: error.message };
		}
	});

	// --- Scotty ---
	ipcMain.handle('get-latest-weekly-plan', () => {
		return getLatestWeeklyPlan();
	});

	ipcMain.handle('get-weekly-plan-history', (_event, limit) => {
		return getWeeklyPlanHistory(limit);
	});

	ipcMain.handle('get-latest-daily-digest', () => {
		return getLatestDailyDigest();
	});

	// --- Lenny ---
	ipcMain.handle('get-ticket-breakdowns', (_event, limit) => {
		return getTicketBreakdowns(limit);
	});

	ipcMain.handle('set-ticket-completed', (_event, ticketId, completed) => {
		setTicketCompleted(ticketId, completed);
		return true;
	});

	ipcMain.handle('process-ticket', async (_event, ticketId) => {
		const agent = getAgent('Lenny');
		if (!agent) throw new Error('Lenny agent not registered');

		const runId = logRunStart('Lenny', 'ticket_process');

		try {
			const { processTicket } = await import('../../agents/lenny.js');
			const output = await processTicket(ticketId);
			logRunEnd(runId, 'success', output ? JSON.stringify(output) : null);
			return { status: 'success', output };
		} catch (error) {
			logRunEnd(runId, 'error', null, error.message);
			return { status: 'error', error: error.message };
		}
	});

	// --- Linear ---
	ipcMain.handle('linear-get-viewer', async (_event, apiKey) => {
		const { LinearClient } = await import('@linear/sdk');
		const tempClient = new LinearClient({ apiKey });
		const me = await tempClient.viewer;
		return { id: me.id, name: me.name, email: me.email };
	});

	// --- Settings ---
	ipcMain.handle('get-setting', (_event, key) => {
		return getSetting(key);
	});

	ipcMain.handle('set-setting', (_event, key, value) => {
		setSetting(key, value);
		return true;
	});

	ipcMain.handle('is-onboarded', () => {
		return isOnboarded();
	});

	// --- Agent Settings ---
	ipcMain.handle('is-agent-enabled', (_event, agentName) => {
		return isAgentEnabled(agentName);
	});

	ipcMain.handle('set-agent-enabled', (_event, agentName, enabled) => {
		setAgentEnabled(agentName, enabled);
		return true;
	});

	ipcMain.handle('get-agent-settings', () => {
		return getAgentSettings();
	});

	// --- launchd ---
	ipcMain.handle('get-schedule-status', () => {
		const labels = [
			'com.agentsframework.scotty.weekly',
			'com.agentsframework.scotty.daily',
			'com.agentsframework.lenny.poll',
		];

		let loadedList = '';
		try {
			loadedList = execSync('launchctl list 2>/dev/null', { encoding: 'utf-8' });
		} catch {
			// Ignore
		}

		return labels.map((label) => {
			const plistPath = path.join(process.env.HOME, 'Library/LaunchAgents', `${label}.plist`);
			const installed = existsSync(plistPath);
			const loaded = loadedList.includes(label);
			return { label, installed, loaded };
		});
	});

	ipcMain.handle('install-schedules', () => {
		try {
			const scriptPath = path.join(process.cwd(), 'scripts/launchd.js');
			execSync(`node "${scriptPath}" install`, { encoding: 'utf-8' });
			return { status: 'success' };
		} catch (error) {
			return { status: 'error', error: error.message };
		}
	});

	ipcMain.handle('uninstall-schedules', () => {
		try {
			const scriptPath = path.join(process.cwd(), 'scripts/launchd.js');
			execSync(`node "${scriptPath}" uninstall`, { encoding: 'utf-8' });
			return { status: 'success' };
		} catch (error) {
			return { status: 'error', error: error.message };
		}
	});

	console.log('[IPC] All handlers registered');
}

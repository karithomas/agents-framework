/**
 * API adapter layer.
 * Uses window.agentsAPI (Electron IPC) when available,
 * falls back to fetch() for browser mode (Express server).
 */
const isElectron = typeof window !== 'undefined' && !!window.agentsAPI;

async function fetchJson(url, options = {}) {
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json' },
		...options,
	});
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	return res.json();
}

// --- Agent Registry ---

export async function getAgents() {
	if (isElectron) return window.agentsAPI.getAgents();
	return fetchJson('/api/agents');
}

// --- Agent Runs ---

export async function getRecentRuns(limit = 20) {
	if (isElectron) return window.agentsAPI.getRecentRuns(limit);
	return fetchJson(`/api/runs?limit=${limit}`);
}

export async function runAgent(agentName, actionKey) {
	if (isElectron) return window.agentsAPI.runAgent(agentName, actionKey);
	return fetchJson('/api/run', {
		method: 'POST',
		body: JSON.stringify({ agentName, actionKey }),
	});
}

// --- Scotty ---

export async function getLatestWeeklyPlan() {
	if (isElectron) return window.agentsAPI.getLatestWeeklyPlan();
	return fetchJson('/api/scotty/plan');
}

export async function getWeeklyPlanHistory(limit = 10) {
	if (isElectron) return window.agentsAPI.getWeeklyPlanHistory(limit);
	return fetchJson(`/api/scotty/history?limit=${limit}`);
}

export async function getLatestDailyDigest() {
	if (isElectron) return window.agentsAPI.getLatestDailyDigest();
	return fetchJson('/api/scotty/digest');
}

// --- Linear ---

export async function linearGetViewer(apiKey) {
	if (isElectron) return window.agentsAPI.linearGetViewer(apiKey);
	return fetchJson('/api/linear/viewer', {
		method: 'POST',
		body: JSON.stringify({ apiKey }),
	});
}

// --- Lenny ---

export async function getTicketBreakdowns(limit = 20) {
	if (isElectron) return window.agentsAPI.getTicketBreakdowns(limit);
	return fetchJson(`/api/lenny/breakdowns?limit=${limit}`);
}

export async function processTicket(ticketId) {
	if (isElectron) return window.agentsAPI.processTicket(ticketId);
	return fetchJson('/api/lenny/process', {
		method: 'POST',
		body: JSON.stringify({ ticketId }),
	});
}

export async function setTicketCompleted(ticketId, completed) {
	if (isElectron) return window.agentsAPI.setTicketCompleted(ticketId, completed);
	return fetchJson(`/api/lenny/breakdowns/${ticketId}/completed`, {
		method: 'PUT',
		body: JSON.stringify({ completed }),
	});
}

// --- Settings ---

export async function getSetting(key) {
	if (isElectron) return window.agentsAPI.getSetting(key);
	return fetchJson(`/api/settings/${key}`).then((r) => r.value);
}

export async function setSetting(key, value) {
	if (isElectron) return window.agentsAPI.setSetting(key, value);
	return fetchJson(`/api/settings/${key}`, {
		method: 'PUT',
		body: JSON.stringify({ value }),
	});
}

export async function isOnboarded() {
	if (isElectron) return window.agentsAPI.isOnboarded();
	return fetchJson('/api/settings/onboarding_complete').then((r) => r.value === 'true');
}

// --- Agent Settings ---

export async function isAgentEnabled(agentName) {
	if (isElectron) return window.agentsAPI.isAgentEnabled(agentName);
	return fetchJson(`/api/agent-settings/${agentName}/enabled`).then((r) => r.enabled);
}

export async function setAgentEnabled(agentName, enabled) {
	if (isElectron) return window.agentsAPI.setAgentEnabled(agentName, enabled);
	return fetchJson(`/api/agent-settings/${agentName}/enabled`, {
		method: 'PUT',
		body: JSON.stringify({ enabled }),
	});
}

export async function getAgentSettings() {
	if (isElectron) return window.agentsAPI.getAgentSettings();
	return fetchJson('/api/agent-settings');
}

// --- launchd ---

export async function getScheduleStatus() {
	if (isElectron) return window.agentsAPI.getScheduleStatus();
	return fetchJson('/api/schedule/status');
}

export async function installSchedules() {
	if (isElectron) return window.agentsAPI.installSchedules();
	return fetchJson('/api/schedule/install', { method: 'POST' });
}

export async function uninstallSchedules() {
	if (isElectron) return window.agentsAPI.uninstallSchedules();
	return fetchJson('/api/schedule/uninstall', { method: 'POST' });
}

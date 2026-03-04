import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('agentsAPI', {
	// Agent registry
	getAgents: () => ipcRenderer.invoke('get-agents'),

	// Agent runs
	getRecentRuns: (limit) => ipcRenderer.invoke('get-recent-runs', limit),
	runAgent: (agentName, actionKey) => ipcRenderer.invoke('run-agent', agentName, actionKey),

	// Scotty
	getLatestWeeklyPlan: () => ipcRenderer.invoke('get-latest-weekly-plan'),
	getWeeklyPlanHistory: (limit) => ipcRenderer.invoke('get-weekly-plan-history', limit),
	getLatestDailyDigest: () => ipcRenderer.invoke('get-latest-daily-digest'),

	// Linear
	linearGetViewer: (apiKey) => ipcRenderer.invoke('linear-get-viewer', apiKey),

	// Lenny
	getTicketBreakdowns: (limit) => ipcRenderer.invoke('get-ticket-breakdowns', limit),
	processTicket: (ticketId) => ipcRenderer.invoke('process-ticket', ticketId),

	// Settings
	getSetting: (key) => ipcRenderer.invoke('get-setting', key),
	setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
	isOnboarded: () => ipcRenderer.invoke('is-onboarded'),

	// Agent settings (enable/disable)
	isAgentEnabled: (agentName) => ipcRenderer.invoke('is-agent-enabled', agentName),
	setAgentEnabled: (agentName, enabled) => ipcRenderer.invoke('set-agent-enabled', agentName, enabled),
	getAgentSettings: () => ipcRenderer.invoke('get-agent-settings'),

	// launchd
	getScheduleStatus: () => ipcRenderer.invoke('get-schedule-status'),
	installSchedules: () => ipcRenderer.invoke('install-schedules'),
	uninstallSchedules: () => ipcRenderer.invoke('uninstall-schedules'),
});

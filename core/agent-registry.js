const agents = [];

/**
 * Register an agent with the framework.
 * The dashboard reads this registry to dynamically render
 * on-demand buttons, settings toggles, and schedule info.
 *
 * @param {Object} config
 * @param {string} config.name - Agent display name (e.g. 'Scotty')
 * @param {string} config.description - Short description (e.g. 'Weekly Planner')
 * @param {Array} config.actions - On-demand actions the UI can trigger
 * @param {string} config.actions[].key - Unique key (e.g. 'weekly')
 * @param {string} config.actions[].label - Button label (e.g. 'Build Weekly Plan')
 * @param {Function} config.actions[].handler - Async function to execute
 * @param {Array} [config.schedules] - launchd schedules for settings display
 * @param {string} config.schedules[].key - Unique key (e.g. 'weekly')
 * @param {string} config.schedules[].label - Display label (e.g. 'Monday 8am')
 * @param {string} config.schedules[].cron - Cron expression (e.g. '0 8 * * 1')
 */
export function registerAgent(config) {
	if (!config.name || !config.actions) {
		throw new Error('Agent registration requires name and actions');
	}

	const existing = agents.findIndex((a) => a.name === config.name);
	if (existing !== -1) {
		agents[existing] = config;
	} else {
		agents.push(config);
	}

	console.log(`[Registry] Registered agent: ${config.name}`);
}

export function getRegisteredAgents() {
	return agents;
}

export function getAgent(name) {
	return agents.find((a) => a.name === name) || null;
}

/**
 * Returns a serializable summary of all agents (no handler functions).
 * Used by IPC and REST API to send agent info to the renderer.
 */
export function getAgentsSummary() {
	return agents.map((a) => ({
		name: a.name,
		description: a.description,
		actions: a.actions.map(({ key, label }) => ({ key, label })),
		schedules: a.schedules || [],
	}));
}

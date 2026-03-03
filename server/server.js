/**
 * Express server for browser mode.
 * Serves the Vue dashboard and provides REST API endpoints
 * that mirror the Electron IPC channels.
 *
 * Usage: npm run serve
 */
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import {
	initDatabase,
	getRecentRuns,
	logRunStart,
	logRunEnd,
	getLatestWeeklyPlan,
	getWeeklyPlanHistory,
	getTicketBreakdowns,
	getSetting,
	setSetting,
	isOnboarded,
	isAgentEnabled,
	setAgentEnabled,
	getAgentSettings,
	CREDENTIAL_KEYS,
} from '../src/main/db.js';
import { getAgent, getAgentsSummary } from '../core/agent-registry.js';

// Import agents to trigger registry
import '../agents/scotty.js';
import '../agents/lenny.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3456;

initDatabase();

const app = express();
app.use(express.json());

// --- Agent Registry ---

app.get('/api/agents', (_req, res) => {
	res.json(getAgentsSummary());
});

// --- Agent Runs ---

app.get('/api/runs', (req, res) => {
	const limit = parseInt(req.query.limit) || 20;
	res.json(getRecentRuns(limit));
});

app.post('/api/run', async (req, res) => {
	const { agentName, actionKey } = req.body;

	const agent = getAgent(agentName);
	if (!agent) return res.status(404).json({ error: `Unknown agent: ${agentName}` });

	const action = agent.actions.find((a) => a.key === actionKey);
	if (!action) return res.status(404).json({ error: `Unknown action: ${actionKey}` });

	if (!isAgentEnabled(agentName)) {
		return res.status(403).json({ error: `${agentName} is disabled` });
	}

	const runId = logRunStart(agentName, actionKey);

	try {
		const output = await action.handler();
		const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
		logRunEnd(runId, 'success', outputStr);
		res.json({ status: 'success', output: outputStr });
	} catch (error) {
		logRunEnd(runId, 'error', null, error.message);
		res.json({ status: 'error', error: error.message });
	}
});

// --- Scotty ---

app.get('/api/scotty/plan', (_req, res) => {
	res.json(getLatestWeeklyPlan());
});

app.get('/api/scotty/history', (req, res) => {
	const limit = parseInt(req.query.limit) || 10;
	res.json(getWeeklyPlanHistory(limit));
});

// --- Lenny ---

app.get('/api/lenny/breakdowns', (req, res) => {
	const limit = parseInt(req.query.limit) || 20;
	res.json(getTicketBreakdowns(limit));
});

app.post('/api/lenny/process', async (req, res) => {
	const { ticketId } = req.body;
	if (!ticketId) return res.status(400).json({ error: 'ticketId required' });

	const { processTicket } = await import('../agents/lenny.js');
	const runId = logRunStart('Lenny', 'ticket_process');

	try {
		const output = await processTicket(ticketId);
		logRunEnd(runId, 'success', output ? JSON.stringify(output) : null);
		res.json({ status: 'success', output });
	} catch (error) {
		logRunEnd(runId, 'error', null, error.message);
		res.json({ status: 'error', error: error.message });
	}
});

// --- Settings ---

app.get('/api/settings/:key', (req, res) => {
	const value = getSetting(req.params.key);
	res.json({ value });
});

app.put('/api/settings/:key', (req, res) => {
	if (CREDENTIAL_KEYS.includes(req.params.key)) {
		return res.status(403).json({
			error: 'Credential updates require the Electron app. Use a .env file for server mode.',
		});
	}
	setSetting(req.params.key, req.body.value);
	res.json({ success: true });
});

// --- Agent Settings ---

app.get('/api/agent-settings', (_req, res) => {
	res.json(getAgentSettings());
});

app.get('/api/agent-settings/:name/enabled', (req, res) => {
	res.json({ enabled: isAgentEnabled(req.params.name) });
});

app.put('/api/agent-settings/:name/enabled', (req, res) => {
	setAgentEnabled(req.params.name, req.body.enabled);
	res.json({ success: true });
});

// --- launchd ---

app.get('/api/schedule/status', async (_req, res) => {
	const { execSync } = await import('child_process');
	const { existsSync } = await import('fs');

	const labels = [
		'com.agentsframework.scotty.weekly',
		'com.agentsframework.scotty.daily',
		'com.agentsframework.lenny.poll',
	];

	let loadedList = '';
	try {
		loadedList = execSync('launchctl list 2>/dev/null', { encoding: 'utf-8' });
	} catch { /* ignore */ }

	const result = labels.map((label) => {
		const plistPath = path.join(process.env.HOME, 'Library/LaunchAgents', `${label}.plist`);
		const installed = existsSync(plistPath);
		const loaded = loadedList.includes(label);
		return { label, installed, loaded };
	});

	res.json(result);
});

app.post('/api/schedule/install', async (_req, res) => {
	try {
		const { execSync } = await import('child_process');
		execSync(`node "${path.join(__dirname, '../scripts/launchd.js')}" install`, { encoding: 'utf-8' });
		res.json({ status: 'success' });
	} catch (error) {
		res.json({ status: 'error', error: error.message });
	}
});

app.post('/api/schedule/uninstall', async (_req, res) => {
	try {
		const { execSync } = await import('child_process');
		execSync(`node "${path.join(__dirname, '../scripts/launchd.js')}" uninstall`, { encoding: 'utf-8' });
		res.json({ status: 'success' });
	} catch (error) {
		res.json({ status: 'error', error: error.message });
	}
});

// --- Vue app (Vite dev middleware) ---

async function startServer() {
	const vite = await createViteServer({
		root: path.join(projectRoot, 'src/renderer'),
		plugins: [vue()],
		server: { middlewareMode: true },
		appType: 'spa',
		resolve: {
			alias: {
				'@': path.join(projectRoot, 'src/renderer'),
				'@sideline': path.join(projectRoot, 'src/components/universal-resources/sideline/src/sideline'),
			},
		},
	});
	app.use(vite.middlewares);

	app.listen(PORT, () => {
		console.log(`Agents Dashboard running at http://localhost:${PORT}`);
	});
}

startServer();

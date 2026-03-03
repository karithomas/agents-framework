import { spawn, execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

let claudePath = null;

/**
 * Resolve the claude binary path once.
 * Caches the result for subsequent calls.
 */
async function getClaudePath() {
	if (claudePath) return claudePath;

	try {
		const { stdout } = await execFileAsync('which', ['claude']);
		claudePath = stdout.trim();
	} catch {
		// Fallback to common install locations
		claudePath = `${process.env.HOME}/.local/bin/claude`;
	}

	return claudePath;
}

/**
 * Ask Claude via the Claude Code CLI (--print mode).
 * Pipes the user message via stdin to avoid argument length limits.
 *
 * @param {Object} options
 * @param {string} options.agentName - Agent name for logging
 * @param {string} options.systemPrompt - System prompt for Claude
 * @param {string} options.userMessage - User message / prompt
 * @returns {Promise<string>} Claude's text response
 */
export async function askClaude({ agentName, systemPrompt, userMessage }) {
	const binPath = await getClaudePath();

	const args = [
		'--print',
		'--system-prompt', systemPrompt,
	];

	// Strip CLAUDECODE env var to prevent nested session error
	const env = { ...process.env };
	delete env.CLAUDECODE;

	console.log(`[${agentName}] Invoking Claude CLI...`);

	return new Promise((resolve, reject) => {
		const child = spawn(binPath, args, {
			env,
			stdio: ['pipe', 'pipe', 'pipe'],
			timeout: 120000,
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (data) => { stdout += data; });
		child.stderr.on('data', (data) => { stderr += data; });

		child.on('close', (code) => {
			if (code !== 0) {
				const errMsg = stderr.trim() || `Claude CLI exited with code ${code}`;
				console.error(`[${agentName}] Claude CLI error:`, errMsg);
				reject(new Error(errMsg));
				return;
			}
			console.log(`[${agentName}] Claude CLI responded successfully`);
			resolve(stdout.trim());
		});

		child.on('error', (err) => {
			console.error(`[${agentName}] Claude CLI spawn error:`, err.message);
			reject(err);
		});

		// Pipe user message via stdin
		child.stdin.write(userMessage);
		child.stdin.end();
	});
}

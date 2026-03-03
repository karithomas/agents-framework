/**
 * launchd plist manager for Agents Framework.
 *
 * Usage:
 *   node scripts/launchd.js install      Generate plists and load them
 *   node scripts/launchd.js uninstall    Unload and remove plists
 *   node scripts/launchd.js status       Show loaded status
 */
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LAUNCH_AGENTS_DIR = path.join(process.env.HOME, 'Library/LaunchAgents');
const LOGS_DIR = path.join(PROJECT_ROOT, 'data/logs');

// Resolve the node binary path from .nvmrc
function getNodePath() {
	try {
		return execSync('which node', { encoding: 'utf-8' }).trim();
	} catch {
		return '/usr/local/bin/node';
	}
}

const NODE_PATH = getNodePath();
const CLAUDE_PATH = `${process.env.HOME}/.local/bin`;
const NODE_BIN_DIR = path.dirname(NODE_PATH);

// PATH that launchd jobs need (includes claude + node)
const LAUNCHD_PATH = `/usr/local/bin:/usr/bin:/bin:${CLAUDE_PATH}:${NODE_BIN_DIR}`;

/**
 * Plist definitions for each agent schedule.
 * Add new entries here when new agents are created.
 */
const PLISTS = [
	{
		label: 'com.agentsframework.scotty.weekly',
		script: 'scripts/run-scotty.js',
		args: ['weekly'],
		calendar: [{ Weekday: 1, Hour: 8, Minute: 0 }], // Monday 8am
		logName: 'scotty-weekly',
	},
	{
		label: 'com.agentsframework.scotty.daily',
		script: 'scripts/run-scotty.js',
		args: ['daily'],
		calendar: [
			{ Weekday: 2, Hour: 8, Minute: 0 }, // Tuesday
			{ Weekday: 3, Hour: 8, Minute: 0 }, // Wednesday
			{ Weekday: 4, Hour: 8, Minute: 0 }, // Thursday
			{ Weekday: 5, Hour: 8, Minute: 0 }, // Friday
		],
		logName: 'scotty-daily',
	},
	{
		label: 'com.agentsframework.lenny.poll',
		script: 'scripts/run-lenny.js',
		args: ['poll'],
		interval: 1800, // Every 30 minutes
		logName: 'lenny-poll',
	},
];

function buildPlist(config) {
	const programArgs = [
		`\t\t<string>${NODE_PATH}</string>`,
		`\t\t<string>${path.join(PROJECT_ROOT, config.script)}</string>`,
		...config.args.map((a) => `\t\t<string>${a}</string>`),
	].join('\n');

	let scheduleBlock = '';

	if (config.calendar) {
		const entries = config.calendar.map((entry) => {
			const keys = Object.entries(entry)
				.map(([k, v]) => `\t\t\t<key>${k}</key>\n\t\t\t<integer>${v}</integer>`)
				.join('\n');
			return `\t\t<dict>\n${keys}\n\t\t</dict>`;
		}).join('\n');

		scheduleBlock = `\t<key>StartCalendarInterval</key>\n\t<array>\n${entries}\n\t</array>`;
	} else if (config.interval) {
		scheduleBlock = `\t<key>StartInterval</key>\n\t<integer>${config.interval}</integer>`;
	}

	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>${config.label}</string>

	<key>ProgramArguments</key>
	<array>
${programArgs}
	</array>

${scheduleBlock}

	<key>StandardOutPath</key>
	<string>${path.join(LOGS_DIR, `${config.logName}.log`)}</string>

	<key>StandardErrorPath</key>
	<string>${path.join(LOGS_DIR, `${config.logName}.err`)}</string>

	<key>EnvironmentVariables</key>
	<dict>
		<key>PATH</key>
		<string>${LAUNCHD_PATH}</string>
	</dict>

	<key>WorkingDirectory</key>
	<string>${PROJECT_ROOT}</string>
</dict>
</plist>`;
}

function install() {
	// Ensure logs directory exists
	if (!existsSync(LOGS_DIR)) {
		mkdirSync(LOGS_DIR, { recursive: true });
	}

	for (const config of PLISTS) {
		const plistPath = path.join(LAUNCH_AGENTS_DIR, `${config.label}.plist`);
		const content = buildPlist(config);

		writeFileSync(plistPath, content);
		console.log(`[launchd] Wrote ${plistPath}`);

		try {
			execSync(`launchctl unload "${plistPath}" 2>/dev/null`, { encoding: 'utf-8' });
		} catch {
			// Ignore — might not be loaded yet
		}

		execSync(`launchctl load "${plistPath}"`, { encoding: 'utf-8' });
		console.log(`[launchd] Loaded ${config.label}`);
	}

	console.log('\n✅ All schedules installed and loaded!');
	console.log(`Logs: ${LOGS_DIR}/`);
}

function uninstall() {
	for (const config of PLISTS) {
		const plistPath = path.join(LAUNCH_AGENTS_DIR, `${config.label}.plist`);

		try {
			execSync(`launchctl unload "${plistPath}" 2>/dev/null`, { encoding: 'utf-8' });
			console.log(`[launchd] Unloaded ${config.label}`);
		} catch {
			console.log(`[launchd] ${config.label} was not loaded`);
		}

		if (existsSync(plistPath)) {
			unlinkSync(plistPath);
			console.log(`[launchd] Removed ${plistPath}`);
		}
	}

	console.log('\n✅ All schedules uninstalled!');
}

function status() {
	console.log('Agent Framework launchd schedules:\n');

	for (const config of PLISTS) {
		const plistPath = path.join(LAUNCH_AGENTS_DIR, `${config.label}.plist`);
		const installed = existsSync(plistPath);

		let loaded = false;
		try {
			const output = execSync(`launchctl list 2>/dev/null`, { encoding: 'utf-8' });
			loaded = output.includes(config.label);
		} catch {
			// Ignore
		}

		const statusIcon = loaded ? '🟢' : installed ? '🟡' : '⚪';
		const statusText = loaded ? 'loaded' : installed ? 'installed (not loaded)' : 'not installed';
		console.log(`  ${statusIcon} ${config.label} — ${statusText}`);
	}
}

// CLI dispatch
const command = process.argv[2];

if (command === 'install') {
	install();
} else if (command === 'uninstall') {
	uninstall();
} else if (command === 'status') {
	status();
} else {
	console.error('Usage: node scripts/launchd.js [install|uninstall|status]');
	process.exit(1);
}

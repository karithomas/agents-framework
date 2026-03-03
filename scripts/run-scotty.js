/**
 * CLI trigger for Scotty — Weekly Planner agent.
 *
 * Usage:
 *   node scripts/run-scotty.js              Build weekly plan (default)
 *   node scripts/run-scotty.js weekly       Same as above
 *   node scripts/run-scotty.js daily        Send daily digest from saved plan
 *
 * Used by launchd schedules and the "npm run scotty" / "npm run scotty:daily" scripts.
 */
import 'dotenv/config';
import { initDatabase, logRunStart, logRunEnd, isAgentEnabled } from '../src/main/db.js';
import { buildWeeklyList, sendDailyDigest } from '../agents/scotty.js';

initDatabase();

const mode = process.argv[2] || 'weekly';

if (!isAgentEnabled('Scotty')) {
	console.log('[Scotty] Agent is disabled in settings — skipping');
	process.exit(0);
}

const handler = mode === 'daily' ? sendDailyDigest : buildWeeklyList;
const label = mode === 'daily' ? '☀️ daily digest' : '🗓 weekly plan';

console.log(`[Scotty] Running ${label}...`);
const runId = logRunStart('Scotty', mode);

handler().then((output) => {
	logRunEnd(runId, 'success', typeof output === 'string' ? output : JSON.stringify(output));
	console.log('✅ Done!');
	process.exit(0);
}).catch((err) => {
	logRunEnd(runId, 'error', null, err.message);
	console.error('❌ Error:', err.message);
	process.exit(1);
});

/**
 * On-demand trigger for Scotty — Weekly Planner agent.
 *
 * Usage:
 *   node scotty.js              Builds a weekly ToDo list from Linear tickets (default)
 *   node scotty.js weekly       Same as above
 *   node scotty.js daily        Sends a daily digest based on the saved weekly plan
 *
 * The "weekly" mode fetches all active Linear tickets, sends them to Claude,
 * and posts a structured weekly plan to your Slack DM.
 *
 * The "daily" mode reads the saved weekly plan from data/memory.json and
 * posts a focused task list for today. If no weekly plan exists, it builds one first.
 */
import 'dotenv/config';
import { buildWeeklyList, sendDailyDigest } from './agents/scotty.js';

const mode = process.argv[2] || 'weekly';

if (mode === 'weekly') {
	console.log('🗓 Scotty building weekly ToDo list...');
	buildWeeklyList().then(() => {
		console.log('✅ Done!');
		process.exit(0);
	}).catch((err) => {
		console.error('❌ Error:', err.message);
		process.exit(1);
	});
} else if (mode === 'daily') {
	console.log('☀️ Scotty sending daily digest...');
	sendDailyDigest().then(() => {
		console.log('✅ Done!');
		process.exit(0);
	}).catch((err) => {
		console.error('❌ Error:', err.message);
		process.exit(1);
	});
} else {
	console.error('❌ Unknown mode. Usage: node scotty.js [weekly|daily]');
	process.exit(1);
}

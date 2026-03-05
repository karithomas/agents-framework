/**
 * CLI trigger for Lenny — Linear Ticket Drafter agent.
 *
 * Usage:
 *   node scripts/run-lenny.js               Process all active unprocessed tickets
 *   node scripts/run-lenny.js CFP-360       Process a specific ticket by ID
 *   node scripts/run-lenny.js poll          Poll for recently assigned tickets
 *
 * Used by launchd schedules and the "npm run lenny" script.
 */
import { initDatabase, logRunStart, logRunEnd, isAgentEnabled } from '../src/main/db.js';
import { processTicket, processAllActive, pollForNewTickets } from '../agents/lenny.js';

initDatabase();

const arg = process.argv[2] || 'all';

if (!isAgentEnabled('Lenny')) {
	console.log('[Lenny] Agent is disabled in settings — skipping');
	process.exit(0);
}

let handler;
let runType;

if (arg === 'poll') {
	handler = pollForNewTickets;
	runType = 'poll';
	console.log('[Lenny] Polling for new tickets...');
} else if (arg === 'all') {
	handler = processAllActive;
	runType = 'process_all';
	console.log('[Lenny] Processing all active tickets...');
} else {
	// Assume it's a ticket ID
	handler = () => processTicket(arg);
	runType = 'ticket_process';
	console.log(`[Lenny] Processing ticket: ${arg}`);
}

const runId = logRunStart('Lenny', runType);

handler().then((output) => {
	logRunEnd(runId, 'success', output ? JSON.stringify(output) : null);
	console.log('✅ Done!');
	process.exit(0);
}).catch((err) => {
	logRunEnd(runId, 'error', null, err.message);
	console.error('❌ Error:', err.message);
	process.exit(1);
});

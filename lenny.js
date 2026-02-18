import 'dotenv/config';
import { processTicket } from './agents/lenny.js';

const ticketId = process.argv[2];

if (!ticketId) {
	console.error('❌ Please provide a ticket ID. Usage: node lenny.js CFP-360');
	process.exit(1);
}

console.log(`🎟️ Lenny processing ticket: ${ticketId}`);
processTicket(ticketId).then(() => {
	console.log('✅ Done!');
	process.exit(0);
}).catch((err) => {
	console.error('❌ Error:', err.message);
	process.exit(1);
});

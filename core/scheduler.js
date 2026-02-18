import cron from 'node-cron';

const registeredAgents = [];

export function registerAgent({ name, schedule, handler }) {
	if (!cron.validate(schedule)) {
		console.error(`[${name}] Invalid cron schedule: ${schedule}`);
		return;
	}

	cron.schedule(schedule, async () => {
		console.log(`[${name}] Running at ${new Date().toLocaleString()}`);
		try {
	 await handler();
		} catch (error) {
	 console.error(`[${name}] Error during run:`, error.message);
		}
	});

	registeredAgents.push({ name, schedule });
	console.log(`[${name}] Registered with schedule: ${schedule}`);
}

export function listAgents() {
	console.log('\n--- Registered Agents ---');
	registeredAgents.forEach(({ name, schedule }) => {
		console.log(`  ${name}: ${schedule}`);
	});
	console.log('-------------------------\n');
}

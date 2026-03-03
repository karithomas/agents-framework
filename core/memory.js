/**
 * Transitional wrapper around SQLite.
 * Maintains the getMemory/setMemory API so agents can be migrated incrementally.
 * Once agents are fully migrated to direct db.js calls, this file can be removed.
 */
import {
	getLatestWeeklyPlan,
	saveWeeklyPlan,
	isTicketProcessed,
	getTicketBreakdowns,
} from '../src/main/db.js';

export function getMemory(agentName) {
	if (agentName === 'Scotty') {
		const plan = getLatestWeeklyPlan();
		if (!plan) return {};
		return {
			weeklyList: plan.plan_text,
			weekStart: plan.week_start,
			issues: plan.issues_json ? JSON.parse(plan.issues_json) : [],
		};
	}

	if (agentName === 'Lenny') {
		const breakdowns = getTicketBreakdowns(1000);
		return {
			processedTickets: breakdowns.map((b) => b.ticket_id),
		};
	}

	return {};
}

export function setMemory(agentName, data) {
	if (agentName === 'Scotty' && data.weeklyList) {
		saveWeeklyPlan(
			data.weekStart || new Date().toISOString(),
			data.weeklyList,
			data.issues ? JSON.stringify(data.issues) : null
		);
		console.log(`[${agentName}] Memory saved to SQLite`);
		return;
	}

	// Lenny's memory is handled directly via saveTicketBreakdown in the agent
	console.log(`[${agentName}] Memory saved to SQLite`);
}

export function clearMemory(agentName) {
	console.log(`[${agentName}] clearMemory is a no-op in SQLite mode`);
}

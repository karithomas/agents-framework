import { LinearClient } from '@linear/sdk';
import 'dotenv/config';

const client = new LinearClient({
	apiKey: process.env.LINEAR_API_KEY,
});

export async function getMyIssues(agentName) {
	try {
		const me = await client.viewer;
		const issues = await me.assignedIssues({
	 filter: {
		 state: {
		type: {
			nin: ['completed', 'cancelled'],
		},
		 },
	 },
		});

		const formatted = await Promise.all(issues.nodes.map(async (issue) => ({
			id: issue.identifier,
			title: issue.title,
			priority: issue.priorityLabel,
			state: (await issue.state)?.name || 'Unknown',
			dueDate: issue.dueDate || null,
			url: issue.url,
		})));

		console.log(`[${agentName}] Fetched ${formatted.length} Linear issues`);
		return formatted;
	} catch (error) {
		console.error(`[${agentName}] Linear error:`, error.message);
		throw error;
	}
}

export async function createIssue(agentName, { title, description, teamId, priority }) {
	try {
		const issue = await client.createIssue({
	 title,
	 description,
	 teamId,
	 priority,
		});

		console.log(`[${agentName}] Created Linear issue: ${title}`);
		return issue;
	} catch (error) {
		console.error(`[${agentName}] Linear create issue error:`, error.message);
		throw error;
	}
}

export async function getTeams(agentName) {
	try {
		const teams = await client.teams();
		const formatted = teams.nodes.map((team) => ({
	 id: team.id,
	 name: team.name,
	 key: team.key,
		}));

		console.log(`[${agentName}] Fetched ${formatted.length} teams`);
		return formatted;
	} catch (error) {
		console.error(`[${agentName}] Linear teams error:`, error.message);
		throw error;
	}
}

import { LinearClient } from '@linear/sdk';
import 'dotenv/config';
import { getSetting } from '../src/main/db.js';

let client;

function getClient() {
	if (!client) {
		const apiKey = getSetting('linear_api_key') || process.env.LINEAR_API_KEY;
		if (!apiKey) throw new Error('Linear API key not configured. Complete onboarding or set LINEAR_API_KEY in .env');
		client = new LinearClient({ apiKey });
	}
	return client;
}

export async function getViewer() {
	const me = await getClient().viewer;
	return { id: me.id, name: me.name, email: me.email };
}

export async function getMyIssues(agentName) {
	try {
		const me = await getClient().viewer;
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

export async function getIssueDetails(agentName, issueId) {
	try {
		const issue = await getClient().issue(issueId);
		const state = await issue.state;
		const comments = await issue.comments();
		const children = await issue.children();

		return {
			id: issue.identifier,
			title: issue.title,
			description: issue.description || '',
			priority: issue.priorityLabel,
			state: state?.name || 'Unknown',
			url: issue.url,
			comments: comments.nodes.map((c) => ({
				id: c.id,
				body: c.body,
			})),
			childCount: children.nodes.length,
		};
	} catch (error) {
		console.error(`[${agentName}] Linear get issue error:`, error.message);
		throw error;
	}
}

export async function addComment(agentName, issueId, body) {
	try {
		const issue = await getClient().issue(issueId);
		await getClient().createComment({
			issueId: issue.id,
			body,
		});
		console.log(`[${agentName}] Comment added to ${issueId}`);
	} catch (error) {
		console.error(`[${agentName}] Linear comment error:`, error.message);
		throw error;
	}
}

export async function createChildIssue(agentName, { title, description, parentId, teamId }) {
	try {
		const issue = await getClient().createIssue({
			title,
			description,
			parentId,
			teamId,
		});
		console.log(`[${agentName}] Created child issue: ${title}`);
		return issue;
	} catch (error) {
		console.error(`[${agentName}] Linear create child issue error:`, error.message);
		throw error;
	}
}

export async function createIssue(agentName, { title, description, teamId, priority }) {
	try {
		const issue = await getClient().createIssue({
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
		const teams = await getClient().teams();
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

export async function getMyRecentlyAssigned(agentName, sinceMinutes = 30) {
	try {
		const me = await getClient().viewer;
		const issues = await me.assignedIssues({
			filter: {
				updatedAt: { gte: new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString() },
				state: {
					type: { nin: ['completed', 'canceled'] },
				},
			},
		});

		const formatted = await Promise.all(issues.nodes.map(async (issue) => ({
			id: issue.identifier,
			linearId: issue.id,
			title: issue.title,
			description: issue.description || '',
			priority: issue.priorityLabel,
			state: (await issue.state)?.name || 'Unknown',
			url: issue.url,
		})));

		console.log(`[${agentName}] Found ${formatted.length} recently assigned issues`);
		return formatted;
	} catch (error) {
		console.error(`[${agentName}] Linear recent assigned error:`, error.message);
		throw error;
	}
}

export async function getTeamStates(agentName, teamId) {
	try {
		const team = await getClient().team(teamId);
		const states = await team.states();
		states.nodes.forEach((s) => {
			console.log(`[${agentName}] State: ${s.name} | ID: ${s.id}`);
		});
		return states.nodes;
	} catch (error) {
		console.error(`[${agentName}] Error fetching states:`, error.message);
		throw error;
	}
}

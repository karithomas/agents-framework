import { WebClient } from '@slack/web-api';
import 'dotenv/config';
import { getSetting } from '../src/main/db.js';

let client;
let userId;

function getClient() {
	if (!client) {
		const token = getSetting('slack_bot_token') || process.env.SLACK_BOT_TOKEN;
		if (!token) throw new Error('Slack Bot Token not configured. Complete onboarding or set SLACK_BOT_TOKEN in .env');
		client = new WebClient(token);
	}
	return client;
}

function getUserId() {
	if (!userId) {
		userId = getSetting('slack_user_id') || process.env.SLACK_YOUR_USER_ID;
	}
	return userId;
}

export async function sendDM(agentName, message) {
	try {
		const uid = getUserId();
		console.log(`[${agentName}] Attempting to send DM to user ID: ${uid}`);

		const result = await getClient().chat.postMessage({
			channel: uid,
			text: message,
		});

		console.log(`[${agentName}] Slack DM sent successfully, ts: ${result.ts}`);
	} catch (error) {
		console.error(`[${agentName}] Slack DM error:`, error.message);
		console.error(`[${agentName}] Slack error code:`, error.data);
		throw error;
	}
}

export async function sendToChannel(agentName, channelId, message) {
	try {
		await getClient().chat.postMessage({
			channel: channelId,
			text: message,
		});
		console.log(`[${agentName}] Slack channel message sent successfully`);
	} catch (error) {
		console.error(`[${agentName}] Slack channel error:`, error.message);
		throw error;
	}
}

export async function getChannelHistory(agentName, channelId, limit = 50) {
	try {
		const result = await getClient().conversations.history({
			channel: channelId,
			limit,
		});
		console.log(`[${agentName}] Fetched ${result.messages.length} messages from Slack`);
		return result.messages;
	} catch (error) {
		console.error(`[${agentName}] Slack history error:`, error.message);
		throw error;
	}
}
